import { Router } from "express";
import { prisma } from "../db/client";
import { emitOrderNew, emitOrderUpdated } from "../socket/orderEvents";
import type { Server } from "socket.io";
import type { Order, OrderStatus, TableStatus, Cai } from "@restaurante/types";
import type { Prisma } from "@prisma/client";

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
  router.get("/", async (req, res) => {
    try {
      const { status } = req.query;

      const statusFilter = status
        ? (status as string).split(",").filter(isOrderStatus)
        : undefined;

      const listOrdersArgs = {
        ...(statusFilter?.length ? { where: { status: { in: statusFilter } } } : {}),
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

  // POST /orders - create order and notify kitchen
  router.post("/", async (req, res) => {
    const { tableId, items } = req.body;

    try {
      const order = await prisma.order.create({
        data: {
          tableId,
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
  router.patch("/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!isOrderStatus(status)) {
      return res.status(400).json({ error: "Estado invalido" });
    }

    try {
      const order = await prisma.order.update({
        where: { id },
        data: { status, updatedAt: new Date() },
      });

      // If delivered, free table when there are no other active orders
      if (status === "delivered") {
        const pendingOrders = await prisma.order.count({
          where: {
            tableId: order.tableId,
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
