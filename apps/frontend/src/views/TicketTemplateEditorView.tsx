import { useEffect, useState } from "react";
import {
  TICKET_FIELD_CATALOG,
  type TicketLayoutField,
  type TicketTemplateLayout,
  validateTicketLayout,
} from "@restaurante/types";
import {
  type TicketTemplate,
  getTicketTemplates,
  createTicketTemplate,
  updateTicketTemplate,
  activateTicketTemplate,
} from "../services/api";

// Layout inicial: todos los campos obligatorios visibles, en el orden del catálogo.
function buildDefaultLayout(): TicketLayoutField[] {
  return TICKET_FIELD_CATALOG.filter((f) => f.mandatory).map((f, i) => ({
    key: f.key,
    order: i,
    visible: true,
    align: "left",
  }));
}

// Datos ficticios solo para la vista previa (no es una orden real).
const SAMPLE_DATA: Record<string, string> = {
  "business.razonSocial": "Restaurante Ejemplo S. de R.L.",
  "business.rtn": "0801-1990-123456",
  "business.direccion": "Col. Ejemplo, Villanueva, Cortés",
  "business.nombreComercial": "Restaurante Ejemplo",
  "business.telefono": "9999-9999",
  "cai.code": "A1B2C3-D4E5F6-A1B2C3-D4E5F6-A1B2C3",
  "cai.rangoAutorizado": "000-001-01-00000001 al 000-001-01-00050000",
  "cai.fechaLimite": "31/12/2026",
  "order.invoiceNumber": "000-001-01-00000042",
  "order.createdAt": "30/07/2026 07:15 PM",
  "order.customerRtn": "Consumidor Final",
  "order.subtotal": "L. 250.00",
  "order.isv15": "L. 37.50",
  "order.isv18": "L. 0.00",
  "order.total": "L. 287.50",
};

