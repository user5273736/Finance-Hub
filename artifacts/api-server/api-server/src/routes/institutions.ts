import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { institutionsTable, insertInstitutionSchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/institutions", async (_req, res) => {
  const institutions = await db.select().from(institutionsTable).orderBy(institutionsTable.name);
  res.json(institutions);
});

router.post("/institutions", async (req, res) => {
  const parsed = insertInstitutionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data", details: parsed.error });
    return;
  }
  const [inst] = await db.insert(institutionsTable).values(parsed.data).returning();
  res.status(201).json(inst);
});

router.get("/institutions/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [inst] = await db.select().from(institutionsTable).where(eq(institutionsTable.id, id));
  if (!inst) { res.status(404).json({ error: "Not found" }); return; }
  res.json(inst);
});

router.put("/institutions/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = insertInstitutionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data", details: parsed.error });
    return;
  }
  const [inst] = await db.update(institutionsTable).set(parsed.data).where(eq(institutionsTable.id, id)).returning();
  if (!inst) { res.status(404).json({ error: "Not found" }); return; }
  res.json(inst);
});

router.delete("/institutions/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(institutionsTable).where(eq(institutionsTable.id, id));
  res.status(204).send();
});

export default router;
