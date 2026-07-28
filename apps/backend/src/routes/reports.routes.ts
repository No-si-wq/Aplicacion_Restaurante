// apps/backend/src/routes/reports.routes.ts
import { Router, Request, Response } from "express";
import { prisma } from "../db/client";

const router = Router();

// GET /api/reports/sales?from=2026-01-01&to=2026-01-31
router.get("/sales", async (req: Request, res: Response) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: "Params 'from' and 'to' are required (YYYY-MM-DD)" });
  }

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate   = new Date(`${to}T23:59:59.999Z`);

  // Solo órdenes completadas/entregadas
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: fromDate, lte: toDate },
      status: { in: ["completed", "delivered"] },
    },
    include: {
      table: true,
      items: {
        include: { product: true },
      },
    },
  });

  // Totales por orden
  const ordersWithTotal = orders.map((order) => {
    const total = order.items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0
    );
    return { ...order, total };
  });

  // Resumen global
  const totalRevenue = ordersWithTotal.reduce((sum, o) => sum + o.total, 0);
  const totalOrders  = ordersWithTotal.length;

  // Top productos
  const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  for (const order of ordersWithTotal) {
    for (const item of order.items) {
      const id = item.product.id;
      if (!productMap[id]) {
        productMap[id] = { name: item.product.name, quantity: 0, revenue: 0 };
      }
      productMap[id].quantity += item.quantity;
      productMap[id].revenue  += Number(item.product.price) * item.quantity;
    }
  }
  const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);

  res.json({ from, to, totalOrders, totalRevenue, topProducts, orders: ordersWithTotal });
});

export default router;