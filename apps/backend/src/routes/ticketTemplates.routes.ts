import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { validateTicketLayout, TicketTemplateLayout } from "@restaurante/types";
import { requireAuth } from "../middleware/auth.middleware";

export const ticketTemplatesRouter = Router();

function toJsonInput(layout: TicketTemplateLayout): Prisma.InputJsonValue {
  return layout as unknown as Prisma.InputJsonValue;
}

function fromJsonValue(value: Prisma.JsonValue): TicketTemplateLayout {
  return value as unknown as TicketTemplateLayout;
}

ticketTemplatesRouter.get("/", requireAuth, async (req, res) => {
  const templates = await prisma.ticketTemplate.findMany({
    where: { companyId: req.user!.companyId },
    orderBy: { version: "desc" },
  });
  res.json(templates);
});

ticketTemplatesRouter.get("/active", requireAuth, async (req, res) => {
  const active = await prisma.ticketTemplate.findFirst({
    where: { isActive: true, companyId: req.user!.companyId },
  });

  if (!active) {
    return res.status(404).json({ error: "No hay una plantilla de ticket activa" });
  }

  res.json(active);
});

ticketTemplatesRouter.post("/", requireAuth, async (req, res) => {
  const { name, layout } = req.body as { name?: string; layout?: TicketTemplateLayout };

  if (!name || !layout) {
    return res.status(400).json({ error: "Se requiere 'name' y 'layout'" });
  }

  const errors = validateTicketLayout(layout);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Layout inválido", details: errors });
  }

  const last = await prisma.ticketTemplate.findFirst({
    where: { companyId: req.user!.companyId },
    orderBy: { version: "desc" },
  });

  const template = await prisma.ticketTemplate.create({
    data: {
      name,
      layout: toJsonInput(layout),
      version: (last?.version ?? 0) + 1,
      companyId: req.user!.companyId,
      isActive: false,
    },
  });

  res.status(201).json(template);
});

ticketTemplatesRouter.patch("/:id/activate", requireAuth, async (req, res) => {
  const id = String(req.params.id);

  const target = await prisma.ticketTemplate.findFirst({
    where: { id, companyId: req.user!.companyId },
  });
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
      where: { isActive: true, companyId: req.user!.companyId },
      data: { isActive: false },
    }),
    prisma.ticketTemplate.update({
      where: { id },
      data: { isActive: true },
    }),
  ]);

  res.json(activated);
});

ticketTemplatesRouter.patch("/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);
  const { name, layout } = req.body as { name?: string; layout?: TicketTemplateLayout };

  const existing = await prisma.ticketTemplate.findFirst({
    where: { id, companyId: req.user!.companyId },
  });
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