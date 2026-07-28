// routes/categories.routes.ts
import { Router } from "express";
import { prisma } from "../db/client";

const router = Router();

// GET /categories
router.get("/", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    res.json(categories);
  } catch {
    res.status(500).json({ error: "Error al obtener categorías" });
  }
});

// POST /categories
router.post("/", async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ error: "El nombre es requerido" });
    return;
  }
  try {
    const category = await prisma.category.create({
      data: { name: name.trim() },
    });
    res.status(201).json(category);
  } catch (e: any) {
    if (e.code === "P2002") {
      res.status(409).json({ error: "La categoría ya existe" });
      return;
    }
    res.status(500).json({ error: "Error al crear categoría" });
  }
});

// DELETE /categories/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Error al eliminar categoría" });
  }
});

export default router;