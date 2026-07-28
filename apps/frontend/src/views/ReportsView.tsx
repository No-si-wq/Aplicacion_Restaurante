// apps/frontend/src/views/ReportsView.tsx
import { useState } from "react";
import { getSalesReport, type SalesReport } from "../services/api";

export default function ReportsView() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom]       = useState(today);
  const [to, setTo]           = useState(today);
  const [data, setData]       = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const fetchReport = async () => {
    setLoading(true); setError("");
    try {
      const report = await getSalesReport(from, to);
      setData(report);
    } catch {
      setError("Error al obtener el reporte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">Reporte de Ventas</h1>

      {/* Controles de fecha
          CAMBIO: flex-col en móvil → flex-row desde sm */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end mb-6">
        <label className="flex flex-col gap-1 text-sm">
          Desde
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Hasta
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded px-2 py-1.5"
          />
        </label>
        {/* CAMBIO: w-full en móvil, ancho automático desde sm */}
        <button
          onClick={fetchReport}
          className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Cargando..." : "Generar"}
        </button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {data && (
        <div className="space-y-6">

          {/* Resumen
              CAMBIO: grid-cols-1 en móvil, 2 columnas desde sm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border rounded p-4">
              <p className="text-sm text-gray-500">Órdenes completadas</p>
              <p className="text-3xl font-bold">{data.totalOrders}</p>
            </div>
            <div className="border rounded p-4">
              <p className="text-sm text-gray-500">Ingresos totales</p>
              <p className="text-3xl font-bold">
                L. {Number(data.totalRevenue).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Top productos
              CAMBIO: overflow-x-auto para que la tabla no rompa en móvil */}
          <div>
            <h2 className="font-semibold mb-2">Productos más vendidos</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="p-2">Producto</th>
                    <th className="p-2 text-right">Cantidad</th>
                    <th className="p-2 text-right">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProducts.map((p) => (
                    <tr key={p.name} className="border-t">
                      <td className="p-2">{p.name}</td>
                      <td className="p-2 text-right">{p.quantity}</td>
                      <td className="p-2 text-right">L. {p.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}