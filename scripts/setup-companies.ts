import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🏢 Setting up companies...\n");

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
  console.log(`✅ Created/Updated Supplier Company: ${supplierCompany.name}`);

  // 2. Assign supplier users to the company
  const supplierEmails = [
    "gohwaikien@gmail.com",
    "tradingglobalgoods@gmail.com",
  ];

  for (const email of supplierEmails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.user.update({
        where: { email },
        data: {
          companyId: supplierCompany.id,
          role: "SUPPLIER", // Ensure they're marked as SUPPLIER
        },
      });
      console.log(`✅ Assigned ${email} to ${supplierCompany.name}`);
    } else {
      console.log(`⚠️  User ${email} not found`);
    }
  }

  // 3. Update all existing payments to belong to the supplier company
  const paymentsUpdated = await prisma.payment.updateMany({
    where: { companyId: null },
    data: { companyId: supplierCompany.id },
  });
  console.log(`✅ Updated ${paymentsUpdated.count} payments to belong to ${supplierCompany.name}`);

  // 4. Update all existing invoices to belong to the supplier company
  const invoicesUpdated = await prisma.invoice.updateMany({
    where: { companyId: null },
    data: { companyId: supplierCompany.id },
  });
  console.log(`✅ Updated ${invoicesUpdated.count} invoices to belong to ${supplierCompany.name}`);

  // 5. Create a Business company for testing (optional - for Omnimart)
  // Uncomment if needed
  /*
  const businessCompany = await prisma.company.upsert({
    where: { id: "omnimart-business-company" },
    update: { name: "Omnimart Sdn Bhd" },
    create: {
      id: "omnimart-business-company",
      name: "Omnimart Sdn Bhd",
      type: "BUSINESS",
    },
  });
  console.log(`✅ Created/Updated Business Company: ${businessCompany.name}`);

  // 6. Grant Omnimart access to GGTS
  await prisma.businessAccess.upsert({
    where: {
      businessCompanyId_supplierCompanyId: {
        businessCompanyId: businessCompany.id,
        supplierCompanyId: supplierCompany.id,
      },
    },
    update: {},
    create: {
      businessCompanyId: businessCompany.id,
      supplierCompanyId: supplierCompany.id,
    },
  });
  console.log(`✅ Granted ${businessCompany.name} access to ${supplierCompany.name}`);
  */

  console.log("\n🎉 Company setup complete!");
  
  // Summary
  const companies = await prisma.company.findMany({
    include: {
      _count: {
        select: { users: true, payments: true, invoices: true },
      },
    },
  });
  
  console.log("\n📊 Summary:");
  for (const company of companies) {
    console.log(`\n  ${company.name} (${company.type}):`);
    console.log(`    Users: ${company._count.users}`);
    console.log(`    Payments: ${company._count.payments}`);
    console.log(`    Invoices: ${company._count.invoices}`);
  }
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