export function TicketTemplateEditorView() {
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | "new">("new");
  const [name, setName] = useState("Formato SAR");
  const [layout, setLayout] = useState<TicketLayoutField[]>(buildDefaultLayout());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getTicketTemplates().then(setTemplates).catch(console.error);
  }, []);

  function loadTemplate(id: string | "new") {
    setSelectedId(id);
    setMessage(null);
    if (id === "new") {
      setName("Formato SAR");
      setLayout(buildDefaultLayout());
      return;
    }
    const t = templates.find((t) => t.id === id);
    if (t) {
      setName(t.name);
      setLayout(t.layout.fields);
    }
  }

  const selectedTemplate = templates.find((t) => t.id === selectedId);
  const isEditingActive = selectedTemplate?.isActive ?? false;

  const activeFields = layout
    .filter((f) => f.visible)
    .sort((a, b) => a.order - b.order);

  const availableFields = TICKET_FIELD_CATALOG.filter(
    (def) => !layout.some((f) => f.key === def.key)
  );

  function addField(key: string) {
    setLayout((prev) => [
      ...prev,
      { key, order: prev.length, visible: true, align: "left" },
    ]);
  }

  function toggleVisible(key: string) {
    const def = TICKET_FIELD_CATALOG.find((f) => f.key === key);
    if (def?.mandatory) return; // no se puede ocultar un campo obligatorio
    setLayout((prev) =>
      prev.map((f) => (f.key === key ? { ...f, visible: !f.visible } : f))
    );
  }

  function removeField(key: string) {
    const def = TICKET_FIELD_CATALOG.find((f) => f.key === key);
    if (def?.mandatory) return;
    setLayout((prev) => prev.filter((f) => f.key !== key));
  }

  function moveField(key: string, direction: -1 | 1) {
    setLayout((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((f) => f.key === key);
      const swapIdx = idx + direction;
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev;

      [sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]];
      return sorted.map((f, i) => ({ ...f, order: i }));
    });
  }

  function updateFieldStyle(key: string, patch: Partial<TicketLayoutField>) {
    setLayout((prev) =>
      prev.map((f) => (f.key === key ? { ...f, ...patch } : f))
    );
  }

  async function handleSaveAsNew() {
    const built: TicketTemplateLayout = { fields: layout };
    const validation = validateTicketLayout(built);
    setErrors(validation);
    if (validation.length > 0) return;

    setSaving(true);
    setMessage(null);
    try {
      const created = await createTicketTemplate(name, built);
      setTemplates((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setMessage("Nueva versión guardada. Actívala cuando estés listo.");
    } catch (e) {
      console.error(e);
      setMessage("Error al guardar la plantilla.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveExisting() {
    if (selectedId === "new" || isEditingActive) return;
    const built: TicketTemplateLayout = { fields: layout };
    const validation = validateTicketLayout(built);
    setErrors(validation);
    if (validation.length > 0) return;

    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateTicketTemplate(selectedId, { name, layout: built });
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setMessage("Cambios guardados.");
    } catch (e) {
      console.error(e);
      setMessage("Error al guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate() {
    if (selectedId === "new") return;
    setSaving(true);
    setMessage(null);
    try {
      const activated = await activateTicketTemplate(selectedId);
      setTemplates((prev) =>
        prev.map((t) => ({ ...t, isActive: t.id === activated.id }))
      );
      setMessage(`Versión ${activated.version} activada.`);
    } catch (e) {
      console.error(e);
      setMessage("No se pudo activar (revisa que el layout cumpla los requisitos del SAR).");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Editor de formato de ticket (SAR)</h1>

      {/* Selector de versión */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select
          className="border rounded px-3 py-2 flex-1"
          value={selectedId}
          onChange={(e) => loadTemplate(e.target.value as string | "new")}
        >
          <option value="new">+ Nueva versión</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              v{t.version} — {t.name} {t.isActive ? "(activa)" : ""}
            </option>
          ))}
        </select>
        <input
          className="border rounded px-3 py-2 flex-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la plantilla"
        />
      </div>

      {isEditingActive && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-4">
          Esta versión ya está activa. Los cambios que hagas aquí no se pueden guardar sobre ella —
          usa "Guardar como nueva versión" para conservar el historial de auditoría.
        </p>
      )}

      {errors.length > 0 && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">
          <p className="font-medium mb-1">No cumple los requisitos del SAR:</p>
          <ul className="list-disc pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {message && <p className="text-sm text-gray-700 mb-4">{message}</p>}

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Columna izquierda: campos activos + disponibles */}
        <div>
          <h2 className="font-medium mb-2">Campos en la plantilla</h2>
          <div className="space-y-2 mb-6">
            {activeFields.map((field) => {
              const def = TICKET_FIELD_CATALOG.find((d) => d.key === field.key)!;
              return (
                <div
                  key={field.key}
                  className="border rounded p-3 flex flex-col sm:flex-row sm:items-center gap-2"
                >
                  <div className="flex-1">
                    <span className="font-medium">{def.label}</span>
                    {def.mandatory && (
                      <span className="ml-2 text-xs bg-gray-200 text-gray-700 rounded px-2 py-0.5">
                        obligatorio SAR
                      </span>
                    )}
                  </div>

                  {def.dataBinding === "static" && (
                    <input
                      className="border rounded px-2 py-1 text-sm flex-1"
                      value={field.customText ?? def.defaultText ?? ""}
                      onChange={(e) =>
                        updateFieldStyle(field.key, { customText: e.target.value })
                      }
                      placeholder="Texto"
                    />
                  )}

                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={field.align ?? "left"}
                    onChange={(e) =>
                      updateFieldStyle(field.key, {
                        align: e.target.value as TicketLayoutField["align"],
                      })
                    }
                  >
                    <option value="left">Izquierda</option>
                    <option value="center">Centro</option>
                    <option value="right">Derecha</option>
                  </select>

                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={field.bold ?? false}
                      onChange={(e) =>
                        updateFieldStyle(field.key, { bold: e.target.checked })
                      }
                    />
                    Negrita
                  </label>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="border rounded px-2 py-1 text-sm"
                      onClick={() => moveField(field.key, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="border rounded px-2 py-1 text-sm"
                      onClick={() => moveField(field.key, 1)}
                    >
                      ↓
                    </button>
                    {!def.mandatory && (
                      <>
                        <button
                          type="button"
                          className="border rounded px-2 py-1 text-sm"
                          onClick={() => toggleVisible(field.key)}
                        >
                          Ocultar
                        </button>
                        <button
                          type="button"
                          className="border rounded px-2 py-1 text-sm text-red-600"
                          onClick={() => removeField(field.key)}
                        >
                          Quitar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {availableFields.length > 0 && (
            <>
              <h2 className="font-medium mb-2">Campos disponibles</h2>
              <div className="flex flex-wrap gap-2 mb-6">
                {availableFields.map((def) => (
                  <button
                    key={def.key}
                    type="button"
                    className="border rounded px-3 py-1.5 text-sm"
                    onClick={() => addField(def.key)}
                  >
                    + {def.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={saving}
              className="bg-orange-600 text-white rounded px-4 py-2 disabled:opacity-50"
              onClick={handleSaveAsNew}
            >
              Guardar como nueva versión
            </button>
            {selectedId !== "new" && !isEditingActive && (
              <button
                type="button"
                disabled={saving}
                className="border rounded px-4 py-2 disabled:opacity-50"
                onClick={handleSaveExisting}
              >
                Guardar cambios en esta versión
              </button>
            )}
            {selectedId !== "new" && !isEditingActive && (
              <button
                type="button"
                disabled={saving}
                className="bg-green-700 text-white rounded px-4 py-2 disabled:opacity-50"
                onClick={handleActivate}
              >
                Activar esta versión
              </button>
            )}
          </div>
        </div>

        {/* Columna derecha: preview estilo ticket térmico 80mm */}
        <div>
          <h2 className="font-medium mb-2">Vista previa (datos de ejemplo)</h2>
          <div className="bg-gray-50 rounded p-4 flex justify-center">
            <div className="w-[280px] bg-white shadow p-3 font-mono text-xs">
              {activeFields.map((field) => {
                const def = TICKET_FIELD_CATALOG.find((d) => d.key === field.key)!;
                const alignClass =
                  field.align === "center"
                    ? "text-center"
                    : field.align === "right"
                    ? "text-right"
                    : "text-left";
                const boldClass = field.bold ? "font-bold" : "";

                if (def.isTable) {
                  return (
                    <div key={field.key} className={`border-t border-b py-1 my-1 ${boldClass}`}>
                      <div className="flex justify-between">
                        <span>2x Baleada</span>
                        <span>L. 120.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>1x Refresco</span>
                        <span>L. 130.00</span>
                      </div>
                    </div>
                  );
                }

                const value =
                  def.dataBinding === "static"
                    ? field.customText ?? def.defaultText ?? ""
                    : SAMPLE_DATA[def.dataBinding] ?? `{{${def.dataBinding}}}`;

                return (
                  <div key={field.key} className={`${alignClass} ${boldClass}`}>
                    {def.category === "fiscal" || def.category === "totales"
                      ? `${def.label}: ${value}`
                      : value}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}