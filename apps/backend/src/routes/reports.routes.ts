// apps/backend/src/routes/reports.routes.ts
import { Router, Request, Response } from "express";
import { prisma } from "../db/client";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// GET /api/reports/sales?from=2026-01-01&to=2026-01-31
router.get("/sales", requireAuth, async (req: Request, res: Response) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: "Params 'from' and 'to' are required (YYYY-MM-DD)" });
  }

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate   = new Date(`${to}T23:59:59.999Z`);
  const ISV_RATE = 0.15;

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: fromDate, lte: toDate },
      companyId: req.user!.companyId,
      status: { in: ["completed", "delivered"] },
      invoiceNumber: { not: null },
    },
    include: {
      table: true,
      items: { include: { product: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  type DayBucket = {
    date: string;
    orders: { invoiceNumber: number; tableLabel: string; importe: number; isv: number; total: number }[];
  };

  const dayMap: Record<string, DayBucket> = {};

  for (const order of orders) {
    const importe = order.items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0
    );
    const isv = Number((importe * ISV_RATE).toFixed(2));
    const total = Number((importe + isv).toFixed(2));

    const dayKey = order.createdAt.toISOString().slice(0, 10);
    if (!dayMap[dayKey]) dayMap[dayKey] = { date: dayKey, orders: [] };

    dayMap[dayKey].orders.push({
      invoiceNumber: order.invoiceNumber!,
      tableLabel: order.table.label,
      importe: Number(importe.toFixed(2)),
      isv,
      total,
    });
  }

  const salesByDay = Object.values(dayMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => {
      const subtotal = day.orders.reduce(
        (acc, o) => ({
          importe: acc.importe + o.importe,
          isv: acc.isv + o.isv,
          total: acc.total + o.total,
        }),
        { importe: 0, isv: 0, total: 0 }
      );
      return { ...day, subtotal };
    });

  const grandTotal = salesByDay.reduce(
    (acc, day) => ({
      importe: acc.importe + day.subtotal.importe,
      isv: acc.isv + day.subtotal.isv,
      total: acc.total + day.subtotal.total,
    }),
    { importe: 0, isv: 0, total: 0 }
  );

  res.json({ from, to, salesByDay, grandTotal });
});

// GET /api/reports/products?from=2026-01-01&to=2026-01-31
router.get("/products", requireAuth, async (req: Request, res: Response) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: "Params 'from' and 'to' are required (YYYY-MM-DD)" });
  }

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate   = new Date(`${to}T23:59:59.999Z`);
  const ISV_RATE = 0.15;

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: fromDate, lte: toDate },
      companyId: req.user!.companyId,
      status: { in: ["completed", "delivered"] },
      invoiceNumber: { not: null },
    },
    include: {
      items: { include: { product: { include: { category: true } } } },
    },
  });

  type ProductBucket = {
    productId: string;
    productName: string;
    categoryName: string;
    quantity: number;
    importe: number;
  };

  const productMap: Record<string, ProductBucket> = {};

  for (const order of orders) {
    for (const item of order.items) {
      const key = item.productId;
      if (!productMap[key]) {
        productMap[key] = {
          productId: key,
          productName: item.product.name,
          categoryName: item.product.category?.name ?? "Sin categoría",
          quantity: 0,
          importe: 0,
        };
      }
      productMap[key].quantity += item.quantity;
      productMap[key].importe += Number(item.product.price) * item.quantity;
    }
  }

  const products = Object.values(productMap)
    .map((p) => {
      const isv = Number((p.importe * ISV_RATE).toFixed(2));
      const total = Number((p.importe + isv).toFixed(2));
      return { ...p, importe: Number(p.importe.toFixed(2)), isv, total };
    })
    .sort((a, b) => b.quantity - a.quantity);

  const grandTotal = products.reduce(
    (acc, p) => ({
      quantity: acc.quantity + p.quantity,
      importe: acc.importe + p.importe,
      isv: acc.isv + p.isv,
      total: acc.total + p.total,
    }),
    { quantity: 0, importe: 0, isv: 0, total: 0 }
  );

  res.json({ from, to, products, grandTotal });
});

export default router;