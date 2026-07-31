export type TicketFieldCategory = "fiscal" | "producto" | "totales" | "legal" | "negocio";

export interface TicketFieldDef {
  key: string;
  label: string;
  mandatory: boolean; // true = exigido por el SAR, no se puede ocultar
  category: TicketFieldCategory;
  dataBinding: string; // ruta al dato real al momento de imprimir, o "static"
  isTable?: boolean;   // solo el detalle de productos
  defaultText?: string; // para campos de texto fijo (leyenda legal, etc.)
}

// Catálogo maestro. Si la SAR agrega un requisito nuevo, se agrega aquí
// una entrada más — el editor lo mostrará automáticamente como campo disponible.
export const TICKET_FIELD_CATALOG: TicketFieldDef[] = [
  // ---- Fiscales obligatorios ----
  { key: "razon_social_emisor", label: "Razón social del emisor", mandatory: true, category: "fiscal", dataBinding: "business.razonSocial" },
  { key: "rtn_emisor", label: "RTN del emisor", mandatory: true, category: "fiscal", dataBinding: "business.rtn" },
  { key: "direccion_emision", label: "Dirección del punto de emisión", mandatory: true, category: "fiscal", dataBinding: "business.direccion" },
  { key: "cai", label: "CAI", mandatory: true, category: "fiscal", dataBinding: "cai.code" },
  { key: "rango_autorizado", label: "Rango autorizado", mandatory: true, category: "fiscal", dataBinding: "cai.rangoAutorizado" },
  { key: "fecha_limite_emision", label: "Fecha límite de emisión", mandatory: true, category: "fiscal", dataBinding: "cai.fechaLimite" },
  { key: "correlativo", label: "Correlativo (sucursal-punto-tipo-número)", mandatory: true, category: "fiscal", dataBinding: "order.invoiceNumber" },
  { key: "fecha_emision", label: "Fecha de emisión", mandatory: true, category: "fiscal", dataBinding: "order.createdAt" },
  { key: "rtn_receptor", label: "RTN del receptor / Consumidor final", mandatory: true, category: "fiscal", dataBinding: "order.customerRtn" },

  // ---- Detalle y totales obligatorios ----
  { key: "detalle_productos", label: "Detalle de productos", mandatory: true, category: "producto", dataBinding: "order.items", isTable: true },
  { key: "descuentos_producto", label: "Descuentos/rebajas por producto", mandatory: true, category: "producto", dataBinding: "order.items[].discount" },
  { key: "subtotal", label: "Subtotal", mandatory: true, category: "totales", dataBinding: "order.subtotal" },
  { key: "isv_15", label: "ISV 15%", mandatory: true, category: "totales", dataBinding: "order.isv15" },
  { key: "isv_18", label: "ISV 18% (bebidas alcohólicas/tabaco)", mandatory: false, category: "totales", dataBinding: "order.isv18" },
  { key: "total", label: "Total", mandatory: true, category: "totales", dataBinding: "order.total" },

  // ---- Legal ----
  { key: "leyenda_legal", label: "Leyenda obligatoria", mandatory: true, category: "legal", dataBinding: "static", defaultText: "La factura es beneficio de todos, ¡exíjala!" },

  // ---- Opcionales de negocio ----
  { key: "logo", label: "Logo del negocio", mandatory: false, category: "negocio", dataBinding: "business.logoUrl" },
  { key: "nombre_comercial", label: "Nombre comercial", mandatory: false, category: "negocio", dataBinding: "business.nombreComercial" },
  { key: "telefono", label: "Teléfono", mandatory: false, category: "negocio", dataBinding: "business.telefono" },
  { key: "mensaje_pie", label: "Mensaje de pie de página", mandatory: false, category: "negocio", dataBinding: "static" },
];

// Cómo se guarda la posición/estilo de cada campo dentro de una versión de plantilla.
// Layout de flujo vertical (top-to-bottom), acorde a impresión en rollo térmico continuo.
export interface TicketLayoutField {
  key: string;        // referencia a TicketFieldDef.key
  order: number;       // posición vertical
  visible: boolean;    // si key es mandatory, el backend debe rechazar visible:false
  align?: "left" | "center" | "right";
  bold?: boolean;
  fontSize?: number;   // en pt
  customText?: string; // solo si dataBinding === "static"
}

export interface TicketTemplateLayout {
  fields: TicketLayoutField[];
}

// Validación reutilizable: evita que el editor o una llamada directa a la API
// desactive/elimine un campo obligatorio del SAR.
export function validateTicketLayout(layout: TicketTemplateLayout): string[] {
  const errors: string[] = [];
  const mandatoryKeys = TICKET_FIELD_CATALOG.filter(f => f.mandatory).map(f => f.key);

  for (const key of mandatoryKeys) {
    const field = layout.fields.find(f => f.key === key);
    if (!field) errors.push(`Falta el campo obligatorio: ${key}`);
    else if (!field.visible) errors.push(`El campo obligatorio "${key}" no puede estar oculto`);
  }

  return errors;
}