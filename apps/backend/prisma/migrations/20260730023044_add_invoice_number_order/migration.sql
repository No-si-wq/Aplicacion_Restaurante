/*
  Warnings:

  - You are about to drop the column `invoiceNumber` on the `Table` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[invoiceNumber]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Table_invoiceNumber_key";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "invoiceNumber" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "Table" DROP COLUMN "invoiceNumber";

-- CreateIndex
CREATE UNIQUE INDEX "Order_invoiceNumber_key" ON "Order"("invoiceNumber");
