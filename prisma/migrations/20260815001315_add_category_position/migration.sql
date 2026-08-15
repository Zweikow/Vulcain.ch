-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Setting" ALTER COLUMN "companyTagline" SET DEFAULT 'Cidrerie du Vulcain';
