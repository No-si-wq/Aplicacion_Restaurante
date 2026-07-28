// components/OrderCard.tsx
import { useState } from "react";
import { updateOrderStatus } from "../services/api";
import StatusBadge from "./StatusBadge";
import type { Order } from "@restaurante/types";

interface OrderCardProps {
  order: Order;
  showActions?: boolean;
}

const nextStatus: Record<string, Order["status"]> = {
  pending:     "in_progress",
  in_progress: "ready",
  ready:       "delivered",
};

const actionLabel: Record<string, string> = {
  pending:     "Iniciar preparación",
  in_progress: "Marcar como listo",
  ready:       "Entregar",
};

export default function OrderCard({
  order,
  showActions = false,
}: OrderCardProps) {
  const [loading, setLoading] = useState(false);

  const isUrgent =
    order.status === "pending" &&
    Date.now() - new Date(order.createdAt).getTime() > 10 * 60 * 1000;

  async function handleAdvance() {
    const next = nextStatus[order.status];
    if (!next) return;
    setLoading(true);
    try {
      await updateOrderStatus(order.id, next);
    } catch (error) {
      console.error("Error al actualizar orden:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`
        bg-white rounded-xl border p-4 transition-colors
        ${isUrgent ? "border-l-4 border-l-red-400 border-gray-200" : "border-gray-200"}
      `}
    >
      {/* Cabecera */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {order.table.label} — Mesa {order.table.number}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(order.createdAt).toLocaleTimeString("es-HN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Ítems */}
      <ul className="space-y-2 mb-3">
        {order.items.map((item) => (
          <li
            key={item.id}
            className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-none last:pb-0"
          >
            <div>
              <span className="font-medium text-gray-800 mr-2">
                {item.quantity}x
              </span>
              <span className="text-gray-700">{item.product.name}</span>
              {item.notes && (
                <p className="text-xs text-amber-600 mt-0.5">{item.notes}</p>
              )}
            </div>
            <span className="text-xs text-gray-400">
              L. {(Number(item.product.price) * item.quantity).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>

      {/* Total */}
      <div className="flex justify-between text-xs text-gray-400 border-t border-gray-100 pt-2 mb-3">
        <span>Total</span>
        <span className="font-medium text-gray-700">
          L.{" "}
          {order.items
            .reduce(
              (acc, i) => acc + Number(i.product.price) * i.quantity,
              0
            )
            .toFixed(2)}
        </span>
      </div>

      {/* Botón de acción — solo en vista de cocina */}
      {showActions && nextStatus[order.status] && (
        <button
          onClick={handleAdvance}
          disabled={loading}
          className={`
            w-full py-2.5 rounded-lg text-sm font-medium transition-opacity
            ${loading ? "opacity-50 cursor-not-allowed" : ""}
            ${order.status === "pending"     ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : ""}
            ${order.status === "in_progress" ? "bg-green-50 text-green-700 hover:bg-green-100" : ""}
            ${order.status === "ready"       ? "bg-gray-100 text-gray-600 hover:bg-gray-200"   : ""}
          `}
        >
          {loading ? "Actualizando..." : actionLabel[order.status]}
        </button>
      )}
    </div>
  );
}