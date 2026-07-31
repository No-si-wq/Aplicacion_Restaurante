/*
  Warnings:

  - Made the column `companyId` on table `Cai` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `Category` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `Order` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `Product` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `Table` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `TicketTemplate` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Cai" DROP CONSTRAINT "Cai_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Table" DROP CONSTRAINT "Table_companyId_fkey";

-- DropForeignKey
ALTER TABLE "TicketTemplate" DROP CONSTRAINT "TicketTemplate_companyId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_companyId_fkey";

-- AlterTable
ALTER TABLE "Cai" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Table" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "TicketTemplate" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "companyId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Cai" ADD CONSTRAINT "Cai_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketTemplate" ADD CONSTRAINT "TicketTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
