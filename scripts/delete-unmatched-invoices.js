const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function deleteUnmatchedInvoices() {
  try {
    console.log('📥 Loading mapping from /tmp/payment-invoice-mapping.json...\n');
    
    const mappingData = JSON.parse(fs.readFileSync('/tmp/payment-invoice-mapping.json', 'utf-8'));
    
    // Get all matched invoice IDs
    const matchedInvoiceIds = mappingData.matches
      .filter(m => m.invoiceId !== null)
      .map(m => m.invoiceId);
    
    console.log(`✅ Found ${matchedInvoiceIds.length} matched invoices to keep\n`);
    
    // Get all invoices
    const allInvoices = await prisma.invoice.findMany({
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
      }
    });
    
    console.log(`📊 Total invoices in database: ${allInvoices.length}\n`);
    
    // Find unmatched invoices
    const unmatchedInvoices = allInvoices.filter(inv => !matchedInvoiceIds.includes(inv.id));
    
    console.log(`🗑️  Found ${unmatchedInvoices.length} unmatched invoices to delete\n`);
    
    if (unmatchedInvoices.length === 0) {
      console.log('✅ No unmatched invoices to delete!');
      return;
    }
    
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('                       DELETING UNMATCHED INVOICES');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    
    // Show what will be deleted
    console.log('Invoices to be deleted:');
    unmatchedInvoices.slice(0, 10).forEach((inv, i) => {
      console.log(`  ${i + 1}. ${inv.invoiceNumber || 'N/A'} - RM${inv.totalAmount.toLocaleString()}`);
    });
    
    if (unmatchedInvoices.length > 10) {
      console.log(`  ... and ${unmatchedInvoices.length - 10} more`);
    }
    console.log('');
    
    // Delete unmatched invoices
    const unmatchedIds = unmatchedInvoices.map(inv => inv.id);
    
    const result = await prisma.invoice.deleteMany({
      where: {
        id: {
          in: unmatchedIds
        }
      }
    });
    
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('                                   SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log(`✅ Kept:       ${matchedInvoiceIds.length} (matched invoices)`);
    console.log(`🗑️  Deleted:    ${result.count} (unmatched invoices)`);
    console.log(`📊 Original:   ${allInvoices.length}`);
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    
    console.log('✨ Done! Only matched invoices remain in the database.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteUnmatchedInvoices();

