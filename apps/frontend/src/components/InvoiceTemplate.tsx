// apps/frontend/src/components/InvoiceTemplate.tsx
import { useEffect, useState } from "react";
import type { Order, Business } from "@restaurante/types";
import { TICKET_FIELD_CATALOG } from "@restaurante/types";
import { getTicketTemplates, getBusiness, type TicketTemplate } from "../services/api";

interface InvoiceTemplateProps {
  orders: Order[]; // todas las órdenes de la mesa ya facturadas (mismo caiId/invoiceNumber)
}

export function InvoiceTemplate({ orders }: InvoiceTemplateProps) {
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getTicketTemplates(), getBusiness()])
      .then(([list, biz]) => {
        setTemplates(list);
        const active = list.find((t) => t.isActive) ?? list[0] ?? null;
        setSelectedId(active?.id ?? null);
        setBusiness(biz);
      })
      .catch((e) => setLoadError(e.message ?? "No se pudo cargar el formato de ticket"));
  }, []);

   const template = templates.find((t) => t.id === selectedId) ?? null;

  if (orders.length === 0) return null;

  const first = orders[0];
  const cai = first.cai;
  const invoiceNumber = first.invoiceNumber;

  const allItems = orders.flatMap((o) => o.items);
  const subtotal = allItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const isv15 = Number((subtotal * 0.15).toFixed(2));
  // TODO: requiere marcar productos gravados al 18% (bebidas alcohólicas/tabaco) en el schema.
  // Por ahora siempre es 0 — el campo solo aparece en el ticket si el admin lo hace visible.
  const isv18 = 0;
  const total = Number((subtotal + isv15 + isv18).toFixed(2));

  const formattedInvoiceNumber =
    cai && invoiceNumber
      ? `${cai.establishment}-${cai.pointOfSale}-${cai.documentType}-${String(invoiceNumber).padStart(8, "0")}`
      : "Sin factura";

  function getFieldValue(key: string): string {
    switch (key) {
      case "razon_social_emisor": return business?.razonSocial ?? "";
      case "rtn_emisor": return business?.rtn ?? "";
      case "direccion_emision": return business?.direccion ?? "";
      case "nombre_comercial": return business?.nombreComercial ?? "";
      case "telefono": return business?.telefono ?? "";
      case "cai": return cai?.code ?? "Sin CAI";
      case "cai": return cai?.code ?? "Sin CAI";
      case "rango_autorizado": return cai ? `${cai.rangeStart}-${cai.rangeEnd}` : "";
      case "fecha_limite_emision": return cai?.limitDate?.slice(0, 10) ?? "";
      case "correlativo": return formattedInvoiceNumber;
      case "fecha_emision": return new Date(first.createdAt).toLocaleString("es-HN");
      // TODO: Order no tiene todavía un campo para el RTN del cliente.
      // Por defecto "Consumidor Final" hasta que se agregue al schema.
      case "rtn_receptor": return "Consumidor Final";
      case "subtotal": return `L ${subtotal.toFixed(2)}`;
      case "isv_15": return `L ${isv15.toFixed(2)}`;
      case "isv_18": return `L ${isv18.toFixed(2)}`;
      case "total": return `L ${total.toFixed(2)}`;
      // TODO: OrderItem no tiene todavía un campo `discount`.
      // Se muestra en L 0.00 para no ocultar un campo obligatorio del SAR.
      case "descuentos_producto": return "L 0.00";
      default: return "";
    }
  }

  if (loadError) {
    return (
      <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
        No se pudo cargar los formatos de ticket: {loadError}. Configúralo en
        "Formato ticket" antes de imprimir.
      </p>
    );
  }

  if (templates.length === 0) {
    return <p className="text-sm text-gray-500">Cargando formato de ticket...</p>;
  }

  if (!template) {
    return (
      <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
        No hay ningún formato de ticket disponible. Crea uno en "Formato ticket" antes de imprimir.
      </p>
    );
  }

  const fields = [...template.layout.fields]
    .filter((f) => f.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <div>
      <div className="mb-3 flex flex-col sm:flex-row gap-2 print:hidden">
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
          className="text-sm border border-gray-200 rounded px-3 py-2 flex-1"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} (v{t.version}){t.isActive ? " — activa" : ""}
            </option>
          ))}
        </select>
        <button
          onClick={() => window.print()}
          className="bg-orange-600 text-white text-sm px-4 py-2 rounded sm:w-auto w-full"
        >
          Imprimir factura
        </button>
      </div>

      <div
        className="print-receipt mx-auto bg-white text-black text-xs font-mono p-2"
        style={{ width: "80mm" }}
      >
        {fields.map((field) => {
          const def = TICKET_FIELD_CATALOG.find((d) => d.key === field.key);
          if (!def) return null; // el catálogo cambió y este key ya no existe

          const alignClass =
            field.align === "center" ? "text-center" : field.align === "right" ? "text-right" : "text-left";
          const boldClass = field.bold ? "font-bold" : "";

          // Detalle de productos: bloque especial, no una línea label:valor
          if (def.isTable) {
            return (
              <div key={field.key}>
                <hr className="my-1 border-black" />
                {allItems.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.quantity}x {item.product.name}</span>
                    <span>L {(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <hr className="my-1 border-black" />
              </div>
            );
          }

          // Logo: imagen, no texto
          if (field.key === "logo") {
            return business?.logoUrl ? (
              <div key={field.key} className={alignClass}>
                <img src={business.logoUrl} alt="Logo" className="h-10 mx-auto" />
              </div>
            ) : null;
          }

          // Campos de texto fijo (leyenda legal, mensaje de pie)
          if (def.dataBinding === "static") {
            return (
              <p key={field.key} className={`${alignClass} ${boldClass}`}>
                {field.customText ?? def.defaultText ?? ""}
              </p>
            );
          }

          const value = getFieldValue(field.key);
          if (!value) return null;

          const showLabel = def.category === "fiscal" || def.category === "totales";

          return (
            <div key={field.key} className={`${alignClass} ${boldClass} flex justify-between`}>
              {showLabel ? (
                <>
                  <span>{def.label}</span>
                  <span>{value}</span>
                </>
              ) : (
                <span>{value}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}