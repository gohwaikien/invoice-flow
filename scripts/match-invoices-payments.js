const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const paymentsData = [
  { date: '2025-03-03', amount: 20656.50 },
  { date: '2025-03-04', amount: 39454.50 },
  { date: '2025-03-12', amount: 38111.10 },
  { date: '2025-03-12', amount: 41759.20 },
  { date: '2025-03-12', amount: 51750.30 },
  { date: '2025-03-20', amount: 19636.60 },
  { date: '2025-03-24', amount: 24265.10 },
  { date: '2025-03-25', amount: 31877.23 },
  { date: '2025-03-27', amount: 52033.40 },
  { date: '2025-04-01', amount: 4856.80 },
  { date: '2025-04-07', amount: 67963.50 },
  { date: '2025-04-10', amount: 36066.00 },
  { date: '2025-04-10', amount: 10912.60 },
  { date: '2025-04-10', amount: 31877.30 },
  { date: '2025-04-17', amount: 10532.00 },
  { date: '2025-04-17', amount: 7707.80 },
  { date: '2025-04-28', amount: 12008.80 },
  { date: '2025-04-28', amount: 43267.20 },
  { date: '2025-05-03', amount: 43549.50 },
  { date: '2025-06-04', amount: 30149.30 },
  { date: '2025-06-09', amount: 52045.20 },
  { date: '2025-06-21', amount: 26166.40 },
  { date: '2025-06-21', amount: 20526.00 },
  { date: '2025-06-26', amount: 30447.80 },
  { date: '2025-06-26', amount: 26425.50 },
  { date: '2025-06-28', amount: 26675.10 },
  { date: '2025-07-02', amount: 30722.10 },
  { date: '2025-07-06', amount: 16635.00 },
  { date: '2025-07-09', amount: 22933.40 },
  { date: '2025-07-16', amount: 80144.70 },
  { date: '2025-07-16', amount: 19084.50 },
  { date: '2025-07-18', amount: 7133.90 },
  { date: '2025-07-31', amount: 21321.60 },
  { date: '2025-08-01', amount: 11072.30 },
  { date: '2025-08-06', amount: 21974.50 },
  { date: '2025-08-10', amount: 15058.80 },
  { date: '2025-08-10', amount: 21512.10 },
  { date: '2025-08-18', amount: 8171.90 },
  { date: '2025-08-19', amount: 24047.62 },
  { date: '2025-08-26', amount: 14558.55 },
  { date: '2025-08-29', amount: 27530.60 },
  { date: '2025-09-03', amount: 12815.70 },
  { date: '2025-09-09', amount: 21720.30 },
  { date: '2025-09-25', amount: 10960.50 },
  { date: '2025-09-27', amount: 6084.35 },
  { date: '2025-09-30', amount: 2894.50 },
  { date: '2025-10-01', amount: 30239.50 },
  { date: '2025-10-12', amount: 6095.35 },
  { date: '2025-10-14', amount: 30203.35 },
  { date: '2025-10-16', amount: 26710.35 },
  { date: '2025-10-17', amount: 21028.40 },
  { date: '2025-10-17', amount: 7628.40 },
  { date: '2025-10-21', amount: 40136.60 },
  { date: '2025-10-23', amount: 10595.20 },
  { date: '2025-10-23', amount: 19496.00 },
  { date: '2025-10-28', amount: 22761.40 },
  { date: '2025-10-29', amount: 33908.90 },
  { date: '2025-11-05', amount: 285.05 },
  { date: '2025-11-05', amount: 15471.50 },
  { date: '2025-11-06', amount: 19837.15 },
  { date: '2025-11-13', amount: 17823.60 },
  { date: '2025-11-25', amount: 8112.10 },
  { date: '2025-11-28', amount: 24079.70 },
];

const invoicesDir = '/Users/waikiengoh/Downloads/WhatsApp Chat - Omnimart GG Invoices!';

// Extract amount and date from invoice text
function extractInvoiceData(text, filename) {
  // Extract invoice number from filename first (most reliable)
  const filenameMatch = filename.match(/GGTS[-\s]?(\d{4}[S]?)/i) || filename.match(/GGLS[-\s]?(\d{3,4})/i);
  let invoiceNumber = filenameMatch ? filenameMatch[0] : filename.replace('.pdf', '');

  // Also try from text
  const textMatch = text.match(/GGTS[-\s]?(\d{4}[S]?)/i) || text.match(/GGLS[-\s]?(\d{3,4})/i);
  if (textMatch) {
    invoiceNumber = textMatch[0];
  }

  // Extract total amount - try multiple patterns
  const amountPatterns = [
    /Total[\s:]+RM[\s]*([\d,]+\.?\d{0,2})/i,
    /Grand[\s]+Total[\s:]+RM[\s]*([\d,]+\.?\d{0,2})/i,
    /Amount[\s:]+RM[\s]*([\d,]+\.?\d{0,2})/i,
    /Total[\s]+Amount[\s:]+RM[\s]*([\d,]+\.?\d{0,2})/i,
    /RM[\s]*([\d,]+\.\d{2})\s*$/m,  // Amount at end of line
    /(\d{1,3}(?:,\d{3})*\.\d{2})\s*$/m,  // Any number at end
  ];

  let totalAmount = null;
  for (const pattern of amountPatterns) {
    const matches = text.match(new RegExp(pattern, 'gi'));
    if (matches && matches.length > 0) {
      // Get the last match (usually the total)
      const lastMatch = matches[matches.length - 1];
      const numMatch = lastMatch.match(/([\d,]+\.?\d{0,2})/);
      if (numMatch) {
        const amt = parseFloat(numMatch[1].replace(/,/g, ''));
        if (amt > 100 && amt < 1000000) {  // Reasonable range
          totalAmount = amt;
          break;
        }
      }
    }
  }

  // Extract date - look for various date formats
  const datePatterns = [
    /Date[\s:]*(\d{1,2}[-\/]\d{1,2}[-\/](20\d{2}))/i,
    /(\d{1,2}[-\/]\d{1,2}[-\/](20\d{2}))/,
    /((20\d{2})[-\/]\d{1,2}[-\/]\d{1,2})/,
  ];

  let invoiceDate = null;
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      invoiceDate = match[1];
      break;
    }
  }

  return { invoiceNumber, totalAmount, invoiceDate, filename };
}

