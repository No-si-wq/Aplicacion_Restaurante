// apps/frontend/src/views/FacturasView.tsx
import { useEffect, useState } from "react";
import { getInvoices, type Invoice } from "../services/api";
import { InvoiceTemplate } from "../components/InvoiceTemplate";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function FacturasView() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(daysAgoISO(7));
  const [to, setTo] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Invoice | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    getInvoices({ from, to, search: search || undefined })
      .then(setInvoices)
      .catch((e) => setError(e.message ?? "No se pudieron cargar las facturas"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Facturas</h1>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="border border-gray-200 rounded px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="border border-gray-200 rounded px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por # de factura o mesa"
          className="border border-gray-200 rounded px-3 py-2 text-sm flex-1"
        />
        <button
          onClick={load}
          className="bg-orange-600 text-white text-sm px-4 py-2 rounded sm:w-auto w-full"
        >
          Buscar
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando facturas...</p>}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</p>
      )}
      {!loading && !error && invoices.length === 0 && (
        <p className="text-sm text-gray-500">No hay facturas en el rango seleccionado.</p>
      )}

      <div className="space-y-2">
        {invoices.map((inv) => (
          <div
            key={`${inv.caiId}-${inv.invoiceNumber}`}
            className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{inv.formattedNumber}</p>
              <p className="text-xs text-gray-500">
                Mesa {inv.table.label} · {new Date(inv.billedAt).toLocaleString("es-HN")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-900">L {inv.total.toFixed(2)}</span>
              <button
                onClick={() => setSelected(inv)}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300"
              >
                Ver / Reimprimir
              </button>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 print:bg-white print:p-0">
          <div className="bg-white rounded-lg max-h-[90vh] overflow-y-auto p-4 w-full max-w-sm print:max-w-none print:max-h-none print:rounded-none">
            <div className="flex justify-end mb-2 print:hidden">
              <button
                onClick={() => setSelected(null)}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Cerrar ✕
              </button>
            </div>
            <InvoiceTemplate orders={selected.orders} />
          </div>
        </div>
      )}
    </div>
  );
}