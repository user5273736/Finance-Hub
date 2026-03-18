import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  categoriesTable,
  subcategoriesTable,
  insertCategorySchema,
  insertSubcategorySchema,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// Categories
router.get("/categories", async (_req, res) => {
  const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  res.json(cats);
});

router.post("/categories", async (req, res) => {
  const parsed = insertCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data", details: parsed.error });
    return;
  }
  const [cat] = await db.insert(categoriesTable).values(parsed.data).returning();
  res.status(201).json(cat);
});

router.put("/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = insertCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data", details: parsed.error });
    return;
  }
  const [cat] = await db.update(categoriesTable).set(parsed.data).where(eq(categoriesTable.id, id)).returning();
  if (!cat) { res.status(404).json({ error: "Not found" }); return; }
  res.json(cat);
});

router.delete("/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.status(204).send();
});

// Subcategories
router.get("/subcategories", async (req, res) => {
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  let query = db.select().from(subcategoriesTable);
  if (categoryId) {
    const subs = await db.select().from(subcategoriesTable).where(eq(subcategoriesTable.categoryId, categoryId));
    res.json(subs);
    return;
  }
  const subs = await query.orderBy(subcategoriesTable.name);
  res.json(subs);
});

router.post("/subcategories", async (req, res) => {
  const parsed = insertSubcategorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data", details: parsed.error });
    return;
  }
  const [sub] = await db.insert(subcategoriesTable).values(parsed.data).returning();
  res.status(201).json(sub);
});

router.delete("/subcategories/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(subcategoriesTable).where(eq(subcategoriesTable.id, id));
  res.status(204).send();
});

export default router;
