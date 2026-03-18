import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  assetPricesTable,
  interestRatesTable,
  insertAssetPriceSchema,
  insertInterestRateSchema,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// Asset Prices
router.get("/asset-prices", async (req, res) => {
  const instrumentId = req.query.instrumentId ? Number(req.query.instrumentId) : undefined;
  const prices = instrumentId
    ? await db.select().from(assetPricesTable).where(eq(assetPricesTable.instrumentId, instrumentId)).orderBy(assetPricesTable.date)
    : await db.select().from(assetPricesTable).orderBy(assetPricesTable.date);
  res.json(prices);
});

router.post("/asset-prices", async (req, res) => {
  const parsed = insertAssetPriceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data", details: parsed.error });
    return;
  }
  const [price] = await db.insert(assetPricesTable).values(parsed.data).returning();
  res.status(201).json(price);
});

router.delete("/asset-prices/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(assetPricesTable).where(eq(assetPricesTable.id, id));
  res.status(204).send();
});

// Interest Rates
router.get("/interest-rates", async (req, res) => {
  const institutionId = req.query.institutionId ? Number(req.query.institutionId) : undefined;
  const rates = institutionId
    ? await db.select().from(interestRatesTable).where(eq(interestRatesTable.institutionId, institutionId)).orderBy(interestRatesTable.date)
    : await db.select().from(interestRatesTable).orderBy(interestRatesTable.date);
  res.json(rates);
});

router.post("/interest-rates", async (req, res) => {
  const parsed = insertInterestRateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data", details: parsed.error });
    return;
  }
  const [rate] = await db.insert(interestRatesTable).values(parsed.data).returning();
  res.status(201).json(rate);
});

router.delete("/interest-rates/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(interestRatesTable).where(eq(interestRatesTable.id, id));
  res.status(204).send();
});

export default router;
