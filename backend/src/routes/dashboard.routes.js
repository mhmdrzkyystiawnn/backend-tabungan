import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import validate from "../middlewares/validate.js";
import {
    getDashboard,
    getMonthlySummary,
    getRecentTransactions,
    getStatistics,
} from "../controllers/dashboard.controller.js";

// Tambahkan import recentTransactionsQuerySchema (sesuaikan nama schema-nya dengan yang ada di file validasimu)
import { 
    monthlySummaryQuerySchema, 
    recentTransactionsQuerySchema 
} from "../validation/dashboard.validation.js";

const router = Router();

router.get(
    "/",
    requireAuth,
    asyncHandler(getDashboard)
);

router.get(
    "/statistics",
    requireAuth,
    asyncHandler(getStatistics)
);

router.get(
    "/recent-transactions",
    requireAuth,
    // Tambahkan middleware validasi di sini!
    validate(recentTransactionsQuerySchema, "query"),
    asyncHandler(getRecentTransactions)
);

router.get(
    "/monthly-summary",
    requireAuth,
    validate(monthlySummaryQuerySchema, "query"),
    asyncHandler(getMonthlySummary)
);

export default router;