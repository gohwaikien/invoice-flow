const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function applyMatches() {
  try {
    console.log('📥 Loading mapping from /tmp/payment-invoice-mapping.json...\n');
    
    const mappingData = JSON.parse(fs.readFileSync('/tmp/payment-invoice-mapping.json', 'utf-8'));
    
    // Filter for successful matches only
    const successfulMatches = mappingData.matches.filter(m => m.invoiceId !== null);
    
    console.log(`✅ Found ${successfulMatches.length} successful matches to apply\n`);
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('                            APPLYING MATCHES');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const match of successfulMatches) {
      try {
        const paymentDate = new Date(match.paymentDate).toISOString().split('T')[0];
        const invoiceDate = new Date(match.invoiceDate).toISOString().split('T')[0];
        
        console.log(`Linking Payment → Invoice:`);
        console.log(`  Payment:  ${paymentDate} - RM${match.paymentAmount.toLocaleString()}`);
        console.log(`  Invoice:  ${match.invoiceNumber} - ${invoiceDate} - RM${match.invoiceAmount.toLocaleString()}`);
        
        // Update the payment to link it to the invoice
        await prisma.payment.update({
          where: { id: match.paymentId },
          data: { invoiceId: match.invoiceId }
        });
        
        console.log(`  ✅ Linked successfully!\n`);
        successCount++;
        
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}\n`);
        errorCount++;
        errors.push({
          paymentId: match.paymentId,
          invoiceNumber: match.invoiceNumber,
          error: error.message
        });
      }
    }
    
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('                                   SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log(`✅ Applied:    ${successCount}`);
    console.log(`❌ Failed:     ${errorCount}`);
    console.log(`📊 Total:      ${successfulMatches.length}`);
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    
    if (errors.length > 0) {
      console.log('❌ ERRORS:');
      errors.forEach(err => {
        console.log(`   ${err.invoiceNumber}: ${err.error}`);
      });
      console.log('');
    }
    
    console.log('✨ Done! Payments are now linked to their invoices.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

applyMatches();

