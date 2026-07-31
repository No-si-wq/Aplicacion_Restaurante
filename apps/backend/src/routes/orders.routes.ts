import { Router } from "express";
import { prisma } from "../db/client";
import { emitOrderNew, emitOrderUpdated } from "../socket/orderEvents";
import type { Server } from "socket.io";
import type { Order, OrderStatus, TableStatus, Cai } from "@restaurante/types";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "../middleware/auth.middleware";

const ORDER_STATUSES: OrderStatus[] = ["pending", "in_progress", "ready", "delivered"];
const TABLE_STATUSES: TableStatus[] = ["free", "occupied", "billed", "reserved"];

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && ORDER_STATUSES.includes(value as OrderStatus);
}

export function toOrderStatus(value: string): OrderStatus {
  if (!isOrderStatus(value)) {
    throw new Error(`Unexpected order status: ${value}`);
  }

  return value;
}

function toTableStatus(value: string): TableStatus {
  if (!TABLE_STATUSES.includes(value as TableStatus)) {
    throw new Error(`Unexpected table status: ${value}`);
  }

  return value as TableStatus;
}

type PrismaOrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    items: { include: { product: { include: { category: true } } } };
    table: true;
    cai: true;
  };
}>;

export function toSharedOrder(order: PrismaOrderWithRelations): Order {
  const shared: Order = {
    id: order.id,
    tableId: order.tableId,
    status: toOrderStatus(order.status),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    table: {
      id: order.table.id,
      number: order.table.number,
      label: order.table.label,
      status: toTableStatus(order.table.status),
    },
    items: order.items.map((item) => {
      const category =
        item.product.category ?? {
          id: item.product.categoryId ?? "",
          name: "Sin categoria",
        };

      const mappedItem: Order["items"][number] = {
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          categoryId: item.product.categoryId ?? category.id,
          requiresKitchen: item.product.requiresKitchen,
          category: {
            id: category.id,
            name: category.name,
          },
          price: item.product.price.toNumber(),
          available: item.product.available,
        },
      };

      if (item.product.imageUrl !== null) {
        mappedItem.product.imageUrl = item.product.imageUrl;
      }

      if (item.notes !== null) {
        mappedItem.notes = item.notes;
      }

      return mappedItem;
    }),
  };

  if (order.invoiceNumber !== null) {
    shared.invoiceNumber = order.invoiceNumber;
  }

  if (order.cai !== null) {
    const cai: Cai = {
      id: order.cai.id,
      code: order.cai.code,
      establishment: order.cai.establishment,
      pointOfSale: order.cai.pointOfSale,
      documentType: order.cai.documentType,
      rangeStart: order.cai.rangeStart,
      rangeEnd: order.cai.rangeEnd,
      limitDate: order.cai.limitDate.toISOString(),
    };
    shared.cai = cai;
  }

  return shared;
}

