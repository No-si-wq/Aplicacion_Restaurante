// routes/tables.routes.ts
import { Router } from "express";
import { prisma } from "../db/client";
import type { Server } from "socket.io";
import { toSharedOrder } from "./orders.routes";
import { emitOrdersBilled } from "../socket/orderEvents";
import { requireAuth } from "../middleware/auth.middleware";

export function tablesRouter(io: Server): Router {
  const router = Router();

  // GET /tables — listar todas
  router.get("/", requireAuth, async (req, res) => {
    try {
      const tables = await prisma.table.findMany({
        where: { companyId: req.user!.companyId },
        orderBy: { number: "asc" },
      });
      res.json(tables);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener mesas" });
    }
  });

  // POST /tables — crear mesa
  router.post("/", requireAuth, async (req, res) => {
    const { number, label } = req.body;

    if (!number || !label) {
      return res.status(400).json({ error: "number y label son requeridos" });
    }

    try {
      const existing = await prisma.table.findFirst({ where: { number, companyId: req.user!.companyId } });
      if (existing) {
        return res.status(409).json({ error: `La mesa ${number} ya existe` });
      }

      const table = await prisma.table.create({
        data: { number, label, status: "free", companyId: req.user!.companyId },
      });
      res.status(201).json(table);
    } catch (error) {
      res.status(500).json({ error: "Error al crear la mesa" });
    }
  });

  // PATCH /tables/reservations/:reservationId/status — confirmar o cancelar
  router.patch("/reservations/:reservationId/status", requireAuth, async (req, res) => {
    const { status } = req.body;
    const reservationId = String(req.params.reservationId);
    const validStatuses = ["pending", "confirmed", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Estado inválido" });
    }

    try {
      const result = await prisma.reservation.updateMany({
        where: { 
          id: reservationId,
          table: { companyId: req.user!.companyId },
        },
        data: { status },
      });

    if (result.count === 0) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });
      res.json(reservation);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar la reserva" });
    }
  });

  // PATCH /tables/:id/status
  router.patch("/:id/status", requireAuth, async (req, res) => {
    const { status } = req.body;
    const validStatuses = ["free", "occupied", "billed", "reserved"];
    const tableId = String(req.params.id);

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Estado inválido" });
    }

    try {
      if (status === "billed") {
        const activeOrders = await prisma.order.findMany({
          where: { tableId, invoiceNumber: null, companyId: req.user!.companyId },
        });

        if (activeOrders.length === 0) {
          return res.status(409).json({ error: "La mesa no tiene órdenes activas para facturar" });
        }

        const userId = req.user!.id;

        const result = await prisma.$transaction(async (tx) => {
          const cai = await tx.cai.findFirst({
            where: { 
              userId, 
              companyId: req.user!.companyId,
              isActive: true, 
              limitDate: { gte: new Date() },
            },
          });

          if (!cai) throw new Error("NO_CAI");
          if (cai.currentNumber >= cai.rangeEnd) throw new Error("CAI_AGOTADO");

          const nextNumber = cai.currentNumber + 1;

          await tx.cai.update({
            where: { id: cai.id },
            data: { currentNumber: nextNumber },
          });

          await tx.order.updateMany({
            where: { id: { in: activeOrders.map((o) => o.id) } },
            data: { caiId: cai.id, invoiceNumber: nextNumber, status: "delivered" },
          });

          const table = await tx.table.update({
            where: { id: tableId },
            data: { status },
          });
          const billedOrders = await tx.order.findMany({
            where: { id: { in: activeOrders.map((o) => o.id) } },
            include: {
              items: { include: { product: { include: { category: true } } } },
              table: true,
              cai: true,
            },
          });

          return { table, orders: billedOrders.map(toSharedOrder) };
        });

        emitOrdersBilled(io, result.orders.map((o) => o.id));

        return res.json(result);
      }

      const result = await prisma.table.updateMany({
        where: { id: tableId, companyId: req.user!.companyId },
        data: { status },
      });
      if (result.count === 0) {
        return res.status(404).json({ error: "Mesa no encontrada" });
      }
      const table = await prisma.table.findUnique({ where: { id: tableId } });
      res.json(table);
    } catch (error) {
      if (error instanceof Error && error.message === "NO_CAI") {
        return res.status(409).json({ error: "El usuario no tiene un CAI activo o vigente" });
      }
      if (error instanceof Error && error.message === "CAI_AGOTADO") {
        return res.status(409).json({ error: "El rango de CAI está agotado" });
      }
      res.status(500).json({ error: "Error al actualizar la mesa" });
    }
  });

  // GET /tables/:id/reservations — listar reservas de una mesa
  router.get("/:id/reservations", requireAuth, async (req, res) => {
    const tableId = String(req.params.id);
    try {
      const reservations = await prisma.reservation.findMany({
        where: { tableId, table: { companyId: req.user!.companyId } },
        orderBy: { date: "asc" },
      });
      res.json(reservations);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener reservas" });
    }
  });

  // POST /tables/:id/reservations — crear reserva
  router.post("/:id/reservations", requireAuth, async (req, res) => {
    const { name, date, partySize, notes } = req.body;
    const tableId = String(req.params.id);

    if (!name || !date || !partySize) {
      return res.status(400).json({ error: "name, date y partySize son requeridos" });
    }

    try {
      const table = await prisma.table.findFirst({ 
        where: { id: tableId, companyId: req.user!.companyId }, 
      });
      if (!table) {
        return res.status(404).json({ error: "Mesa no encontrada" });
      }

      // Verificar que no haya otra reserva confirmada en el mismo horario (±2 horas)
      const reservationDate = new Date(date);
      const conflict = await prisma.reservation.findFirst({
        where: {
          tableId,
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
        data: { tableId, name, date: reservationDate, partySize, notes },
      });

      res.status(201).json(reservation);
    } catch (error) {
      res.status(500).json({ error: "Error al crear la reserva" });
    }
  });

  // DELETE /tables/:id
  router.delete("/:id", requireAuth, async (req, res) => {
    const tableId = String(req.params.id);
    try {
      const activeOrders = await prisma.order.count({
        where: {
          tableId,
          invoiceNumber: null,
        },
      });

      if (activeOrders > 0) {
        return res.status(409).json({
          error: "No se puede eliminar una mesa con órdenes activas",
        });
      }

      await prisma.table.delete({ 
        where: { id: tableId, companyId: req.user!.companyId }, 
      });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar la mesa" });
    }
  });

  return router;
}