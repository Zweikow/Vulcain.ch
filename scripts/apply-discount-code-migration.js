const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Applying DiscountCode and Order promo fields schema changes...')

  // 1. Add promoCode and promoDiscountCents to Order
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "promoCode" TEXT;
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "promoDiscountCents" INTEGER NOT NULL DEFAULT 0;
  `)

  // 2. Create enum DiscountType if not exists
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)

  // 3. Create DiscountCode table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DiscountCode" (
      "id" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "description" TEXT,
      "type" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
      "percentage" INTEGER,
      "amountCents" INTEGER,
      "minSubtotalCents" INTEGER,
      "maxUses" INTEGER,
      "usedCount" INTEGER NOT NULL DEFAULT 0,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "startDate" TIMESTAMP(3),
      "endDate" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "DiscountCode_code_key" ON "DiscountCode"("code");
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "DiscountCode_code_idx" ON "DiscountCode"("code");
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "DiscountCode_active_idx" ON "DiscountCode"("active");
  `)

  // 4. Initial code for opening campaign: OUVERTURE10 (10% off)
  const existingCode = await prisma.discountCode.findUnique({
    where: { code: 'OUVERTURE10' },
  })

  if (!existingCode) {
    await prisma.discountCode.create({
      data: {
        code: 'OUVERTURE10',
        description: 'Campagne Instagram ouverture du site - 10% de réduction',
        type: 'PERCENTAGE',
        percentage: 10,
        active: true,
      },
    })
    console.log('Created initial promo code: OUVERTURE10 (-10%)')
  }

  console.log('Migration completed successfully!')
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
