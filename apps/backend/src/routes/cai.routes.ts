// apps/backend/src/routes/cai.routes.ts
import { Router } from "express";
import { prisma } from "../db/client";

export const caiRouter = Router();

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === "" || Number.isNaN(value);
}

// GET /cai — listar todos (solo admin), con el usuario asignado
caiRouter.get("/", async (req, res) => {
  try {
    const cais = await prisma.cai.findMany({
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(cais);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los CAI" });
  }
});

// POST /cai — crear CAI para un usuario (solo admin)
caiRouter.post("/", async (req, res) => {
  const { code, establishment, pointOfSale, documentType, rangeStart, rangeEnd, limitDate, userId } = req.body;

  if (!code || !establishment || !pointOfSale || !rangeStart || !rangeEnd || !limitDate || !userId) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  try {
    const cai = await prisma.cai.create({
      data: {
        code,
        establishment,
        pointOfSale,
        documentType: documentType ?? "01",
        rangeStart: Number(rangeStart),
        rangeEnd: Number(rangeEnd),
        currentNumber: Number(rangeStart) - 1, // el siguiente emitido será rangeStart
        limitDate: new Date(limitDate),
        userId,
      },
    });
    res.status(201).json(cai);
  } catch (error) {
    res.status(500).json({ error: "Error al crear el CAI" });
  }
});

// PATCH /cai/:id — editar (ej. desactivar, extender fecha límite)
caiRouter.patch("/:id", async (req, res) => {
  const { isActive, limitDate, rangeEnd } = req.body;

  try {
    const cai = await prisma.cai.update({
      where: { id: req.params.id },
      data: {
        ...(isActive !== undefined ? { isActive } : {}),
        ...(limitDate ? { limitDate: new Date(limitDate) } : {}),
        ...(rangeEnd !== undefined ? { rangeEnd: Number(rangeEnd) } : {}),
      },
    });
    res.json(cai);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar el CAI" });
  }
});

// DELETE /cai/:id
caiRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.cai.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar el CAI" });
  }
});