// routes/products.routes.ts
import { Router } from "express";
import { prisma } from "../db/client";

export const productsRouter = Router();

// GET /products
productsRouter.get("/", async (req, res) => {
  try {
    const { available } = req.query;
    const products = await prisma.product.findMany({
      ...(available !== undefined && {
        where: { available: available === "true" },
      }),
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ name: "asc" }],
    }); 
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// POST /products
productsRouter.post("/", async (req, res) => {
  const { name, categoryId, price, imageUrl, requiresKitchen } = req.body; // ← agregado imageUrl

  if (!name || !categoryId || price === undefined) {
    return res.status(400).json({ error: "nombre, categoria y precio son requeridos" });
  }
  if (isNaN(Number(price)) || Number(price) < 0) {
    return res.status(400).json({ error: "price debe ser un número positivo" });
  }

  try {
    const product = await prisma.product.create({
      data: {
        name,
        categoryId,
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
productsRouter.patch("/:id", async (req, res) => {
  const { name, categoryId, price, imageUrl, requiresKitchen } = req.body; // ← agregado imageUrl

  if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
    return res.status(400).json({ error: "price debe ser un número positivo" });
  }

  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
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
productsRouter.patch("/:id/availability", async (req, res) => {
  const { available } = req.body;

  if (typeof available !== "boolean") {
    return res.status(400).json({ error: "available debe ser un booleano" });
  }

  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { available },
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar disponibilidad" });
  }
});

// DELETE /products/:id  — sin cambios
productsRouter.delete("/:id", async (req, res) => {
  try {
    const inUse = await prisma.orderItem.count({
      where: { productId: req.params.id },
    });

    if (inUse > 0) {
      return res.status(409).json({
        error: "No se puede eliminar un producto con órdenes registradas",
      });
    }

    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar el producto" });
  }
});