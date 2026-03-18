import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { instrumentsTable, insertInstrumentSchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/instruments", async (_req, res) => {
  const insts = await db.select().from(instrumentsTable).orderBy(instrumentsTable.ticker);
  res.json(insts);
});

router.post("/instruments", async (req, res) => {
  const parsed = insertInstrumentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data", details: parsed.error });
    return;
  }
  const [inst] = await db.insert(instrumentsTable).values(parsed.data).returning();
  res.status(201).json(inst);
});

router.put("/instruments/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = insertInstrumentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data", details: parsed.error });
    return;
  }
  const [inst] = await db.update(instrumentsTable).set(parsed.data).where(eq(instrumentsTable.id, id)).returning();
  if (!inst) { res.status(404).json({ error: "Not found" }); return; }
  res.json(inst);
});

router.delete("/instruments/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(instrumentsTable).where(eq(instrumentsTable.id, id));
  res.status(204).send();
});

export default router;
