const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const SITE_URL = 'https://invoice-flow-410757682662.asia-southeast1.run.app';
const INVOICES_DIR = '/Users/waikiengoh/Downloads/WhatsApp Chat - Omnimart GG Invoices!';

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

async function uploadInvoice(apiKey, filePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  try {
    const response = await fetch(`${SITE_URL}/api/invoices`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
      body: form,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${error}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw new Error(`Upload error: ${error.message}`);
  }
}

async function getAllInvoices(apiKey) {
  try {
    const response = await fetch(`${SITE_URL}/api/invoices`, {
      headers: {
        'X-API-Key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get invoices: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Get invoices error: ${error.message}`);
  }
}

async function linkPaymentToInvoice(apiKey, paymentId, invoiceId) {
  try {
    const response = await fetch(`${SITE_URL}/api/payments/${paymentId}/attach-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ invoiceId }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Link failed: ${response.status} - ${error}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Link error: ${error.message}`);
  }
}

async function main() {
  console.log('🔐 STEP 1: Get your API key');
  console.log('   1. Go to: ' + SITE_URL);
  console.log('   2. Sign in as supplier (gohwaikien@gmail.com)');
  console.log('   3. Go to Settings → API Key');
  console.log('   4. Copy your API key');
  console.log('');
  console.log('📝 Then run this script with your API key:');
  console.log('   node scripts/upload-and-match-invoices.js YOUR_API_KEY');
  console.log('');

  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.error('❌ Please provide your API key as an argument');
    process.exit(1);
  }

  console.log('✅ API Key provided');
  console.log('');

  // Step 1: Get all PDF files
  const files = fs.readdirSync(INVOICES_DIR).filter(f => f.endsWith('.pdf'));
  console.log(`📂 Found ${files.length} PDF files to upload`);
  console.log('');

  // Step 2: Upload invoices (with limit to avoid overwhelming the system)
  console.log('📤 Uploading invoices...');
  console.log('⚠️  This will take a while (272 invoices × ~5 seconds = ~23 minutes)');
  console.log('');

  const uploadResults = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < Math.min(files.length, 10); i++) {  // Start with first 10 for testing
    const file = files[i];
    const filePath = path.join(INVOICES_DIR, file);
    
    try {
      console.log(`[${i+1}/${files.length}] Uploading ${file}...`);
      const result = await uploadInvoice(apiKey, filePath);
      uploadResults.push({ file, invoice: result, success: true });
      successCount++;
      console.log(`   ✓ Uploaded: ${result.invoiceNumber || 'N/A'} - RM${result.totalAmount || 'N/A'}`);
      
      // Wait 2 seconds between uploads to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      uploadResults.push({ file, error: error.message, success: false });
      errorCount++;
      console.log(`   ✗ Failed: ${error.message}`);
    }
  }

  console.log('');
  console.log(`📊 Upload Summary: ${successCount} success, ${errorCount} errors`);
  console.log('');

  // Step 3: Get all invoices
  console.log('📋 Fetching all uploaded invoices...');
  const allInvoices = await getAllInvoices(apiKey);
  console.log(`   Found ${allInvoices.length} total invoices`);
  console.log('');

  // Step 4: Match payments to invoices
  console.log('🔗 Matching payments to invoices...');
  console.log('');

  // This would continue with matching logic...
  console.log('⚠️  Next steps:');
  console.log('   1. Review the uploaded invoices in your web app');
  console.log('   2. Run this script again to upload remaining invoices');
  console.log('   3. Then run matching to link payments to invoices');
}

main().catch(console.error);