export function ordersRouter(io: Server): Router {
  const router = Router();

  // GET /orders - listar órdenes activas
  router.get("/", requireAuth, async (req, res) => {
    try {
      const { status } = req.query;

      const statusFilter = status
        ? (status as string).split(",").filter(isOrderStatus)
        : undefined;

      const listOrdersArgs = {
        where: {
          companyId: req.user!.companyId,
          ...(statusFilter?.length ? { status: { in: statusFilter } } : {}),
        },
        include: {
          items: { include: { product: { include: { category: true } } } },
          table: true,
          cai: true,
        },
        orderBy: { createdAt: "asc" },
      } satisfies Prisma.OrderFindManyArgs;

      const orders = await prisma.order.findMany(listOrdersArgs);

      res.json(orders.map(toSharedOrder));
    } catch (error) {
      console.error("[GET /orders]", error);
      res.status(500).json({ error: "Error al obtener órdenes" });
    }
  });

// GET /orders/invoices - listar facturas emitidas (consulta y reimpresión)
  router.get("/invoices", requireAuth, async (req, res) => {
    try {
      const { from, to, search } = req.query;
      const companyId = req.user!.companyId;

      const where: Prisma.OrderWhereInput = {
        companyId,
        invoiceNumber: { not: null },
      };

      if (from || to) {
        where.updatedAt = {
          ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
          ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
        };
      }

      const orders = await prisma.order.findMany({
        where,
        include: {
          items: { include: { product: { include: { category: true } } } },
          table: true,
          cai: true,
        },
        orderBy: { updatedAt: "desc" },
      });

      // Agrupar por caiId+invoiceNumber (una factura puede tener varias órdenes de la misma mesa)
      const groups = new Map<string, PrismaOrderWithRelations[]>();
      for (const order of orders) {
        const key = `${order.caiId}-${order.invoiceNumber}`;
        const list = groups.get(key) ?? [];
        list.push(order);
        groups.set(key, list);
      }

      let invoices = Array.from(groups.values()).map((group) => {
        const sharedOrders = group.map(toSharedOrder);
        const first = sharedOrders[0];
        const subtotal = sharedOrders.reduce(
          (sum, o) => sum + o.items.reduce((s, i) => s + i.product.price * i.quantity, 0),
          0
        );
        const billedAt = group
          .reduce((latest, o) => (o.updatedAt > latest ? o.updatedAt : latest), new Date(0))
          .toISOString();

        return {
          caiId: first?.cai?.id ?? "",
          invoiceNumber: first?.invoiceNumber!,
          formattedNumber:
            first?.cai && first.invoiceNumber
              ? `${first.cai.establishment}-${first.cai.pointOfSale}-${first.cai.documentType}-${String(first.invoiceNumber).padStart(8, "0")}`
              : "Sin factura",
          table: first?.table,
          billedAt,
          orders: sharedOrders,
          total: Number((subtotal * 1.15).toFixed(2)),
        };
      });

      if (search) {
        const term = (search as string).toLowerCase();
        invoices = invoices.filter(
          (inv) =>
            inv.formattedNumber.toLowerCase().includes(term) ||
            inv.table?.label.toLowerCase().includes(term) ||
            inv.table?.number.toLowerCase().includes(term)
        );
      }

      invoices.sort((a, b) => (a.billedAt < b.billedAt ? 1 : -1));

      res.json(invoices);
    } catch (error) {
      console.error("[GET /orders/invoices]", error);
      res.status(500).json({ error: "Error al obtener facturas" });
    }
  });

  // POST /orders - create order and notify kitchen
  router.post("/", requireAuth, async (req, res) => {
    const { tableId, items } = req.body;
    const companyId = req.user!.companyId;

    if (!tableId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "tableId e items son requeridos" });
    }

    try {

      const table = await prisma.table.findFirst({
        where: { id: tableId, companyId },
      });
      if (!table) {
        return res.status(404).json({ error: "Mesa no encontrada" });
      }

      const productIds: string[] = items.map(
        (item: { productId: string }) => item.productId
      );
      const uniqueProductIds = [...new Set(productIds)];

      const validProducts = await prisma.product.findMany({
        where: { id: { in: uniqueProductIds }, companyId },
        select: { id: true },
      });

      if (validProducts.length !== uniqueProductIds.length) {
        return res.status(400).json({ error: "Uno o más productos no son válidos" });
      }

      const order = await prisma.order.create({
        data: {
          tableId,
          companyId,
          status: "pending",
          items: {
            create: items.map((item: { productId: string; quantity: number; notes?: string }) => ({
              productId: item.productId,
              quantity: item.quantity,
              notes: item.notes ?? null,
            })),
          },
        },
        include: {
          items: { include: { product: { include: { category: true } } } },
          table: true,
          cai: true,
        },
      });

      // Set table as occupied
      await prisma.table.update({
        where: { id: tableId },
        data: { status: "occupied" },
      });

      const sharedOrder = toSharedOrder(order);

      // Notify kitchen in real time
      emitOrderNew(io, sharedOrder);

      res.status(201).json(sharedOrder);
    } catch (error) {
      console.error("[POST /orders]", error);
      res.status(500).json({ error: "Error al crear la orden" });
    }
  });

  // PATCH /orders/:id/status - update status
  router.patch("/:id/status", requireAuth, async (req, res) => {
    const id = String(req.params.id);
    const { status } = req.body;
    const companyId = req.user!.companyId;

    if (!isOrderStatus(status)) {
      return res.status(400).json({ error: "Estado invalido" });
    }

    try {
      const result = await prisma.order.updateMany({
        where: { id, companyId },
        data: { status, updatedAt: new Date() },
      });

      if (result.count === 0) {
        return res.status(404).json({ error: "Orden no encontrada" });
      }

      const order = await prisma.order.findUniqueOrThrow({ where: { id } });

      // If delivered, free table when there are no other active orders
      if (status === "delivered") {
        const pendingOrders = await prisma.order.count({
          where: {
            tableId: order.tableId,
            companyId,
            status: { not: "delivered" },
          },
        });

        if (pendingOrders === 0) {
          await prisma.table.update({
            where: { id: order.tableId },
            data: { status: "free" },
          });
        }
      }

      // Notify all connected clients
      emitOrderUpdated(io, { id: order.id, status });

      const fullOrder = await prisma.order.findUniqueOrThrow({
        where: { id },
        include: {
          items: { include: { product: { include: { category: true } } } },
          table: true,
          cai: true,
        },
      });
      res.json(toSharedOrder(fullOrder));
    } catch (error) {
      console.error("[PATCH /orders/:id/status]", error);
      res.status(500).json({ error: "Error al actualizar el estado" });
    }
  });

  return router;
}
