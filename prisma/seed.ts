import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.slot.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Creating users (providers and customers)...');

  // Providers
  const alice = await prisma.user.create({
    data: {
      name: 'Alice (New York)',
      email: 'alice@example.com',
      role: Role.PROVIDER,
      timezone: 'America/New_York',
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: 'Bob (London)',
      email: 'bob@example.com',
      role: Role.PROVIDER,
      timezone: 'Europe/London',
    },
  });

  // Customers
  const charlie = await prisma.user.create({
    data: {
      name: 'Charlie (Tokyo)',
      email: 'charlie@example.com',
      role: Role.CUSTOMER,
      timezone: 'Asia/Tokyo',
    },
  });

  const dave = await prisma.user.create({
    data: {
      name: 'Dave (Delhi)',
      email: 'dave@example.com',
      role: Role.CUSTOMER,
      timezone: 'Asia/Kolkata',
    },
  });

  console.log(`Users created:
    Provider: Alice [${alice.id}] (${alice.timezone})
    Provider: Bob [${bob.id}] (${bob.timezone})
    Customer: Charlie [${charlie.id}] (${charlie.timezone})
    Customer: Dave [${dave.id}] (${dave.timezone})
  `);

  console.log('Creating slots...');

  // Tomorrow's date helper
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  const dayAfterTomorrow = new Date(now);
  dayAfterTomorrow.setDate(now.getDate() + 2);
  dayAfterTomorrow.setUTCHours(0, 0, 0, 0);

  // Helper to build dates
  const buildDate = (baseDate: Date, utcHours: number, utcMinutes: number = 0) => {
    const d = new Date(baseDate);
    d.setUTCHours(utcHours, utcMinutes, 0, 0);
    return d;
  };

  // Alice Slots: New York time is UTC-4 in summer (July).
  // 9:00 AM EDT -> 13:00 UTC
  // 10:00 AM EDT -> 14:00 UTC
  // 2:00 PM EDT -> 18:00 UTC
  const aliceSlots = [
    // Tomorrow Available Slots
    {
      startTime: buildDate(tomorrow, 13), // 9 AM EDT
      endTime: buildDate(tomorrow, 14),   // 10 AM EDT
      providerId: alice.id,
      bookedById: null,
    },
    {
      startTime: buildDate(tomorrow, 14), // 10 AM EDT
      endTime: buildDate(tomorrow, 15),   // 11 AM EDT
      providerId: alice.id,
      bookedById: null,
    },
    {
      startTime: buildDate(tomorrow, 18), // 2 PM EDT
      endTime: buildDate(tomorrow, 19),   // 3 PM EDT
      providerId: alice.id,
      bookedById: null,
    },
    // Day After Tomorrow slots
    {
      startTime: buildDate(dayAfterTomorrow, 13), // 9 AM EDT
      endTime: buildDate(dayAfterTomorrow, 14),   // 10 AM EDT
      providerId: alice.id,
      bookedById: null,
    },
    {
      startTime: buildDate(dayAfterTomorrow, 15), // 11 AM EDT
      endTime: buildDate(dayAfterTomorrow, 16),   // 12 PM EDT
      providerId: alice.id,
      bookedById: charlie.id, // Pre-booked by Charlie
    },
  ];

  // Bob Slots: London time is BST (UTC+1 in July).
  // 9:00 AM BST -> 8:00 AM UTC
  // 10:00 AM BST -> 9:00 AM UTC
  // 1:00 PM BST -> 12:00 PM UTC
  // 2:00 PM BST -> 1:00 PM UTC
  const bobSlots = [
    // Tomorrow Available & Booked
    {
      startTime: buildDate(tomorrow, 8),  // 9 AM BST
      endTime: buildDate(tomorrow, 9),    // 10 AM BST
      providerId: bob.id,
      bookedById: null,
    },
    {
      startTime: buildDate(tomorrow, 9),  // 10 AM BST
      endTime: buildDate(tomorrow, 10),   // 11 AM BST
      providerId: bob.id,
      bookedById: dave.id, // Pre-booked by Dave
    },
    {
      startTime: buildDate(tomorrow, 12), // 1 PM BST
      endTime: buildDate(tomorrow, 13),   // 2 PM BST
      providerId: bob.id,
      bookedById: null,
    },
    // Day After Tomorrow Available
    {
      startTime: buildDate(dayAfterTomorrow, 13), // 2 PM BST -> 1 PM UTC
      endTime: buildDate(dayAfterTomorrow, 14),   // 3 PM BST -> 2 PM UTC
      providerId: bob.id,
      bookedById: null,
    },
  ];

  console.log('Seeding slots into database...');
  for (const slot of [...aliceSlots, ...bobSlots]) {
    await prisma.slot.create({
      data: slot,
    });
  }

  console.log('Database successfully seeded!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
