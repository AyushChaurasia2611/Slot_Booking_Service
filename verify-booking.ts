import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}
const adapter = new PrismaBetterSqlite3({ url: connectionString });
const prisma = new PrismaClient({ adapter });

async function runTest() {
  console.log('--- Starting Concurrency Validation Test ---');

  // 1. Create a temporary provider and two customer accounts
  console.log('Creating test accounts...');
  const provider = await prisma.user.create({
    data: {
      name: 'Temp Test Provider',
      email: 'temp_prov_test@example.com',
      role: 'PROVIDER',
      timezone: 'UTC',
    }
  });

  const customerA = await prisma.user.create({
    data: {
      name: 'Temp Test Customer A',
      email: 'temp_cust_a_test@example.com',
      role: 'CUSTOMER',
      timezone: 'UTC',
    }
  });

  const customerB = await prisma.user.create({
    data: {
      name: 'Temp Test Customer B',
      email: 'temp_cust_b_test@example.com',
      role: 'CUSTOMER',
      timezone: 'UTC',
    }
  });

  // 2. Create a single slot
  const slot = await prisma.slot.create({
    data: {
      startTime: new Date(Date.now() + 3600000), // 1 hour from now
      endTime: new Date(Date.now() + 7200000),
      providerId: provider.id,
    }
  });

  console.log(`Created test slot ID: ${slot.id}`);

  // 3. Trigger concurrent bookings using Promise.allSettled
  console.log('Firing parallel booking requests for Customer A and Customer B...');
  
  const bookSlot = async (userId: string) => {
    return await prisma.slot.update({
      where: {
        id: slot.id,
        bookedById: null // Concurrency lock check
      },
      data: {
        bookedById: userId
      }
    });
  };

  const results = await Promise.allSettled([
    bookSlot(customerA.id),
    bookSlot(customerB.id)
  ]);

  // 4. Validate results
  let successCount = 0;
  let failureCount = 0;

  results.forEach((res, i) => {
    if (res.status === 'fulfilled') {
      successCount++;
      console.log(`Request ${i + 1} succeeded: Slot booked by ${res.value.bookedById}`);
    } else {
      failureCount++;
      const reason = res.reason as any;
      console.log(`Request ${i + 1} failed: ${reason.message || reason}`);
    }
  });

  // 5. Clean up test records
  console.log('Cleaning up temporary test database records...');
  try {
    await prisma.slot.delete({ where: { id: slot.id } });
    await prisma.user.delete({ where: { id: provider.id } });
    await prisma.user.delete({ where: { id: customerA.id } });
    await prisma.user.delete({ where: { id: customerB.id } });
  } catch (cleanUpErr) {
    console.error('Error during cleanup:', cleanUpErr);
  }

  await prisma.$disconnect();

  // 6. Assertions
  if (successCount === 1 && failureCount === 1) {
    console.log('\n=============================================');
    console.log(' CONCURRENCY TEST PASSED SUCCESSFULLY! ✅');
    console.log(' Exactly 1 booking succeeded and 1 failed.');
    console.log('=============================================');
    process.exit(0);
  } else {
    console.log('\n=============================================');
    console.log(' CONCURRENCY TEST FAILED! ❌');
    console.log(` Successes: ${successCount}, Failures: ${failureCount}`);
    console.log('=============================================');
    process.exit(1);
  }
}

runTest().catch((e) => {
  console.error('Test execution crashed:', e);
  process.exit(1);
});
