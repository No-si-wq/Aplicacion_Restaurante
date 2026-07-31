// routes/products.routes.ts
import { Router } from "express";
import { prisma } from "../db/client";
import { requireAuth } from "../middleware/auth.middleware";

export const productsRouter = Router();

// GET /products
productsRouter.get("/", requireAuth, async (req, res) => {
  try {
    const { available } = req.query;
    const products = await prisma.product.findMany({
      where: {
        companyId: req.user!.companyId,
        ...(available !== undefined && { available: available === "true" }),
      },
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ name: "asc" }],
    }); 
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// POST /products
productsRouter.post("/", requireAuth, async (req, res) => {
  const { name, categoryId, price, imageUrl, requiresKitchen } = req.body; // ← agregado imageUrl

  if (!name || !categoryId || price === undefined) {
    return res.status(400).json({ error: "nombre, categoria y precio son requeridos" });
  }
  if (isNaN(Number(price)) || Number(price) < 0) {
    return res.status(400).json({ error: "price debe ser un número positivo" });
  }

  try {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, companyId: req.user!.companyId },
    });
    if (!category) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    const product = await prisma.product.create({
      data: {
        name,
        categoryId,
        companyId: req.user!.companyId,
        price: Number(price),
        available: true,
        requiresKitchen: requiresKitchen ?? true,
        ...(imageUrl !== undefined && { imageUrl }), // ← agregado
      },
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: "Error al crear el producto" });
  }
});

// PATCH /products/:id
productsRouter.patch("/:id", requireAuth, async (req, res) => {
  const { name, categoryId, price, imageUrl, requiresKitchen } = req.body; // ← agregado imageUrl
  const id = String(req.params.id);

  if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
    return res.status(400).json({ error: "price debe ser un número positivo" });
  }

  try {
    const companyId = req.user!.companyId;

    if (categoryId !== undefined) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, companyId },
      });
      if (!category) {
        return res.status(404).json({ error: "Categoría no encontrada" });
      }
    }
    const product = await prisma.product.updateMany({
      where: { id, companyId },
      data: {
        ...(name      !== undefined && { name }),
        ...(categoryId  !== undefined && { categoryId }),
        ...(price     !== undefined && { price: Number(price) }),
        ...(imageUrl  !== undefined && { imageUrl }),
        ...(requiresKitchen !== undefined && { requiresKitchen }),
      },
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar el producto" });
  }
});

// PATCH /products/:id/availability  — sin cambios
productsRouter.patch("/:id/availability", requireAuth, async (req, res) => {
  const { available } = req.body;
  const id = String(req.params.id);

  if (typeof available !== "boolean") {
    return res.status(400).json({ error: "available debe ser un booleano" });
  }

  try {
    const product = await prisma.product.updateMany({
      where: { id, companyId: req.user!.companyId },
      data: { available },
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar disponibilidad" });
  }
});

// DELETE /products/:id  — sin cambios
productsRouter.delete("/:id", requireAuth, async (req, res) => {
  const productId = String(req.params.id);
  try {
    const product = await prisma.product.findFirst({
      where: { id: productId, companyId: req.user!.companyId },
    });
    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const inUse = await prisma.orderItem.count({
      where: { productId },
    });

    if (inUse > 0) {
      return res.status(409).json({
        error: "No se puede eliminar un producto con órdenes registradas",
      });
    }

    await prisma.product.delete({ where: { id: productId } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar el producto" });
  }
});