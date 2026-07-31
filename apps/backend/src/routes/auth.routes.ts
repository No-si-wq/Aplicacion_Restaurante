import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db/client";

const router = Router();

router.post("/login", async (req, res) => {
  const { companySlug, username, password } = req.body;
  if (!companySlug || !username || !password) {
    return res.status(400).json({ error: "Empresa, usuario y contraseña son requeridos" });
  }

  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company || !company.isActive) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const user = await prisma.user.findFirst({
    where: { companyId: company.id, username },
  });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, companyId: user.companyId },
    process.env.JWT_SECRET!,
    { expiresIn: "8h" }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role, companyId: user.companyId },
    company: { id: company.id, name: company.name, slug: company.slug },
  });
});

export default router;