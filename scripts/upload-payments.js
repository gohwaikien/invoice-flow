const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

async function uploadPayments() {
  try {
    console.log('🔍 Finding supplier user...');
    
    // Find the supplier user (gohwaikien@gmail.com)
    const supplier = await prisma.user.findUnique({
      where: { email: 'gohwaikien@gmail.com' }
    });

    if (!supplier) {
      console.error('❌ Supplier user not found! Please sign in to the app first.');
      process.exit(1);
    }

    console.log(`✅ Found supplier: ${supplier.name} (${supplier.email})`);
    console.log(`📊 Uploading ${paymentsData.length} payments...`);

    let successCount = 0;
    let errorCount = 0;

    for (const payment of paymentsData) {
      try {
        const created = await prisma.payment.create({
          data: {
            amount: payment.amount,
            date: new Date(payment.date),
            paidById: supplier.id,
            notes: 'Bulk upload - historical payment',
          }
        });

        successCount++;
        console.log(`✓ Created payment: RM${payment.amount} on ${payment.date} (ID: ${created.id})`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Failed to create payment for ${payment.date}: ${error.message}`);
      }
    }

    console.log('\n📈 Upload Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   💰 Total Amount: RM${paymentsData.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

uploadPayments();

