// components/TableGroupCard.tsx
import { useState } from "react";
import { updateOrderStatus } from "../services/api";
import { mergeItems } from "../utils/mergeItems";
import type { Order, OrderItem } from "@restaurante/types";

interface Props {
  table: Order["table"];
  orders: Order[];
}

const nextStatus: Record<string, Order["status"]> = {
  in_progress: "ready",
  ready:       "delivered",
};

const actionLabel: Record<string, string> = {
  in_progress: "Marcar mesa lista",
  ready:       "Entregar mesa",
};

const buttonStyle: Record<string, string> = {
  in_progress: "bg-green-50 text-green-700 hover:bg-green-100",
  ready:       "bg-gray-100 text-gray-600 hover:bg-gray-200",
};

export default function TableGroupCard({ table, orders }: Props) {
  const [loading, setLoading] = useState(false);

  const status = orders[0].status;
  const allItems: OrderItem[] = mergeItems(orders.flatMap((o) => o.items));
  const total = allItems.reduce(
    (acc, i) => acc + Number(i.product.price) * i.quantity,
    0
  );

  async function handleAdvance() {
    const next = nextStatus[status];
    if (!next) return;
    setLoading(true);
    try {
      await Promise.all(orders.map((o) => updateOrderStatus(o.id, next)));
    } catch (error) {
      console.error("Error al actualizar órdenes de mesa:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 transition-colors">

      {/* Cabecera */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {table.label} — Mesa {table.number}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {orders.length} {orders.length === 1 ? "orden" : "órdenes"}
          </p>
        </div>
      </div>

      {/* Ítems agrupados de todas las órdenes de la mesa */}
      <ul className="space-y-2 mb-3">
        {allItems.map((item) => (
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

      {/* Total de la mesa */}
      <div className="flex justify-between text-xs text-gray-400 border-t border-gray-100 pt-2 mb-3">
        <span>Total mesa</span>
        <span className="font-medium text-gray-700">
          L. {total.toFixed(2)}
        </span>
      </div>

      {/* Botón — avanza TODAS las órdenes de la mesa */}
      {nextStatus[status] && (
        <button
          onClick={handleAdvance}
          disabled={loading}
          className={`
            w-full py-2.5 rounded-lg text-sm font-medium transition-opacity
            ${loading ? "opacity-50 cursor-not-allowed" : ""}
            ${buttonStyle[status]}
          `}
        >
          {loading ? "Actualizando..." : actionLabel[status]}
        </button>
      )}

    </div>
  );
}