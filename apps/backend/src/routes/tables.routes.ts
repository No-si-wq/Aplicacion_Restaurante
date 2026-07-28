// routes/tables.routes.ts
import { Router } from "express";
import { prisma } from "../db/client";

export const tablesRouter = Router();

// GET /tables — listar todas
tablesRouter.get("/", async (req, res) => {
  try {
    const tables = await prisma.table.findMany({
      orderBy: { number: "asc" },
    });
    res.json(tables);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener mesas" });
  }
});

// POST /tables — crear mesa
tablesRouter.post("/", async (req, res) => {
  const { number, label } = req.body;

  if (!number || !label) {
    return res.status(400).json({ error: "number y label son requeridos" });
  }

  try {
    const existing = await prisma.table.findFirst({ where: { number } });
    if (existing) {
      return res.status(409).json({ error: `La mesa ${number} ya existe` });
    }

    const table = await prisma.table.create({
      data: { number, label, status: "free" },
    });
    res.status(201).json(table);
  } catch (error) {
    res.status(500).json({ error: "Error al crear la mesa" });
  }
});

// PATCH /tables/reservations/:reservationId/status — confirmar o cancelar
tablesRouter.patch("/reservations/:reservationId/status", async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["pending", "confirmed", "cancelled"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Estado inválido" });
  }

  try {
    const reservation = await prisma.reservation.update({
      where: { id: req.params.reservationId },
      data: { status },
    });
    res.json(reservation);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar la reserva" });
  }
});

// PATCH /tables/:id/status
tablesRouter.patch("/:id/status", async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["free", "occupied", "billed", "reserved"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Estado inválido" });
  }

  try {
    const table = await prisma.table.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(table);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar la mesa" });
  }
});

// GET /tables/:id/reservations — listar reservas de una mesa
tablesRouter.get("/:id/reservations", async (req, res) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: { tableId: req.params.id },
      orderBy: { date: "asc" },
    });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener reservas" });
  }
});

// POST /tables/:id/reservations — crear reserva
tablesRouter.post("/:id/reservations", async (req, res) => {
  const { name, date, partySize, notes } = req.body;

  if (!name || !date || !partySize) {
    return res.status(400).json({ error: "name, date y partySize son requeridos" });
  }

  try {
    const table = await prisma.table.findUnique({ where: { id: req.params.id } });
    if (!table) {
      return res.status(404).json({ error: "Mesa no encontrada" });
    }

    // Verificar que no haya otra reserva confirmada en el mismo horario (±2 horas)
    const reservationDate = new Date(date);
    const conflict = await prisma.reservation.findFirst({
      where: {
        tableId: req.params.id,
        status: { not: "cancelled" },
        date: {
          gte: new Date(reservationDate.getTime() - 2 * 60 * 60 * 1000),
          lte: new Date(reservationDate.getTime() + 2 * 60 * 60 * 1000),
        },
      },
    });

    if (conflict) {
      return res.status(409).json({ error: "La mesa ya tiene una reserva en ese horario" });
    }

    const reservation = await prisma.reservation.create({
      data: { tableId: req.params.id, name, date: reservationDate, partySize, notes },
    });

    res.status(201).json(reservation);
  } catch (error) {
    res.status(500).json({ error: "Error al crear la reserva" });
  }
});

// DELETE /tables/:id
tablesRouter.delete("/:id", async (req, res) => {
  try {
    const activeOrders = await prisma.order.count({
      where: {
        tableId: req.params.id,
        status: { not: "delivered" },
      },
    });

    if (activeOrders > 0) {
      return res.status(409).json({
        error: "No se puede eliminar una mesa con órdenes activas",
      });
    }

    await prisma.table.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar la mesa" });
  }
});