import { NextRequest, NextResponse } from "next/server";
import { auth, hasRole, hasAnyRole } from "@/lib/auth";
import { authenticateRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { uploadFile, generateFileKey } from "@/lib/storage";
import { extractInvoiceData } from "@/lib/ocr";

export async function GET(request: NextRequest) {
  // Try API key authentication first, then session
  const authResult = await authenticateRequest(request);
  
  let user;
  if (authResult) {
    user = authResult.user;
  } else {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    user = session.user;
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  try {
    let whereClause: Record<string, unknown> = {};

    // Get user's company info
    const userWithCompany = await prisma.user.findUnique({
      where: { id: user.id },
      select: { companyId: true, roles: true },
    });

    const userRoles = user.roles || userWithCompany?.roles || [];
    const isAdmin = userRoles.includes("ADMIN");
    const isSupplier = userRoles.includes("SUPPLIER");
    const isBusiness = userRoles.includes("BUSINESS");

    if (isAdmin) {
      // ADMIN sees ALL invoices (no filter)
    } else if (isSupplier && isBusiness) {
      // User has both roles - show invoices from their company + accessible suppliers
      const companyIds: string[] = [];
      if (userWithCompany?.companyId) {
        companyIds.push(userWithCompany.companyId);
        const accessRecords = await prisma.businessAccess.findMany({
          where: { businessCompanyId: userWithCompany.companyId },
          select: { supplierCompanyId: true },
        });
        companyIds.push(...accessRecords.map((a) => a.supplierCompanyId));
      }
      if (companyIds.length > 0) {
        whereClause.companyId = { in: companyIds };
      } else {
        whereClause.uploaderId = user.id;
      }
    } else if (isSupplier) {
      // Suppliers see invoices from their company
      if (userWithCompany?.companyId) {
        whereClause.companyId = userWithCompany.companyId;
      } else {
        // Fallback: see only their own uploaded invoices
        whereClause.uploaderId = user.id;
      }
    } else if (isBusiness) {
      // Business users see invoices from suppliers they have access to
      if (userWithCompany?.companyId) {
        const accessRecords = await prisma.businessAccess.findMany({
          where: { businessCompanyId: userWithCompany.companyId },
          select: { supplierCompanyId: true },
        });
        const accessibleCompanyIds = accessRecords.map((a) => a.supplierCompanyId);
        whereClause.companyId = { in: accessibleCompanyIds };
      } else {
        // No company - see nothing
        whereClause.companyId = "none";
      }
    }

    if (status) {
      whereClause.status = status;
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        uploader: {
          select: { name: true, email: true },
        },
        recipient: {
          select: { name: true, email: true },
        },
        company: {
          select: { id: true, name: true },
        },
        payments: {
          include: {
            paidBy: {
              select: { name: true, email: true },
            },
          },
          orderBy: { date: "desc" },
        },
        settlements: {
          include: {
            settledBy: {
              select: { name: true, email: true },
            },
          },
          orderBy: { date: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Try API key authentication first, then session
  const authResult = await authenticateRequest(request);
  
  let user;
  if (authResult) {
    user = authResult.user;
  } else {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    user = session.user;
  }

  const userRoles = user.roles || [];
  if (!userRoles.includes("SUPPLIER") && !userRoles.includes("ADMIN")) {
    return NextResponse.json(
      { error: "Only suppliers can upload invoices" },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    // Get user-edited fields (from OCR preview)
    const invoiceNumber = formData.get("invoiceNumber") as string | null;
    const recipientName = formData.get("recipientName") as string | null;
    const invoiceDateStr = formData.get("invoiceDate") as string | null;
    const totalAmount = formData.get("totalAmount") as string | null;
    const recipientEmail = formData.get("recipientEmail") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to GCS (original PDF/image is stored)
    const fileKey = generateFileKey("invoices", file.name);
    const fileUrl = await uploadFile(buffer, fileKey, file.type);

    // If no OCR data provided, extract it automatically
    let ocrExtractedNumber = invoiceNumber;
    let ocrExtractedName = recipientName;
    let ocrExtractedDate = invoiceDateStr;
    let ocrExtractedAmount = totalAmount;

    if (!invoiceNumber || !totalAmount) {
      try {
        const ocrResult = await extractInvoiceData(buffer, file.type, file.name);
        ocrExtractedNumber = ocrExtractedNumber || ocrResult.invoiceNumber;
        ocrExtractedName = ocrExtractedName || ocrResult.recipientName;
        ocrExtractedDate = ocrExtractedDate || (ocrResult.invoiceDate ? ocrResult.invoiceDate.toISOString() : null);
        ocrExtractedAmount = ocrExtractedAmount || (ocrResult.totalAmount ? ocrResult.totalAmount.toString() : null);
      } catch (error) {
        console.error("OCR extraction failed:", error);
        // Continue without OCR data
      }
    }

    // Parse invoice date
    let invoiceDate: Date | null = null;
    if (ocrExtractedDate) {
      invoiceDate = new Date(ocrExtractedDate);
      if (isNaN(invoiceDate.getTime())) {
        invoiceDate = null;
      }
    }

    // Find recipient if email provided
    let recipientId: string | null = null;
    if (recipientEmail) {
      const recipient = await prisma.user.findUnique({
        where: { email: recipientEmail },
      });
      if (recipient && recipient.roles?.includes("BUSINESS")) {
        recipientId = recipient.id;
      }
    }

    // Get user's company
    const userWithCompany = await prisma.user.findUnique({
      where: { id: user.id },
      select: { companyId: true },
    });

    // Create invoice record with OCR-extracted data
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: ocrExtractedNumber || null,
        invoiceDate: invoiceDate,
        recipientName: ocrExtractedName || null,
        totalAmount: ocrExtractedAmount ? parseFloat(ocrExtractedAmount) : 0,
        fileUrl: fileUrl,
        fileName: file.name,
        ocrData: {
          invoiceNumber: ocrExtractedNumber,
          recipientName: ocrExtractedName,
          invoiceDate: ocrExtractedDate,
          totalAmount: ocrExtractedAmount ? parseFloat(ocrExtractedAmount) : 0,
        },
        uploaderId: user.id,
        recipientId,
        companyId: userWithCompany?.companyId || null, // Set company from user
      },
      include: {
        uploader: {
          select: { name: true, email: true },
        },
        recipient: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}

