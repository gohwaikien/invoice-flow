const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupEmptyInvoices() {
  try {
    console.log('🔍 Finding invoices with no OCR data...');
    
    const emptyInvoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { totalAmount: 0 },
          { invoiceNumber: null },
        ]
      },
      select: {
        id: true,
        fileName: true,
        totalAmount: true,
        invoiceNumber: true,
      }
    });

    console.log(`📊 Found ${emptyInvoices.length} invoices with no OCR data`);
    console.log('');

    if (emptyInvoices.length === 0) {
      console.log('✅ No empty invoices to clean up!');
      return;
    }

    console.log('🗑️  Deleting empty invoices...');
    
    const result = await prisma.invoice.deleteMany({
      where: {
        OR: [
          { totalAmount: 0 },
          { invoiceNumber: null },
        ]
      }
    });

    console.log(`✅ Deleted ${result.count} invoices`);
    console.log('');
    console.log('✨ Database cleaned! Ready for re-upload with OCR.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupEmptyInvoices();

