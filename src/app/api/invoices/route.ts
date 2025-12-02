import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { authenticateRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { uploadFile, generateFileKey } from "@/lib/storage";

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

    if (user.role === "SUPPLIER") {
      // Suppliers see only their own uploaded invoices
      whereClause.uploaderId = user.id;
    }
    // BUSINESS and ADMIN see ALL invoices (no filter)

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

  if (user.role !== "SUPPLIER") {
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

    // Parse invoice date
    let invoiceDate: Date | null = null;
    if (invoiceDateStr) {
      invoiceDate = new Date(invoiceDateStr);
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
      if (recipient && recipient.role === "BUSINESS") {
        recipientId = recipient.id;
      }
    }

    // Create invoice record with user-edited data
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: invoiceNumber || null,
        invoiceDate: invoiceDate,
        recipientName: recipientName || null,
        totalAmount: totalAmount ? parseFloat(totalAmount) : 0,
        fileUrl: fileUrl,
        fileName: file.name,
        ocrData: {
          invoiceNumber,
          recipientName,
          invoiceDate: invoiceDateStr,
          totalAmount: totalAmount ? parseFloat(totalAmount) : 0,
        },
        uploaderId: user.id,
        recipientId,
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

