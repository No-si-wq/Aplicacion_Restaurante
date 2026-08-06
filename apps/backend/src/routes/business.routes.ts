import { Router } from "express";
import { prisma } from "../db/client";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const companyId = req.user!.companyId;

  const business = await prisma.business.findUnique({ where: { companyId } });

  if (!business) {
    return res.status(404).json({ error: "Datos fiscales no configurados para esta empresa" });
  }

  res.json(business);
});

router.patch("/", requireAuth, async (req, res) => {
  const companyId = req.user!.companyId;
  const { razonSocial, rtn, direccion, nombreComercial, telefono, logoUrl } = req.body;

  const business = await prisma.business.upsert({
    where: { companyId },
    update: { razonSocial, rtn, direccion, nombreComercial, telefono, logoUrl },
    create: { companyId, razonSocial, rtn, direccion, nombreComercial, telefono, logoUrl },
  });

  res.json(business);
});

export default router;