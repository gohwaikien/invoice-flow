const fetch = require('node-fetch');

const API_URL = 'https://invoice-flow-410757682662.asia-southeast1.run.app/api';
const apiKey = process.argv[2];

if (!apiKey) {
  console.log('Usage: node match-payments-invoices.js YOUR_API_KEY');
  process.exit(1);
}

async function fetchData(endpoint) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: { 'X-API-Key': apiKey }
  });
  return await response.json();
}

function dateDiff(date1, date2) {
  return Math.abs(new Date(date1) - new Date(date2));
}

async function main() {
  try {
    console.log('📥 Fetching invoices and payments...\n');
    
    const [invoices, payments] = await Promise.all([
      fetchData('/invoices'),
      fetchData('/payments')
    ]);
    
    console.log(`✅ Found ${invoices.length} invoices`);
    console.log(`✅ Found ${payments.length} payments\n`);
    
    // Filter for invoices and payments with data
    const validInvoices = invoices.filter(i => i.totalAmount > 0);
    const validPayments = payments.filter(p => p.amount > 0 && !p.invoiceId);
    
    console.log(`📊 ${validInvoices.length} invoices with amounts`);
    console.log(`📊 ${validPayments.length} unmatched payments\n`);
    
    // Match payments to invoices
    const matches = [];
    const matchedInvoiceIds = new Set();
    const matchedPaymentIds = new Set();
    
    for (const payment of validPayments) {
      // Find all invoices with matching amount
      const amountMatches = validInvoices.filter(inv => 
        Math.abs(inv.totalAmount - payment.amount) < 0.01 && 
        !matchedInvoiceIds.has(inv.id)
      );
      
      if (amountMatches.length === 0) {
        // No amount match
        matches.push({
          payment,
          invoice: null,
          reason: 'No amount match'
        });
      } else if (amountMatches.length === 1) {
        // Exact single match
        matches.push({
          payment,
          invoice: amountMatches[0],
          reason: 'Exact amount match'
        });
        matchedInvoiceIds.add(amountMatches[0].id);
        matchedPaymentIds.add(payment.id);
      } else {
        // Multiple matches - choose closest date
        const paymentDate = new Date(payment.date);
        let bestMatch = amountMatches[0];
        let minDiff = dateDiff(paymentDate, amountMatches[0].invoiceDate);
        
        for (let i = 1; i < amountMatches.length; i++) {
          const diff = dateDiff(paymentDate, amountMatches[i].invoiceDate);
          if (diff < minDiff) {
            minDiff = diff;
            bestMatch = amountMatches[i];
          }
        }
        
        matches.push({
          payment,
          invoice: bestMatch,
          reason: `Closest date (${amountMatches.length} matches)`
        });
        matchedInvoiceIds.add(bestMatch.id);
        matchedPaymentIds.add(payment.id);
      }
    }
    
    // Display mapping
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('                            PAYMENT → INVOICE MAPPING');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    
    let successCount = 0;
    let noMatchCount = 0;
    
    matches.forEach((match, i) => {
      const payDate = new Date(match.payment.date).toISOString().split('T')[0];
      
      if (match.invoice) {
        const invDate = new Date(match.invoice.invoiceDate).toISOString().split('T')[0];
        const dateDiffDays = Math.round(dateDiff(match.payment.date, match.invoice.invoiceDate) / (1000 * 60 * 60 * 24));
        
        console.log(`${i + 1}. ✅ MATCHED`);
        console.log(`   Payment:  ${payDate} - RM${match.payment.amount.toLocaleString()}`);
        console.log(`   Invoice:  ${match.invoice.invoiceNumber} - ${invDate} - RM${match.invoice.totalAmount.toLocaleString()}`);
        console.log(`   Reason:   ${match.reason}`);
        console.log(`   Date Diff: ${dateDiffDays} days\n`);
        successCount++;
      } else {
        console.log(`${i + 1}. ❌ NO MATCH`);
        console.log(`   Payment:  ${payDate} - RM${match.payment.amount.toLocaleString()}`);
        console.log(`   Reason:   ${match.reason}\n`);
        noMatchCount++;
      }
    });
    
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('                                   SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log(`✅ Matched:     ${successCount}`);
    console.log(`❌ No Match:    ${noMatchCount}`);
    console.log(`📊 Total:       ${matches.length}`);
    console.log(`💰 Matched $:   RM${matches.filter(m => m.invoice).reduce((sum, m) => sum + m.payment.amount, 0).toLocaleString()}`);
    console.log(`💸 Unmatched $: RM${matches.filter(m => !m.invoice).reduce((sum, m) => sum + m.payment.amount, 0).toLocaleString()}`);
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    
    // Save mapping for review
    const mappingData = {
      timestamp: new Date().toISOString(),
      matches: matches.map(m => ({
        paymentId: m.payment.id,
        paymentDate: m.payment.date,
        paymentAmount: m.payment.amount,
        invoiceId: m.invoice?.id || null,
        invoiceNumber: m.invoice?.invoiceNumber || null,
        invoiceDate: m.invoice?.invoiceDate || null,
        invoiceAmount: m.invoice?.totalAmount || null,
        reason: m.reason
      }))
    };
    
    const fs = require('fs');
    fs.writeFileSync('/tmp/payment-invoice-mapping.json', JSON.stringify(mappingData, null, 2));
    console.log('💾 Mapping saved to: /tmp/payment-invoice-mapping.json\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();

