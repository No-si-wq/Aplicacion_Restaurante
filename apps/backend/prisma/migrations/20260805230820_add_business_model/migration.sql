-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "rtn" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "nombreComercial" TEXT,
    "telefono" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Business_companyId_key" ON "Business"("companyId");

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
