const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const API_URL = 'https://invoice-flow-410757682662.asia-southeast1.run.app/api';
const OMNI_FOLDER = '/Users/waikiengoh/Downloads/OMNI 2025';

// Get API key from command line
const apiKey = process.argv[2];
if (!apiKey) {
  console.log('Usage: node apply_omni_matches.js YOUR_API_KEY');
  process.exit(1);
}

// The 7 matches from our analysis
const MATCHES = [
  { payment_date: "2025-03-12", payment_amount: 51750.30, invoice_number: "GGTS-0985", invoice_date: "2025-03-10" },
  { payment_date: "2025-03-27", payment_amount: 52033.40, invoice_number: "GGTS-0990", invoice_date: "2025-03-25" },
  { payment_date: "2025-04-10", payment_amount: 10912.60, invoice_number: "GGTS-1018", invoice_date: "2025-04-03" },
  { payment_date: "2025-07-16", payment_amount: 19084.50, invoice_number: "GGTS-1224", invoice_date: "2025-07-13" },
  { payment_date: "2025-07-16", payment_amount: 80144.70, invoice_number: "GGTS-1225", invoice_date: "2025-07-14" },
  { payment_date: "2025-07-18", payment_amount: 7133.90, invoice_number: "GGTS-1226", invoice_date: "2025-07-15" },
  { payment_date: "2025-08-18", payment_amount: 8171.90, invoice_number: "GGTS-1233", invoice_date: "2025-08-13" },
];

async function getPayments() {
  const response = await fetch(`${API_URL}/payments`, {
    headers: { 'X-API-Key': apiKey }
  });
  return response.json();
}

async function uploadInvoice(filePath, invoiceNumber, invoiceDate, totalAmount) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  formData.append('invoiceNumber', invoiceNumber);
  formData.append('invoiceDate', invoiceDate);
  formData.append('totalAmount', totalAmount.toString());
  formData.append('recipientName', 'OMNIMART SDN BHD');

  const response = await fetch(`${API_URL}/invoices`, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload failed: ${response.status} - ${error}`);
  }

  return response.json();
}

async function linkPaymentToInvoice(paymentId, invoiceId) {
  const response = await fetch(`${API_URL}/payments/${paymentId}`, {
    method: 'PUT',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ invoiceId }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Link failed: ${response.status} - ${error}`);
  }

  return response.json();
}

async function main() {
  console.log('🔗 APPLYING OMNI 2025 MATCHES TO DATABASE');
  console.log('=========================================\n');

  // Step 1: Fetch all payments
  console.log('📥 Fetching payments from database...');
  const payments = await getPayments();
  console.log(`   Found ${payments.length} payments\n`);

  // Step 2: Process each match
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < MATCHES.length; i++) {
    const match = MATCHES[i];
    console.log(`[${i + 1}/${MATCHES.length}] Processing ${match.invoice_number}...`);

    try {
      // Find matching payment by date and amount
      const payment = payments.find(p => {
        const pDate = new Date(p.date).toISOString().split('T')[0];
        const amountMatch = Math.abs(p.amount - match.payment_amount) < 0.01;
        return pDate === match.payment_date && amountMatch && !p.invoiceId;
      });

      if (!payment) {
        console.log(`   ⚠️  No matching payment found for ${match.payment_date} - RM${match.payment_amount}`);
        failCount++;
        continue;
      }

      console.log(`   📋 Found payment ID: ${payment.id}`);

      // Find invoice PDF file
      const pdfFiles = fs.readdirSync(OMNI_FOLDER).filter(f => 
        f.toLowerCase().includes(match.invoice_number.toLowerCase().replace('GGTS-', 'ggts-')) ||
        f.includes(match.invoice_number)
      );

      if (pdfFiles.length === 0) {
        // Try with different pattern
        const allFiles = fs.readdirSync(OMNI_FOLDER);
        const invoiceNum = match.invoice_number.replace('GGTS-', '');
        const matchingFile = allFiles.find(f => f.includes(invoiceNum));
        
        if (!matchingFile) {
          console.log(`   ⚠️  PDF file not found for ${match.invoice_number}`);
          failCount++;
          continue;
        }
        pdfFiles.push(matchingFile);
      }

      const pdfPath = path.join(OMNI_FOLDER, pdfFiles[0]);
      console.log(`   📄 Uploading: ${pdfFiles[0]}`);

      // Upload invoice
      const invoice = await uploadInvoice(
        pdfPath,
        match.invoice_number,
        match.invoice_date,
        match.payment_amount
      );

      console.log(`   ✅ Invoice created: ${invoice.id}`);

      // Link payment to invoice
      await linkPaymentToInvoice(payment.id, invoice.id);
      console.log(`   🔗 Linked payment ${payment.id} → invoice ${invoice.id}`);

      successCount++;
      console.log();

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failCount++;
      console.log();
    }
  }

  // Summary
  console.log('=========================================');
  console.log('📊 SUMMARY');
  console.log('=========================================');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('\n✨ Done!');
}

main().catch(console.error);

