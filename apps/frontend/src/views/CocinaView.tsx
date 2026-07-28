// views/CocinaView.tsx
import { useOrders } from "../hooks/useOrders";
import OrderCard from "../components/OrderCard";
import TableGroupCard from "../components/TableGroupCard";
import type { Order } from "@restaurante/types";

const columns: { status: Order["status"]; label: string }[] = [
  { status: "pending",     label: "Pendientes"     },
  { status: "in_progress", label: "En preparación" },
  { status: "ready",       label: "Listos"         },
];

export default function CocinaView() {
  const { orders, isConnected } = useOrders();

  const kitchenOrders = orders
    .map((order) => ({
      ...order,
      items: order.items.filter((item) => item.product.requiresKitchen),
    }))
    .filter((order) => order.items.length > 0);

  const grouped = columns.map((col) => ({
    ...col,
    orders: kitchenOrders.filter((o) => o.status === col.status),
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-4">

      {/* Barra superior */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-medium text-gray-900">Pantalla de cocina</h1>
        <span
          className={`text-xs px-3 py-1 rounded-full ${
            isConnected
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {isConnected ? "● En vivo" : "○ Desconectado"}
        </span>
      </header>

      {/* Kanban
          CAMBIO: en móvil se apilan verticalmente (grid-cols-1).
          En tablet (md ≥ 768 px) vuelven a las 3 columnas originales.
          Se agrega overflow-x-auto como red de seguridad en pantallas intermedias. */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
          {grouped.map((col) => (
            <section key={col.status}>

              {/* Cabecera de columna */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {col.label}
                </h2>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {col.status === "pending"
                    ? col.orders.length
                    : new Set(col.orders.map((o) => o.tableId)).size}
                </span>
              </div>

              {/* Tarjetas */}
              <div className="space-y-3">
                {col.orders.length === 0 ? (
                  <div className="text-center text-xs text-gray-300 py-10 border border-dashed border-gray-200 rounded-xl">
                    Sin órdenes
                  </div>
                ) : col.status === "pending" ? (
                  col.orders.map((order) => (
                    <OrderCard key={order.id} order={order} showActions />
                  ))
                ) : (
                  Object.values(
                    col.orders.reduce<Record<string, { table: Order["table"]; orders: Order[] }>>(
                      (acc, order) => {
                        if (!acc[order.tableId]) {
                          acc[order.tableId] = { table: order.table, orders: [] };
                        }
                        acc[order.tableId].orders.push(order);
                        return acc;
                      },
                      {}
                    )
                  ).map((group) => (
                    <TableGroupCard
                      key={group.table.id}
                      table={group.table}
                      orders={group.orders}
                    />
                  ))
                )}
              </div>

            </section>
          ))}
        </div>
      </div>

    </div>
  );
}