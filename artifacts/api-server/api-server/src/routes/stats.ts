import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  institutionsTable,
  categoriesTable,
  ordinaryExpensesTable,
  transfersTable,
  financialTransactionsTable,
  instrumentsTable,
  assetPricesTable,
} from "@workspace/db/schema";
import { eq, sql, and, gte, lte, desc } from "drizzle-orm";

const router: IRouter = Router();

// Get portfolio summary: computes quantity per instrument and attaches last known price
router.get("/stats/portfolio", async (_req, res) => {
  const allTxns = await db.select().from(financialTransactionsTable);
  const instruments = await db.select().from(instrumentsTable);
  const allPrices = await db.select().from(assetPricesTable).orderBy(desc(assetPricesTable.date));

  // Build map: instrumentId -> latest price
  const latestPriceMap = new Map<number, number>();
  for (const p of allPrices) {
    if (!latestPriceMap.has(p.instrumentId)) {
      latestPriceMap.set(p.instrumentId, Number(p.price));
    }
  }

  // Build map: instrumentId -> { qty, totalCost, institutionId }
  type PortfolioAgg = { qty: number; totalCost: number; institutionId: number | null };
  const portfolioMap = new Map<number, PortfolioAgg>();

  for (const txn of allTxns) {
    if (!txn.instrumentId) continue;
    const cur = portfolioMap.get(txn.instrumentId) ?? { qty: 0, totalCost: 0, institutionId: null };
    const qty = Number(txn.quantity);
    const price = Number(txn.pricePerUnit);
    const comm = Number(txn.commissions ?? 0);
    if (txn.type === "acquisto") {
      cur.qty += qty;
      cur.totalCost += qty * price + comm;
      cur.institutionId = txn.institutionId ?? cur.institutionId;
    } else {
      cur.qty -= qty;
      cur.totalCost -= qty * price - comm;
    }
    portfolioMap.set(txn.instrumentId, cur);
  }

  const items = [];
  for (const inst of instruments) {
    const agg = portfolioMap.get(inst.id);
    if (!agg || agg.qty <= 0.000001) continue;
    const currentPrice = latestPriceMap.get(inst.id) ?? null;
    const currentValue = currentPrice !== null ? agg.qty * currentPrice : null;
    const avgCost = agg.qty > 0 ? agg.totalCost / agg.qty : 0;
    const gainLoss = currentValue !== null ? currentValue - agg.totalCost : null;
    const gainLossPercent = gainLoss !== null && agg.totalCost > 0 ? (gainLoss / agg.totalCost) * 100 : null;

    items.push({
      instrumentId: inst.id,
      ticker: inst.ticker,
      name: inst.name,
      type: inst.type,
      quantity: agg.qty,
      avgCost,
      totalCost: agg.totalCost,
      currentPrice,
      currentValue,
      gainLoss,
      gainLossPercent,
      institutionId: agg.institutionId,
    });
  }

  res.json(items);
});

// Expenses by category
router.get("/stats/expenses-by-category", async (req, res) => {
  const { from, to } = req.query;
  const conditions = [eq(ordinaryExpensesTable.type, "acquisto")];
  if (from) conditions.push(gte(ordinaryExpensesTable.date, from as string));
  if (to) conditions.push(lte(ordinaryExpensesTable.date, to as string));

  const exps = await db.select().from(ordinaryExpensesTable).where(and(...conditions));
  const cats = await db.select().from(categoriesTable);
  const catMap = new Map(cats.map(c => [c.id, c]));

  type CatAgg = { total: number; count: number; categoryName: string; color: string | null };
  const aggMap = new Map<string, CatAgg>();

  for (const exp of exps) {
    const key = exp.categoryId !== null ? String(exp.categoryId) : "uncategorized";
    const cat = exp.categoryId !== null ? catMap.get(exp.categoryId) : undefined;
    const cur = aggMap.get(key) ?? {
      total: 0, count: 0,
      categoryName: cat?.name ?? "Senza categoria",
      color: cat?.color ?? "#8E8E93",
    };
    cur.total += Number(exp.amount);
    cur.count += 1;
    aggMap.set(key, cur);
  }

  const result = Array.from(aggMap.entries()).map(([key, agg]) => ({
    categoryId: key !== "uncategorized" ? Number(key) : null,
    ...agg,
  })).sort((a, b) => b.total - a.total);

  res.json(result);
});

