// components/BusinessManager.tsx
import { useEffect, useState, useRef } from "react";
import { getBusiness, updateBusiness } from "../services/api";
import { useImageUpload } from "../hooks/useImageUpload";
import type { Business } from "@restaurante/types";

const EMPTY_FORM = {
  razonSocial: "",
  rtn: "",
  direccion: "",
  nombreComercial: "",
  telefono: "",
  logoUrl: "",
};

type FormState = typeof EMPTY_FORM;

function toFormState(biz: Business): FormState {
  return {
    razonSocial: biz.razonSocial,
    rtn: biz.rtn,
    direccion: biz.direccion,
    nombreComercial: biz.nombreComercial ?? "",
    telefono: biz.telefono ?? "",
    logoUrl: biz.logoUrl ?? "",
  };
}

export default function BusinessManager() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { uploading, upload } = useImageUpload();
  const logoFileRef = useRef<HTMLInputElement>(null);

  async function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen no debe superar 2MB");
      return;
    }
    setError(null);
    try {
      const url = await upload(file);
      handleChange("logoUrl", url);
    } catch {
      setError("Error al subir el logo");
    }
  }

  useEffect(() => {
    getBusiness()
      .then((biz) => setForm(toFormState(biz)))
      .catch(() => {
        // 404 = todavía no hay datos fiscales configurados para esta empresa;
        // se deja el formulario vacío para que el admin los cree por primera vez.
      })
      .finally(() => setLoading(false));
  }, []);

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await updateBusiness({
        razonSocial: form.razonSocial,
        rtn: form.rtn,
        direccion: form.direccion,
        nombreComercial: form.nombreComercial || null,
        telefono: form.telefono || null,
        logoUrl: form.logoUrl || null,
      });
      setForm(toFormState(updated));
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-400">Cargando datos del negocio...</p>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 max-w-xl mx-auto">
      <h2 className="text-sm font-medium text-gray-900 mb-1">Datos fiscales del negocio</h2>
      <p className="text-xs text-gray-400 mb-4">
        Esta información aparece impresa en las facturas emitidas.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Field
          label="Razón social"
          required
          value={form.razonSocial}
          onChange={(v) => handleChange("razonSocial", v)}
        />
        <Field
          label="RTN"
          required
          value={form.rtn}
          onChange={(v) => handleChange("rtn", v)}
        />
        <Field
          label="Dirección"
          required
          value={form.direccion}
          onChange={(v) => handleChange("direccion", v)}
        />
        <Field
          label="Nombre comercial"
          value={form.nombreComercial}
          onChange={(v) => handleChange("nombreComercial", v)}
        />
        <Field
          label="Teléfono"
          value={form.telefono}
          onChange={(v) => handleChange("telefono", v)}
        />

<div>
          <span className="text-xs text-gray-500 mb-1 block">Logo del negocio</span>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={logoFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoSelect}
            />
            <button
              type="button"
              onClick={() => logoFileRef.current?.click()}
              disabled={uploading}
              className={`text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 ${
                uploading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {uploading ? "Subiendo..." : form.logoUrl ? "Cambiar logo" : "Subir logo"}
            </button>
            {form.logoUrl && (
              <div className="flex items-center gap-2">
                <img
                  src={form.logoUrl}
                  alt="Logo"
                  className="h-12 border border-gray-100 rounded"
                />
                <button
                  type="button"
                  onClick={() => handleChange("logoUrl", "")}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  quitar
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
            Datos guardados correctamente.
          </p>
        )}

        <button
          type="submit"
          disabled={saving || uploading}
          className="bg-orange-600 text-white text-sm px-4 py-2 rounded disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500 mb-1 block">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full text-sm border border-gray-200 rounded px-3 py-2"
      />
    </label>
  );
}