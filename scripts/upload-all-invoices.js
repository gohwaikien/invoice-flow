const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const API_URL = 'https://invoice-flow-410757682662.asia-southeast1.run.app/api/invoices';
const INVOICE_DIR = '/Users/waikiengoh/Downloads/WhatsApp Chat - Omnimart GG Invoices!';

// Get API key from command line
const apiKey = process.argv[2];
if (!apiKey) {
  console.log('Usage: node upload-all-invoices.js YOUR_API_KEY');
  process.exit(1);
}

console.log('✅ API Key provided');

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
    const files = fs.readdirSync(INVOICE_DIR)
      .filter(f => f.endsWith('.pdf'))
      .sort();

    console.log(`📂 Found ${files.length} PDF files to upload\n`);
    console.log(`📤 Uploading ALL invoices...`);
    console.log(`⚠️  This will take a while (~${Math.round(files.length * 10 / 60)} minutes with OCR)\n`);

    let successCount = 0;
    let failCount = 0;
    const errors = [];
    const uploaded = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = path.join(INVOICE_DIR, file);
      
      console.log(`[${i + 1}/${files.length}] Uploading ${file}...`);
      
      try {
        const result = await uploadInvoice(filePath);
        console.log(`   ✓ Uploaded: ${result.invoiceNumber || 'N/A'} - RM${result.totalAmount || 'N/A'}`);
        successCount++;
        uploaded.push({
          file,
          invoiceNumber: result.invoiceNumber,
          totalAmount: result.totalAmount,
          invoiceDate: result.invoiceDate,
          id: result.id
        });
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
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

    // Save uploaded invoices for matching
    fs.writeFileSync('/tmp/uploaded-invoices.json', JSON.stringify(uploaded, null, 2));
    console.log(`\n💾 Uploaded invoices saved to /tmp/uploaded-invoices.json`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

