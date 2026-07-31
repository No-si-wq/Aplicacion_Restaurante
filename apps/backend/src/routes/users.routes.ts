import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db/client";
import { requireAuth } from "../middleware/auth.middleware";

export const router = Router();

// GET /api/users
router.get("/", requireAuth, async (req, res) => {
  const users = await prisma.user.findMany({
    where: { companyId: req.user!.companyId },
    select: { id: true, username: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
});

// POST /api/users
router.post("/", requireAuth, async (req, res) => {
  const { username, password, role } = req.body;
  const companyId = req.user!.companyId;

  if (!username || !password) {
    return res.status(400).json({ error: "username y password son requeridos" });
  }

  const exists = await prisma.user.findFirst({ where: { username, companyId } });
  if (exists) {
    return res.status(409).json({ error: "El nombre de usuario ya existe" });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, password: hashed, role: role ?? "VENDEDOR", companyId },
    select: { id: true, username: true, role: true, createdAt: true },
  });

  res.status(201).json(user);
});

// PUT /api/users/:id
router.put("/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);
  const { username, password, role } = req.body;
  const companyId = req.user!.companyId;

  const data: any = {};
  if (username) data.username = username;
  if (role) data.role = role;
  if (password) data.password = await bcrypt.hash(password, 10);

  try {
    const result = await prisma.user.updateMany({
      where: { id, companyId },
      data,
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { id },
      select: { id: true, username: true, role: true, createdAt: true },
    });
    res.json(user);
  } catch {
    res.status(404).json({ error: "Usuario no encontrado" });
  }
});

// DELETE /api/users/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);
  const companyId = req.user!.companyId;

  try {
    await prisma.user.delete({ where: { id, companyId } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Usuario no encontrado" });
  }
});

export default router;