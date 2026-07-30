import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db/client";

export const router = Router();

// GET /api/users
router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
});

// POST /api/users
router.post("/", async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "username y password son requeridos" });
  }

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) {
    return res.status(409).json({ error: "El nombre de usuario ya existe" });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, password: hashed, role: role ?? "VENDEDOR" },
    select: { id: true, username: true, role: true, createdAt: true },
  });

  res.status(201).json(user);
});

// PUT /api/users/:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { username, password, role } = req.body;

  const data: any = {};
  if (username) data.username = username;
  if (role) data.role = role;
  if (password) data.password = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, role: true, createdAt: true },
    });
    res.json(user);
  } catch {
    res.status(404).json({ error: "Usuario no encontrado" });
  }
});

// DELETE /api/users/:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Usuario no encontrado" });
  }
});

export default router;