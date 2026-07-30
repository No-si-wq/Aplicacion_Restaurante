/*
  Warnings:

  - A unique constraint covering the columns `[invoiceNumber]` on the table `Table` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Table" ADD COLUMN     "invoiceNumber" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Table_invoiceNumber_key" ON "Table"("invoiceNumber");
