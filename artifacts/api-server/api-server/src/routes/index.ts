import { Router, type IRouter } from "express";
import healthRouter from "./health";
import institutionsRouter from "./institutions";
import categoriesRouter from "./categories";
import instrumentsRouter from "./instruments";
import expensesRouter from "./expenses";
import indicesRouter from "./indices";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(institutionsRouter);
router.use(categoriesRouter);
router.use(instrumentsRouter);
router.use(expensesRouter);
router.use(indicesRouter);
router.use(statsRouter);

export default router;
