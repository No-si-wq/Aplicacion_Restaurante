// apps/frontend/src/components/InvoiceTemplate.tsx
import { useEffect, useState } from "react";
import type { Order } from "@restaurante/types";
import { TICKET_FIELD_CATALOG } from "@restaurante/types";
import { getActiveTicketTemplate, type TicketTemplate } from "../services/api";

interface InvoiceTemplateProps {
  orders: Order[]; // todas las órdenes de la mesa ya facturadas (mismo caiId/invoiceNumber)
}

// TODO: mover a un modelo `Business` en la BD cuando se decida cómo administrar
// los datos fiscales del negocio. Por ahora, variables de entorno como solución temporal.
const BUSINESS = {
  razonSocial: import.meta.env.VITE_BUSINESS_RAZON_SOCIAL ?? "",
  rtn: import.meta.env.VITE_BUSINESS_RTN ?? "",
  direccion: import.meta.env.VITE_BUSINESS_DIRECCION ?? "",
  nombreComercial: import.meta.env.VITE_BUSINESS_NOMBRE_COMERCIAL ?? "",
  telefono: import.meta.env.VITE_BUSINESS_TELEFONO ?? "",
  logoUrl: import.meta.env.VITE_BUSINESS_LOGO_URL ?? "",
};

export function InvoiceTemplate({ orders }: InvoiceTemplateProps) {
  const [template, setTemplate] = useState<TicketTemplate | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    getActiveTicketTemplate()
      .then(setTemplate)
      .catch((e) => setLoadError(e.message ?? "No se pudo cargar el formato de ticket"));
  }, []);

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
      case "razon_social_emisor": return BUSINESS.razonSocial;
      case "rtn_emisor": return BUSINESS.rtn;
      case "direccion_emision": return BUSINESS.direccion;
      case "nombre_comercial": return BUSINESS.nombreComercial;
      case "telefono": return BUSINESS.telefono;
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
        No se pudo cargar el formato de ticket activo: {loadError}. Configúralo en
        "Formato ticket" antes de imprimir.
      </p>
    );
  }

  if (!template) {
    return <p className="text-sm text-gray-500">Cargando formato de ticket...</p>;
  }

  const fields = [...template.layout.fields]
    .filter((f) => f.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <div>
      <button
        onClick={() => window.print()}
        className="mb-3 bg-terracota-600 text-white text-sm px-4 py-2 rounded sm:w-auto w-full print:hidden"
      >
        Imprimir factura
      </button>

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
            return BUSINESS.logoUrl ? (
              <div key={field.key} className={alignClass}>
                <img src={BUSINESS.logoUrl} alt="Logo" className="h-10 mx-auto" />
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