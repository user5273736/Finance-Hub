import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  ordinaryExpensesTable,
  transfersTable,
  financialTransactionsTable,
  insertOrdinaryExpenseSchema,
  insertTransferSchema,
  insertFinancialTransactionSchema,
} from "@workspace/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

const router: IRouter = Router();

// Ordinary Expenses
router.get("/expenses", async (req, res) => {
  const { from, to, categoryId, institutionId } = req.query;
  const conditions = [];
  if (from) conditions.push(gte(ordinaryExpensesTable.date, from as string));
  if (to) conditions.push(lte(ordinaryExpensesTable.date, to as string));
  if (categoryId) conditions.push(eq(ordinaryExpensesTable.categoryId, Number(categoryId)));
  if (institutionId) conditions.push(eq(ordinaryExpensesTable.institutionId, Number(institutionId)));

  const expenses = conditions.length
    ? await db.select().from(ordinaryExpensesTable).where(and(...conditions)).orderBy(sql`${ordinaryExpensesTable.date} DESC`)
    : await db.select().from(ordinaryExpensesTable).orderBy(sql`${ordinaryExpensesTable.date} DESC`);
  res.json(expenses);
});

router.post("/expenses", async (req, res) => {
  const parsed = insertOrdinaryExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data", details: parsed.error });
    return;
  }
  const [exp] = await db.insert(ordinaryExpensesTable).values(parsed.data).returning();
  res.status(201).json(exp);
});

router.put("/expenses/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = insertOrdinaryExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data", details: parsed.error });
    return;
  }
  const [exp] = await db.update(ordinaryExpensesTable).set(parsed.data).where(eq(ordinaryExpensesTable.id, id)).returning();
  if (!exp) { res.status(404).json({ error: "Not found" }); return; }
  res.json(exp);
});

router.delete("/expenses/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(ordinaryExpensesTable).where(eq(ordinaryExpensesTable.id, id));
  res.status(204).send();
});

// Transfers
router.get("/transfers", async (req, res) => {
  const { from, to } = req.query;
  const conditions = [];
  if (from) conditions.push(gte(transfersTable.date, from as string));
  if (to) conditions.push(lte(transfersTable.date, to as string));

  const transfers = conditions.length
    ? await db.select().from(transfersTable).where(and(...conditions)).orderBy(sql`${transfersTable.date} DESC`)
    : await db.select().from(transfersTable).orderBy(sql`${transfersTable.date} DESC`);
  res.json(transfers);
});

router.post("/transfers", async (req, res) => {
  const parsed = insertTransferSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data", details: parsed.error });
    return;
  }
  const [tr] = await db.insert(transfersTable).values(parsed.data).returning();
  res.status(201).json(tr);
});

router.delete("/transfers/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(transfersTable).where(eq(transfersTable.id, id));
  res.status(204).send();
});

// Financial Transactions
router.get("/financial-transactions", async (req, res) => {
  const { instrumentId, from, to } = req.query;
  const conditions = [];
  if (instrumentId) conditions.push(eq(financialTransactionsTable.instrumentId, Number(instrumentId)));
  if (from) conditions.push(gte(financialTransactionsTable.date, from as string));
  if (to) conditions.push(lte(financialTransactionsTable.date, to as string));

  const txns = conditions.length
    ? await db.select().from(financialTransactionsTable).where(and(...conditions)).orderBy(sql`${financialTransactionsTable.date} DESC`)
    : await db.select().from(financialTransactionsTable).orderBy(sql`${financialTransactionsTable.date} DESC`);
  res.json(txns);
});

router.post("/financial-transactions", async (req, res) => {
  const parsed = insertFinancialTransactionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data", details: parsed.error });
    return;
  }
  const [txn] = await db.insert(financialTransactionsTable).values(parsed.data).returning();
  res.status(201).json(txn);
});

router.delete("/financial-transactions/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(financialTransactionsTable).where(eq(financialTransactionsTable.id, id));
  res.status(204).send();
});

export default router;