// Monthly expenses (last N months)
router.get("/stats/monthly-expenses", async (req, res) => {
  const months = Number(req.query.months ?? 12);
  const exps = await db
    .select()
    .from(ordinaryExpensesTable)
    .where(eq(ordinaryExpensesTable.type, "acquisto"))
    .orderBy(ordinaryExpensesTable.date);

  type MonthAgg = { total: number; count: number };
  const monthMap = new Map<string, MonthAgg>();

  for (const exp of exps) {
    const month = exp.date.substring(0, 7); // YYYY-MM
    const cur = monthMap.get(month) ?? { total: 0, count: 0 };
    cur.total += Number(exp.amount);
    cur.count += 1;
    monthMap.set(month, cur);
  }

  // Last N months only
  const sorted = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-months);

  res.json(sorted.map(([month, agg]) => ({ month, ...agg })));
});

// Institution balances
router.get("/stats/institution-balances", async (_req, res) => {
  const institutions = await db.select().from(institutionsTable).where(eq(institutionsTable.active, true));
  const expenses = await db.select().from(ordinaryExpensesTable);
  const transfers = await db.select().from(transfersTable);
  const financialTxns = await db.select().from(financialTransactionsTable);
  const allPrices = await db.select().from(assetPricesTable).orderBy(desc(assetPricesTable.date));

  // Latest price per instrument
  const latestPriceMap = new Map<number, number>();
  for (const p of allPrices) {
    if (!latestPriceMap.has(p.instrumentId)) {
      latestPriceMap.set(p.instrumentId, Number(p.price));
    }
  }

  // Portfolio per institution
  type PortAgg = { qty: number; totalCost: number };
  const portfolioByInst = new Map<number, Map<number, PortAgg>>();

  for (const txn of financialTxns) {
    if (!txn.institutionId || !txn.instrumentId) continue;
    if (!portfolioByInst.has(txn.institutionId)) portfolioByInst.set(txn.institutionId, new Map());
    const instMap = portfolioByInst.get(txn.institutionId)!;
    const cur = instMap.get(txn.instrumentId) ?? { qty: 0, totalCost: 0 };
    const qty = Number(txn.quantity);
    const price = Number(txn.pricePerUnit);
    const comm = Number(txn.commissions ?? 0);
    if (txn.type === "acquisto") {
      cur.qty += qty;
      cur.totalCost += qty * price + comm;
    } else {
      cur.qty -= qty;
      cur.totalCost -= qty * price;
    }
    instMap.set(txn.instrumentId, cur);
  }

  const result = institutions.map((inst) => {
    let cashBalance = Number(inst.initialBalance);

    // Ordinary expenses
    for (const exp of expenses) {
      if (exp.institutionId !== inst.id) continue;
      if (exp.type === "acquisto") cashBalance -= Number(exp.amount);
      else cashBalance += Number(exp.amount);
    }

    // Transfers out
    for (const tr of transfers) {
      if (tr.fromInstitutionId === inst.id) cashBalance -= Number(tr.amount);
      if (tr.toInstitutionId === inst.id) cashBalance += Number(tr.amount);
    }

    // Financial transactions: deduct cash for buys, add for sells
    for (const txn of financialTxns) {
      if (txn.institutionId !== inst.id) continue;
      const total = Number(txn.quantity) * Number(txn.pricePerUnit) + Number(txn.commissions ?? 0);
      if (txn.type === "acquisto") cashBalance -= total;
      else cashBalance += total - Number(txn.commissions ?? 0);
    }

    // Invested value at current prices
    let investedValue = 0;
    const instPortfolio = portfolioByInst.get(inst.id);
    if (instPortfolio) {
      for (const [instrumentId, agg] of instPortfolio) {
        const currentPrice = latestPriceMap.get(instrumentId);
        if (currentPrice && agg.qty > 0) {
          investedValue += agg.qty * currentPrice;
        }
      }
    }

    return {
      institutionId: inst.id,
      name: inst.name,
      type: inst.type,
      color: inst.color,
      initialBalance: Number(inst.initialBalance),
      cashBalance,
      investedValue,
      totalValue: cashBalance + investedValue,
    };
  });

  res.json(result);
});

