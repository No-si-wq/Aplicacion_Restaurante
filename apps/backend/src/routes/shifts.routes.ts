import { Router } from "express";
import { prisma } from "../db/client";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();
router.use(requireAuth);

// Agregar arriba, después de router.use(requireAuth);

async function computeNextShiftName(companyId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const count = await prisma.shift.count({
    where: { companyId, openedAt: { gte: startOfDay } },
  });

  return `Turno ${count + 1}`;
}

// GET /api/shifts/next-name — debe ir ANTES de GET /:id
router.get("/next-name", async (req, res) => {
  const companyId = req.user!.companyId;
  const name = await computeNextShiftName(companyId);
  res.json({ name });
});

// GET /api/shifts/current
router.get("/current", async (req, res) => {
  const companyId = req.user!.companyId;
  const userId = req.user!.id;
  const shift = await prisma.shift.findFirst({
    where: { companyId, status: "open", openedById: userId },
    include: { openedBy: { select: { username: true } } },
  });
  res.json(shift);
});

// POST /api/shifts/open  { name: string }
router.post("/open", async (req, res) => {
  const companyId = req.user!.companyId;
  const { userId } = req.body; // ya no recibe "name"

  if (!userId) {
    return res.status(400).json({ error: "Debes indicar el usuario para el turno" });
  }

  const targetUser = await prisma.user.findFirst({ where: { id: userId, companyId } });
  if (!targetUser) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  const existing = await prisma.shift.findFirst({
    where: { companyId, status: "open", openedById: userId },
  });
  if (existing) {
    return res.status(400).json({
      error: `${targetUser.username} ya tiene un turno abierto.`,
    });
  }

  const name = await computeNextShiftName(companyId);

  const shift = await prisma.shift.create({
    data: { name, companyId, openedById: userId, status: "open" },
  });
  res.status(201).json(shift);
});

// GET /api/shifts/open  (turnos abiertos actualmente — para el admin)
router.get("/open", async (req, res) => {
  const companyId = req.user!.companyId;
  const shifts = await prisma.shift.findMany({
    where: { companyId, status: "open" },
    orderBy: { openedAt: "desc" },
    include: { openedBy: { select: { username: true } } },
  });
  res.json(shifts);
});

// PATCH /api/shifts/:id/close
router.patch("/:id/close", async (req, res) => {
  const companyId = req.user!.companyId;
  const userId = req.user!.id;
  const role = req.user!.role;
  const id = String(req.params.id);

  const shift = await prisma.shift.findFirst({ where: { id, companyId } });
  if (!shift) return res.status(404).json({ error: "Turno no encontrado" });
  if (shift.status === "closed") {
    return res.status(400).json({ error: "El turno ya está cerrado" });
  }
  if (shift.openedById !== userId && role !== "ADMIN") {
    return res.status(403).json({ error: "No puedes cerrar un turno que no es tuyo" });
  }

  const updated = await prisma.shift.update({
    where: { id },
    data: { status: "closed", closedAt: new Date(), closedById: userId },
  });
  res.json(updated);
});

// GET /api/shifts  (historial)
router.get("/", async (req, res) => {
  const companyId = req.user!.companyId;
  const shifts = await prisma.shift.findMany({
    where: { companyId },
    orderBy: { openedAt: "desc" },
    include: {
      openedBy: { select: { username: true } },
      closedBy: { select: { username: true } },
      _count: { select: { orders: true } },
    },
  });
  res.json(shifts);
});

// GET /api/shifts/:id  (detalle para el reporte del turno)
router.get("/:id", async (req, res) => {
  const companyId = req.user!.companyId;
  const id = String(req.params.id);

  const shift = await prisma.shift.findFirst({
    where: { id, companyId },
    include: {
      openedBy: { select: { username: true } },
      closedBy: { select: { username: true } },
      orders: {
        where: { invoiceNumber: { not: null } },
        include: { items: { include: { product: true } } },
      },
    },
  });
  if (!shift) return res.status(404).json({ error: "Turno no encontrado" });
  res.json(shift);
});

export default router;