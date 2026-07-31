import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getOrders } from "../services/api";
import type { Order } from "@restaurante/types";

interface UseOrdersReturn {
  orders: Order[];
  isConnected: boolean;
}

export function useOrders(): UseOrdersReturn {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // 1. Cargar órdenes activas al montar
    getOrders({ status: "pending,in_progress,ready,delivered" })
      .then((data) => setOrders(data.filter((o) => !o.invoiceNumber)))
      .catch((err) => console.error("[useOrders] Error al cargar órdenes:", err));

    // 2. Conectar al servidor WebSocket
    const socket = io(import.meta.env.VITE_API_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[socket] Conectado:", socket.id);
      setIsConnected(true);
      socket.emit("join:kitchen");
    });

    socket.on("connect_error", (error) => {
      console.error("[socket] Error de conexión:", error.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("[socket] Desconectado:", reason);
      setIsConnected(false);
    });

    // 3. Nueva orden entrante — añadir al estado
    socket.on("order:new", (order: Order) => {
      setOrders((prev) => [order, ...prev]);
    });

    // 4. Orden actualizada — reemplazar en el estado
    socket.on("order:updated", (updated: Pick<Order, "id" | "status">) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === updated.id ? { ...o, status: updated.status } : o
        )
      );
    });

    // 6. Órdenes facturadas — retirarlas del estado en todos los clientes
    socket.on("order:billed", (orderIds: string[]) => {
      setOrders((prev) => prev.filter((o) => !orderIds.includes(o.id)));
    });

    // 5. Limpiar al desmontar el componente
    return () => {
      socket.disconnect();
    };
  }, []);

  return { orders, isConnected };
}