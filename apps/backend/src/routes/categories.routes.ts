// routes/categories.routes.ts
import { Router } from "express";
import { prisma } from "../db/client";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// GET /categories
router.get("/", requireAuth, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ 
      where: { companyId: req.user!.companyId },
      orderBy: { name: "asc" },
    });
    res.json(categories);
  } catch {
    res.status(500).json({ error: "Error al obtener categorías" });
  }
});

// POST /categories
router.post("/", requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ error: "El nombre es requerido" });
    return;
  }
  try {
    const category = await prisma.category.create({
      data: { name: name.trim(), companyId: req.user!.companyId },
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
router.delete("/:id", requireAuth, async (req, res) => {
  const categoryId = String(req.params.id);
  try {
    await prisma.category.delete({ where: { id: categoryId, companyId: req.user!.companyId } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Error al eliminar categoría" });
  }
});

export default router;