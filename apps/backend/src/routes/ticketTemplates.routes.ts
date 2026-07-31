import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { validateTicketLayout, TicketTemplateLayout } from "@restaurante/types";

export const ticketTemplatesRouter = Router();

// Conversión explícita y centralizada entre nuestro tipo fuerte y el Json de Prisma.
// Evita repetir "as unknown as X" en cada handler.
function toJsonInput(layout: TicketTemplateLayout): Prisma.InputJsonValue {
  return layout as unknown as Prisma.InputJsonValue;
}

function fromJsonValue(value: Prisma.JsonValue): TicketTemplateLayout {
  return value as unknown as TicketTemplateLayout;
}

// Listar todas las versiones (historial/auditoría) — solo admin
ticketTemplatesRouter.get("/", async (_req, res) => {
  const templates = await prisma.ticketTemplate.findMany({
    orderBy: { version: "desc" },
  });
  res.json(templates);
});

// Plantilla activa — la consume el componente de impresión (InvoiceTemplate)
ticketTemplatesRouter.get("/active", async (_req, res) => {
  const active = await prisma.ticketTemplate.findFirst({
    where: { isActive: true },
  });

  if (!active) {
    return res.status(404).json({ error: "No hay una plantilla de ticket activa" });
  }

  res.json(active);
});

// Crear una nueva versión — queda inactiva hasta que se active explícitamente
ticketTemplatesRouter.post("/", async (req, res) => {
  const { name, layout } = req.body as { name?: string; layout?: TicketTemplateLayout };

  if (!name || !layout) {
    return res.status(400).json({ error: "Se requiere 'name' y 'layout'" });
  }

  const errors = validateTicketLayout(layout);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Layout inválido", details: errors });
  }

  const last = await prisma.ticketTemplate.findFirst({ orderBy: { version: "desc" } });

  const template = await prisma.ticketTemplate.create({
    data: {
      name,
      layout: toJsonInput(layout),
      version: (last?.version ?? 0) + 1,
      isActive: false,
    },
  });

  res.status(201).json(template);
});

// Activar una versión — desactiva cualquier otra en una sola transacción
ticketTemplatesRouter.patch("/:id/activate", async (req, res) => {
  const id = String(req.params.id);

  const target = await prisma.ticketTemplate.findUnique({ where: { id } });
  if (!target) {
    return res.status(404).json({ error: "Plantilla no encontrada" });
  }

  const errors = validateTicketLayout(fromJsonValue(target.layout));
  if (errors.length > 0) {
    return res.status(400).json({
      error: "No se puede activar: el layout guardado no cumple los requisitos del SAR",
      details: errors,
    });
  }

  const [, activated] = await prisma.$transaction([
    prisma.ticketTemplate.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    }),
    prisma.ticketTemplate.update({
      where: { id },
      data: { isActive: true },
    }),
  ]);

  res.json(activated);
});

// Editar una versión que AÚN no está activa
// (si ya está activa y en uso, se prefiere crear una versión nueva para no perder el historial de auditoría)
ticketTemplatesRouter.patch("/:id", async (req, res) => {
  const id = String(req.params.id);
  const { name, layout } = req.body as { name?: string; layout?: TicketTemplateLayout };

  const existing = await prisma.ticketTemplate.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: "Plantilla no encontrada" });
  }

  if (existing.isActive) {
    return res.status(409).json({
      error: "Esta versión ya está activa. Crea una nueva versión en vez de modificarla, para conservar el historial.",
    });
  }

  if (layout) {
    const errors = validateTicketLayout(layout);
    if (errors.length > 0) {
      return res.status(400).json({ error: "Layout inválido", details: errors });
    }
  }

  const updated = await prisma.ticketTemplate.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(layout ? { layout: toJsonInput(layout) } : {}),
    },
  });

  res.json(updated);
});