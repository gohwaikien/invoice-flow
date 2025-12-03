const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllInvoices() {
  try {
    console.log('🗑️  Deleting all invoices...');
    
    const count = await prisma.invoice.count();
    console.log(`📊 Found ${count} invoices to delete`);
    
    if (count === 0) {
      console.log('✅ No invoices to delete!');
      return;
    }

    const result = await prisma.invoice.deleteMany({});

    console.log(`✅ Deleted ${result.count} invoices`);
    console.log('✨ Database cleared! Ready for fresh upload.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllInvoices();

