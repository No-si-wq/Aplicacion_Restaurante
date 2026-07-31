-- DropIndex
DROP INDEX "Order_invoiceNumber_key";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "caiId" TEXT,
ALTER COLUMN "invoiceNumber" DROP NOT NULL,
ALTER COLUMN "invoiceNumber" DROP DEFAULT;
DROP SEQUENCE "Order_invoiceNumber_seq";

-- CreateTable
CREATE TABLE "Cai" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "establishment" TEXT NOT NULL,
    "pointOfSale" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT '01',
    "rangeStart" INTEGER NOT NULL,
    "rangeEnd" INTEGER NOT NULL,
    "currentNumber" INTEGER NOT NULL DEFAULT 0,
    "limitDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cai_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cai_code_key" ON "Cai"("code");

-- AddForeignKey
ALTER TABLE "Cai" ADD CONSTRAINT "Cai_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_caiId_fkey" FOREIGN KEY ("caiId") REFERENCES "Cai"("id") ON DELETE SET NULL ON UPDATE CASCADE;
