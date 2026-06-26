import { Router } from "express";

import { requireAuth } from "../middlewares/auth.js";

import asyncHandler from "../middlewares/asyncHandler.js";

import validate from "../middlewares/validate.js";

import {
    createSavings,
    getSavings,
    getSavingsById,
    updateSavings,
    deleteSavings,
    getTransactionsBySavingsId
} from "../controllers/savings.controller.js";

import { 
    createSavingsSchema, 
    updateSavingsSchema, 
    savingsParamsSchema,
    savingsQuerySchema 
} from "../validation/savings.validation.js";
import { transactionQuerySchema, transactionParamsSchema } from "../validation/transaction.validation.js";

const router = Router();

router.post(
    "/",
    requireAuth,
    validate(createSavingsSchema),
    asyncHandler(createSavings)
);

router.get(
    "/",
    requireAuth,
    validate(savingsQuerySchema, "query"),
    asyncHandler(getSavings)
);

router.get(
    "/:id",
    requireAuth,
    validate(savingsParamsSchema, "params"),
    asyncHandler(getSavingsById)
);

router.get(
    "/:id/transactions",
    requireAuth,
    validate(transactionParamsSchema, "params"),
    validate(transactionQuerySchema, "query"),
    asyncHandler(getTransactionsBySavingsId)
);

router.put(
    "/:id",
    requireAuth,
    validate(savingsParamsSchema, "params"),
    validate(updateSavingsSchema),
    asyncHandler(updateSavings)
);

router.delete(
    "/:id",
    requireAuth,
    validate(savingsParamsSchema, "params"),
    asyncHandler(deleteSavings)
);

export default router;