const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Applying bottlesPerUnit, compareAtPriceCents, and Promotion schema changes...')

  // 1. Add bottlesPerUnit and compareAtPriceCents to Product
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "bottlesPerUnit" INTEGER NOT NULL DEFAULT 1;
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "compareAtPriceCents" INTEGER;
  `)

  // 2. Add bottlesPerUnit to OrderItem
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "bottlesPerUnit" INTEGER NOT NULL DEFAULT 1;
  `)

  // 3. Create enum PromoType if not exists
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "PromoType" AS ENUM ('BUY_X_GET_Y_FREE', 'PERCENTAGE', 'FIXED_DISCOUNT');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)

  // 4. Create Promotion table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Promotion" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "badgeText" TEXT,
      "description" TEXT,
      "type" "PromoType" NOT NULL DEFAULT 'BUY_X_GET_Y_FREE',
      "buyQuantity" INTEGER DEFAULT 3,
      "getFreeQuantity" INTEGER DEFAULT 1,
      "discountPercent" INTEGER,
      "discountCents" INTEGER,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "startDate" TIMESTAMP(3),
      "endDate" TIMESTAMP(3),
      "productId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Promotion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Promotion_productId_idx" ON "Promotion"("productId");
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Promotion_active_idx" ON "Promotion"("active");
  `)

  console.log('Migration completed successfully!')
}

main()
  .catch((err) => {
    console.error('Migration error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
