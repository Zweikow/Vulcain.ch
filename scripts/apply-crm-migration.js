const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Applying CRM & Payment Tracking schema changes...')

  // 1. Add columns to Customer
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "customerNumber" SERIAL;
  `)

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Customer_customerNumber_key" ON "Customer"("customerNumber");
  `)

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "proRatePercent" INTEGER;
  `)

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "notes" TEXT;
  `)

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  `)

  // 2. Add columns to Order
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
  `)

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
  `)

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "proRatePercent" INTEGER;
  `)

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "reminderCount" INTEGER NOT NULL DEFAULT 0;
  `)

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "lastReminderAt" TIMESTAMP(3);
  `)

  // 3. Make sure existing customers have 6-digit numbers (100001, 100002...)
  const customers = await prisma.customer.findMany({ orderBy: { createdAt: 'asc' } })
  for (let i = 0; i < customers.length; i++) {
    const expectedNum = 100001 + i
    await prisma.customer.update({
      where: { id: customers[i].id },
      data: { customerNumber: expectedNum },
    })
    console.log(`Customer ${customers[i].email} assigned customerNumber ${expectedNum}`)
  }

  // Set sequence start to beyond max customerNumber so new ones continue from 100004+
  const max = await prisma.customer.findFirst({
    orderBy: { customerNumber: 'desc' },
    select: { customerNumber: true },
  })
  const nextVal = max?.customerNumber ?? 100000
  try {
    await prisma.$executeRawUnsafe(`
      SELECT setval(pg_get_serial_sequence('"Customer"', 'customerNumber'), ${nextVal}, true);
    `)
    console.log(`Sequence set to ${nextVal}`)
  } catch (e) {
    console.log('Sequence setval note:', e.message)
  }

  console.log('Migration completed successfully!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
