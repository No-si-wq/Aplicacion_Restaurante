// apps/frontend/src/views/ReportsView.tsx
import { useEffect, useState } from "react"; // useEffect agregado
import type { Shift } from "@restaurante/types"; // NUEVO
import {
  getSalesReport, getProductsReport,
  getSalesReportByShift, getProductsReportByShift, // NUEVO
  getShifts, // NUEVO
  type SalesReport, type ProductsSalesReport,
} from "../services/api";
import { exportToExcel, exportToPDF } from "../utils/exportReport";

export default function ReportsView() {
  const today = new Date().toISOString().slice(0, 10);
  const [tab, setTab] = useState<"ventas" | "productos">("ventas");
  const [mode, setMode] = useState<"fechas" | "turno">("fechas"); // NUEVO
  const [shifts, setShifts] = useState<Shift[]>([]); // NUEVO
  const [selectedShift, setSelectedShift] = useState(""); // NUEVO
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<SalesReport | null>(null);
  const [productsData, setProductsData] = useState<ProductsSalesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { // NUEVO
    getShifts().then(setShifts).catch(() => {});
  }, []);

  const fetchReport = async () => {
    setLoading(true); setError("");
    try {
      if (mode === "turno" && !selectedShift) {
        setError("Selecciona un turno");
        return;
      }
      if (tab === "ventas") {
        const report = mode === "turno"
          ? await getSalesReportByShift(selectedShift)
          : await getSalesReport(from, to);
        setData(report);
      } else {
        const report = mode === "turno"
          ? await getProductsReportByShift(selectedShift)
          : await getProductsReport(from, to);
        setProductsData(report);
      }
    } catch {
      setError("Error al obtener el reporte");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (tab === "ventas" && data) {
      const rows: (string | number)[][] = [];
      data.salesByDay.forEach((day) => {
        day.orders.forEach((o) => {
          rows.push([day.date, o.invoiceNumber, o.tableLabel, o.importe, o.isv, o.total]);
        });
        rows.push(["", "Subtotal del día", "", day.subtotal.importe, day.subtotal.isv, day.subtotal.total]);
      });
      rows.push(["", "TOTAL GENERAL", "", data.grandTotal.importe, data.grandTotal.isv, data.grandTotal.total]);
      exportToExcel(
        `reporte-ventas_${from}_${to}.xlsx`,
        "Ventas",
        ["Fecha", "# Factura", "Mesa", "Importe", "ISV", "Total"],
        rows
      );
    } else if (tab === "productos" && productsData) {
      const rows = productsData.products.map((p) => [
        p.productName, p.categoryName, p.quantity, p.importe, p.isv, p.total,
      ]);
      rows.push(["TOTAL GENERAL", "", productsData.grandTotal.quantity, productsData.grandTotal.importe, productsData.grandTotal.isv, productsData.grandTotal.total]);
      exportToExcel(
        `reporte-productos_${from}_${to}.xlsx`,
        "Productos",
        ["Producto", "Categoría", "Cantidad", "Importe", "ISV", "Total"],
        rows
      );
    }
  };

  const handleExportPDF = () => {
    if (tab === "ventas" && data) {
      const rows: (string | number)[][] = [];
      data.salesByDay.forEach((day) => {
        day.orders.forEach((o) => {
          rows.push([day.date, o.invoiceNumber, o.tableLabel, `L. ${o.importe.toFixed(2)}`, `L. ${o.isv.toFixed(2)}`, `L. ${o.total.toFixed(2)}`]);
        });
        rows.push(["", "Subtotal del día", "", `L. ${day.subtotal.importe.toFixed(2)}`, `L. ${day.subtotal.isv.toFixed(2)}`, `L. ${day.subtotal.total.toFixed(2)}`]);
      });
      rows.push(["", "TOTAL GENERAL", "", `L. ${data.grandTotal.importe.toFixed(2)}`, `L. ${data.grandTotal.isv.toFixed(2)}`, `L. ${data.grandTotal.total.toFixed(2)}`]);
      exportToPDF(
        `reporte-ventas_${from}_${to}.pdf`,
        `Reporte de Ventas (${from} a ${to})`,
        ["Fecha", "# Factura", "Mesa", "Importe", "ISV", "Total"],
        rows
      );
    } else if (tab === "productos" && productsData) {
      const rows = productsData.products.map((p) => [
        p.productName, p.categoryName, p.quantity, `L. ${p.importe.toFixed(2)}`, `L. ${p.isv.toFixed(2)}`, `L. ${p.total.toFixed(2)}`,
      ]);
      rows.push(["TOTAL GENERAL", "", productsData.grandTotal.quantity, `L. ${productsData.grandTotal.importe.toFixed(2)}`, `L. ${productsData.grandTotal.isv.toFixed(2)}`, `L. ${productsData.grandTotal.total.toFixed(2)}`]);
      exportToPDF(
        `reporte-productos_${from}_${to}.pdf`,
        `Reporte de Productos Vendidos (${from} a ${to})`,
        ["Producto", "Categoría", "Cantidad", "Importe", "ISV", "Total"],
        rows
      );
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold mb-4">Reportes</h1>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
        <button
          onClick={() => setTab("ventas")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "ventas" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Ventas
        </button>
        <button
          onClick={() => setTab("productos")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "productos" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Productos
        </button>
      </div>



      {/* Controles de fecha
          CAMBIO: flex-col en móvil → flex-row desde sm */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-4 w-fit">
        <button
          onClick={() => setMode("fechas")}
          className={`px-3 py-1 rounded-md text-sm ${mode === "fechas" ? "bg-white shadow-sm" : "text-gray-500"}`}
        >
          Por fechas
        </button>
        <button
          onClick={() => setMode("turno")}
          className={`px-3 py-1 rounded-md text-sm ${mode === "turno" ? "bg-white shadow-sm" : "text-gray-500"}`}
        >
          Por turno
        </button>
      </div>

      {mode === "fechas" ? (
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
          <button onClick={fetchReport} className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            {loading ? "Cargando..." : "Generar"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end mb-6">
          <label className="flex flex-col gap-1 text-sm">
            Turno
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="border rounded px-2 py-1.5"
            >
              <option value="">Selecciona un turno</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {new Date(s.openedAt).toLocaleDateString("es-HN")} ({s.status === "open" ? "abierto" : "cerrado"})
                </option>
              ))}
            </select>
          </label>
          <button onClick={fetchReport} className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            {loading ? "Cargando..." : "Generar"}
          </button>
        </div>
      )}

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {((tab === "ventas" && data) || (tab === "productos" && productsData)) && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleExportExcel}
            className="text-sm px-3 py-1.5 rounded border border-green-600 text-green-700 hover:bg-green-50"
          >
            Exportar Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="text-sm px-3 py-1.5 rounded border border-red-600 text-red-700 hover:bg-red-50"
          >
            Exportar PDF
          </button>
        </div>
      )}

      {tab === "ventas" && data && (
        <div className="space-y-8">
          {data.salesByDay.map((day) => (
            <div key={day.date}>
              <h2 className="font-semibold mb-2">
                {new Date(day.date + "T00:00:00").toLocaleDateString("es-HN", {
                  weekday: "long", year: "numeric", month: "long", day: "numeric",
                })}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="p-2"># Factura</th>
                      <th className="p-2">Mesa</th>
                      <th className="p-2 text-right">Importe</th>
                      <th className="p-2 text-right">ISV</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.orders.map((o) => (
                      <tr key={o.invoiceNumber} className="border-t">
                        <td className="p-2">{o.invoiceNumber}</td>
                        <td className="p-2">{o.tableLabel}</td>
                        <td className="p-2 text-right">L. {o.importe.toFixed(2)}</td>
                        <td className="p-2 text-right">L. {o.isv.toFixed(2)}</td>
                        <td className="p-2 text-right">L. {o.total.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="border-t font-semibold bg-gray-50">
                      <td className="p-2" colSpan={2}>Subtotal del día</td>
                      <td className="p-2 text-right">L. {day.subtotal.importe.toFixed(2)}</td>
                      <td className="p-2 text-right">L. {day.subtotal.isv.toFixed(2)}</td>
                      <td className="p-2 text-right">L. {day.subtotal.total.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Totalización general */}
          <div className="border-t-2 border-gray-800 pt-3">
            <table className="w-full text-sm">
              <tbody>
                <tr className="font-bold">
                  <td className="p-2" colSpan={2}>TOTAL GENERAL</td>
                  <td className="p-2 text-right">L. {data.grandTotal.importe.toFixed(2)}</td>
                  <td className="p-2 text-right">L. {data.grandTotal.isv.toFixed(2)}</td>
                  <td className="p-2 text-right">L. {data.grandTotal.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "productos" && productsData && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Producto</th>
                <th className="p-2">Categoría</th>
                <th className="p-2 text-right">Cantidad</th>
                <th className="p-2 text-right">Importe</th>
                <th className="p-2 text-right">ISV</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {productsData.products.map((p) => (
                <tr key={p.productId} className="border-t">
                  <td className="p-2">{p.productName}</td>
                  <td className="p-2 text-gray-500">{p.categoryName}</td>
                  <td className="p-2 text-right">{p.quantity}</td>
                  <td className="p-2 text-right">L. {p.importe.toFixed(2)}</td>
                  <td className="p-2 text-right">L. {p.isv.toFixed(2)}</td>
                  <td className="p-2 text-right">L. {p.total.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="border-t font-bold bg-gray-50">
                <td className="p-2" colSpan={2}>TOTAL GENERAL</td>
                <td className="p-2 text-right">{productsData.grandTotal.quantity}</td>
                <td className="p-2 text-right">L. {productsData.grandTotal.importe.toFixed(2)}</td>
                <td className="p-2 text-right">L. {productsData.grandTotal.isv.toFixed(2)}</td>
                <td className="p-2 text-right">L. {productsData.grandTotal.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}