async function analyzeInvoices() {
  console.log('📂 Reading PDFs from:', invoicesDir);
  console.log('');

  const files = fs.readdirSync(invoicesDir).filter(f => f.endsWith('.pdf'));
  console.log(`📄 Found ${files.length} PDF files`);
  console.log('🔍 Extracting invoice data...\n');

  const invoices = [];

  for (const file of files) {
    try {
      const filePath = path.join(invoicesDir, file);
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      const text = data.text;

      const invoiceData = extractInvoiceData(text, file);
      
      // Check if this is a 2025 invoice
      const is2025 = invoiceData.invoiceDate && invoiceData.invoiceDate.includes('2025');
      
      if (invoiceData.totalAmount) {
        invoices.push({
          ...invoiceData,
          is2025,
          file
        });
      } else {
        // Still add it without amount for tracking
        invoices.push({
          ...invoiceData,
          is2025: false,
          file
        });
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }

  const invoicesWithAmount = invoices.filter(inv => inv.totalAmount);
  console.log(`✅ Extracted amounts from ${invoicesWithAmount.length}/${invoices.length} invoices\n`);

  // Filter 2025 invoices
  const invoices2025 = invoices.filter(inv => inv.is2025 && inv.totalAmount);
  console.log(`📅 Found ${invoices2025.length} invoices from 2025 with amounts\n`);

  // Match payments with invoices by amount
  console.log('🔗 MATCHING PAYMENTS TO INVOICES BY AMOUNT:\n');
  console.log('='.repeat(100));

  const matches = [];
  const unmatchedPayments = [];

  for (const payment of paymentsData) {
    // Find ALL invoices with matching amount (allow small tolerance for rounding)
    const matchingInvoices = invoices.filter(inv => 
      inv.totalAmount && Math.abs(inv.totalAmount - payment.amount) < 0.10
    );

    if (matchingInvoices.length === 0) {
      unmatchedPayments.push(payment);
      console.log(`✗ No match for Payment ${payment.date} RM${payment.amount.toFixed(2)}`);
      console.log('');
    } else if (matchingInvoices.length === 1) {
      // Only 1 match - perfect!
      const match = matchingInvoices[0];
      matches.push({ payment, invoice: match });
      console.log(`✓ Payment ${payment.date} RM${payment.amount.toFixed(2)} → ${match.invoiceNumber} (${match.invoiceDate || 'no date'}) RM${match.totalAmount.toFixed(2)}`);
      console.log(`  File: ${match.file}`);
      console.log(`  [SINGLE MATCH]`);
      console.log('');
    } else {
      // Multiple matches - pick the one with closest date
      console.log(`⚠️  Multiple matches (${matchingInvoices.length}) for Payment ${payment.date} RM${payment.amount.toFixed(2)}:`);
      
      matchingInvoices.forEach((inv, i) => {
        console.log(`     ${i+1}. ${inv.invoiceNumber} (${inv.invoiceDate || 'no date'}) - ${inv.file}`);
      });

      // Parse payment date
      const paymentDate = new Date(payment.date);
      
      // Find invoice with closest date
      let bestMatch = matchingInvoices[0];
      let smallestDiff = Infinity;
      
      for (const inv of matchingInvoices) {
        if (inv.invoiceDate) {
          try {
            const invDate = new Date(inv.invoiceDate);
            const diff = Math.abs(paymentDate - invDate);
            if (diff < smallestDiff) {
              smallestDiff = diff;
              bestMatch = inv;
            }
          } catch (e) {
            // Can't parse date, skip
          }
        }
      }
      
      matches.push({ payment, invoice: bestMatch });
      console.log(`  ✓ SELECTED: ${bestMatch.invoiceNumber} (${bestMatch.invoiceDate || 'no date'})`);
      console.log(`  File: ${bestMatch.file}`);
      console.log('');
    }
  }

  console.log('='.repeat(100));
  console.log(`\n📊 SUMMARY:`);
  console.log(`   ✅ Matched: ${matches.length}/${paymentsData.length}`);
  console.log(`   ❌ Unmatched Payments: ${unmatchedPayments.length}`);

  if (unmatchedPayments.length > 0) {
    console.log(`\n⚠️  UNMATCHED PAYMENTS:`);
    unmatchedPayments.forEach(p => {
      console.log(`   ${p.date} - RM${p.amount.toFixed(2)}`);
    });
  }

  // Show available 2025 invoices for manual review
  if (invoices2025.length > 0) {
    console.log(`\n📋 All 2025 Invoices:`);
    invoices2025.forEach(inv => {
      console.log(`   ${inv.invoiceNumber} - ${inv.invoiceDate || 'no date'} - RM${inv.totalAmount ? inv.totalAmount.toFixed(2) : 'N/A'} - ${inv.file}`);
    });
  }
}

analyzeInvoices().catch(console.error);

