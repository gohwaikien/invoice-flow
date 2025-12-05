import { NextResponse } from "next/server";
import { auth, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST - Run the initial company setup
export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRole(session.user, "ADMIN")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const logs: string[] = [];

    // 1. Create "Global Goods Trading Solution" - SUPPLIER company
    const supplierCompany = await prisma.company.upsert({
      where: { id: "ggts-supplier-company" },
      update: { name: "Global Goods Trading Solution" },
      create: {
        id: "ggts-supplier-company",
        name: "Global Goods Trading Solution",
        type: "SUPPLIER",
      },
    });
    logs.push(`✅ Created/Updated Supplier Company: ${supplierCompany.name}`);

    // 2. Assign supplier users to the company
    const supplierEmails = [
      "gohwaikien@gmail.com",
      "tradingglobalgoods@gmail.com",
    ];

    for (const email of supplierEmails) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        // Add SUPPLIER role to existing roles
        const currentRoles = user.roles || [];
        const newRoles = currentRoles.includes("SUPPLIER") 
          ? currentRoles 
          : [...currentRoles, "SUPPLIER" as const];
        await prisma.user.update({
          where: { email },
          data: {
            companyId: supplierCompany.id,
            roles: newRoles,
          },
        });
        logs.push(`✅ Assigned ${email} to ${supplierCompany.name}`);
      } else {
        logs.push(`⚠️ User ${email} not found`);
      }
    }

    // 3. Update all existing payments to belong to the supplier company
    const paymentsUpdated = await prisma.payment.updateMany({
      where: { companyId: null },
      data: { companyId: supplierCompany.id },
    });
    logs.push(`✅ Updated ${paymentsUpdated.count} payments`);

    // 4. Update all existing invoices to belong to the supplier company
    const invoicesUpdated = await prisma.invoice.updateMany({
      where: { companyId: null },
      data: { companyId: supplierCompany.id },
    });
    logs.push(`✅ Updated ${invoicesUpdated.count} invoices`);

    // Get summary
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: { users: true, payments: true, invoices: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      logs,
      companies: companies.map((c) => ({
        name: c.name,
        type: c.type,
        users: c._count.users,
        payments: c._count.payments,
        invoices: c._count.invoices,
      })),
    });
  } catch (error) {
    console.error("Error running company setup:", error);
    return NextResponse.json(
      { error: "Failed to run company setup", details: String(error) },
      { status: 500 }
    );
  }
}

// GET - Check setup status
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRole(session.user, "ADMIN")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: { users: true, payments: true, invoices: true },
        },
      },
    });

    const unassignedPayments = await prisma.payment.count({
      where: { companyId: null },
    });

    const unassignedInvoices = await prisma.invoice.count({
      where: { companyId: null },
    });

    return NextResponse.json({
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        users: c._count.users,
        payments: c._count.payments,
        invoices: c._count.invoices,
      })),
      unassignedPayments,
      unassignedInvoices,
      needsSetup: companies.length === 0 || unassignedPayments > 0 || unassignedInvoices > 0,
    });
  } catch (error) {
    console.error("Error checking setup status:", error);
    return NextResponse.json(
      { error: "Failed to check setup status", details: String(error) },
      { status: 500 }
    );
  }
}

