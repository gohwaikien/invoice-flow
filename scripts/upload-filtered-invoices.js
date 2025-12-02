const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const API_URL = 'https://invoice-flow-410757682662.asia-southeast1.run.app/api/invoices';
const INVOICE_DIR = '/Users/waikiengoh/Downloads/WhatsApp Chat - Omnimart GG Invoices!';

// Get API key from command line
const apiKey = process.argv[2];
if (!apiKey) {
  console.log('🔐 STEP 1: Get your API key');
  console.log('   1. Go to: https://invoice-flow-410757682662.asia-southeast1.run.app');
  console.log('   2. Sign in as supplier (gohwaikien@gmail.com)');
  console.log('   3. Go to Settings → API Key');
  console.log('   4. Copy your API key');
  console.log('📝 Then run this script with your API key:');
  console.log('   node scripts/upload-filtered-invoices.js YOUR_API_KEY START_NUMBER');
  process.exit(1);
}

// Get start number (e.g., 0803)
const startNumber = process.argv[3] || '0803';

console.log('✅ API Key provided');
console.log(`🎯 Uploading invoices from GGTS-${startNumber} onwards...`);

async function uploadInvoice(filePath) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`${response.status} - ${error}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
}

async function main() {
  try {
    // Get all PDF files
    const allFiles = fs.readdirSync(INVOICE_DIR)
      .filter(f => f.endsWith('.pdf'))
      .sort();

    // Filter files >= startNumber
    const files = allFiles.filter(f => {
      const match = f.match(/GGTS-(\d+)/);
      if (!match) return false;
      return match[1] >= startNumber;
    });

    console.log(`📂 Found ${files.length} PDF files to upload\n`);
    console.log(`📤 Uploading invoices...`);
    console.log(`⚠️  This will take a while (${files.length} invoices × ~10 seconds with OCR)\n`);

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = path.join(INVOICE_DIR, file);
      
      console.log(`[${i + 1}/${files.length}] Uploading ${file}...`);
      
      try {
        const result = await uploadInvoice(filePath);
        console.log(`   ✓ Uploaded: ${result.invoiceNumber || 'N/A'} - RM${result.totalAmount || 'N/A'}`);
        successCount++;
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.log(`   ✗ Failed: ${error.message}`);
        failCount++;
        errors.push({ file, error: error.message });
      }
    }

    console.log(`\n📊 UPLOAD COMPLETE`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);

    if (errors.length > 0) {
      console.log(`\n❌ ERRORS:`);
      errors.forEach(({ file, error }) => {
        console.log(`   ${file}: ${error}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