// Overall summary
router.get("/stats/summary", async (_req, res) => {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Last 30 days
  const last30 = new Date(now);
  last30.setDate(last30.getDate() - 30);
  const last30Str = last30.toISOString().split("T")[0];

  // Prev 30 days (30-60 days ago)
  const prev60 = new Date(now);
  prev60.setDate(prev60.getDate() - 60);
  const prev60Str = prev60.toISOString().split("T")[0];

  // Current month
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const allExpenses = await db.select().from(ordinaryExpensesTable);
  const institutions = await db.select().from(institutionsTable).where(eq(institutionsTable.active, true));
  const financialTxns = await db.select().from(financialTransactionsTable);
  const transfers = await db.select().from(transfersTable);
  const allPrices = await db.select().from(assetPricesTable).orderBy(desc(assetPricesTable.date));

  const latestPriceMap = new Map<number, number>();
  for (const p of allPrices) {
    if (!latestPriceMap.has(p.instrumentId)) latestPriceMap.set(p.instrumentId, Number(p.price));
  }

  // Total expenses this month
  let totalExpensesMonth = 0;
  let totalExpensesLast30Days = 0;
  let totalExpensesPrev30Days = 0;

  for (const exp of allExpenses) {
    if (exp.type !== "acquisto") continue;
    const amount = Number(exp.amount);
    if (exp.date >= monthStart && exp.date <= today) totalExpensesMonth += amount;
    if (exp.date >= last30Str && exp.date <= today) totalExpensesLast30Days += amount;
    if (exp.date >= prev60Str && exp.date < last30Str) totalExpensesPrev30Days += amount;
  }

  // Portfolio value
  type PortAgg = { qty: number; totalCost: number };
  const portfolioMap = new Map<number, PortAgg>();

  for (const txn of financialTxns) {
    if (!txn.instrumentId) continue;
    const cur = portfolioMap.get(txn.instrumentId) ?? { qty: 0, totalCost: 0 };
    const qty = Number(txn.quantity);
    const price = Number(txn.pricePerUnit);
    const comm = Number(txn.commissions ?? 0);
    if (txn.type === "acquisto") {
      cur.qty += qty;
      cur.totalCost += qty * price + comm;
    } else {
      cur.qty -= qty;
    }
    portfolioMap.set(txn.instrumentId, cur);
  }

  let totalInvestedValue = 0;
  let totalInvested = 0;
  for (const [instrumentId, agg] of portfolioMap) {
    if (agg.qty <= 0) continue;
    totalInvested += agg.totalCost;
    const currentPrice = latestPriceMap.get(instrumentId);
    if (currentPrice) totalInvestedValue += agg.qty * currentPrice;
    else totalInvestedValue += agg.totalCost;
  }

  // Total cash across institutions
  let totalCash = 0;
  for (const inst of institutions) {
    let cash = Number(inst.initialBalance);
    for (const exp of allExpenses) {
      if (exp.institutionId !== inst.id) continue;
      if (exp.type === "acquisto") cash -= Number(exp.amount);
      else cash += Number(exp.amount);
    }
    for (const tr of transfers) {
      if (tr.fromInstitutionId === inst.id) cash -= Number(tr.amount);
      if (tr.toInstitutionId === inst.id) cash += Number(tr.amount);
    }
    for (const txn of financialTxns) {
      if (txn.institutionId !== inst.id) continue;
      const total = Number(txn.quantity) * Number(txn.pricePerUnit) + Number(txn.commissions ?? 0);
      if (txn.type === "acquisto") cash -= total;
      else cash += total - Number(txn.commissions ?? 0);
    }
    totalCash += cash;
  }

  res.json({
    totalPatrimony: totalCash + totalInvestedValue,
    totalCash,
    totalInvested,
    totalExpensesMonth,
    totalExpensesLast30Days,
    totalExpensesPrev30Days,
    totalInvestedValue,
  });
});

export default router;
