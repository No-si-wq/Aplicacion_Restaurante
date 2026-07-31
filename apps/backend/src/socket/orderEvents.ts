import { Server, Socket } from "socket.io";
import type { Order } from "@restaurante/types";

export function registerOrderEvents(io: Server, socket: Socket): void {
  // El cliente de cocina se une a su sala dedicada
  socket.on("join:kitchen", () => {
    socket.join("kitchen");
    console.log(`[socket] Cliente ${socket.id} unido a sala cocina`);
  });
}

// Emite una orden nueva a todos los clientes de cocina
export function emitOrderNew(io: Server, order: Order): void {
  io.to("kitchen").emit("order:new", order);
}

// Emite el cambio de estado a cocina y sala
export function emitOrderUpdated(
  io: Server,
  updated: Pick<Order, "id" | "status">
): void {
  io.emit("order:updated", updated);
}

export function emitOrdersBilled(io: Server, orderIds: string[]): void {
  io.emit("order:billed", orderIds);
}