import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import validate from "../middlewares/validate.js";
import {
    transactionQuerySchema,
    transactionParamsSchema,
    updateTransactionSchema
} from "../validation/transaction.validation.js";
import {
    createTransaction,
    getTransactions,
    getTransactionById,
    updateTransaction,
    deleteTransaction
} from "../controllers/transaction.controller.js";
import {
    createTransactionSchema
} from "../validation/transaction.validation.js";

const router = Router();

router.get(
    "/",
    requireAuth,
    validate(transactionQuerySchema, "query"),
    asyncHandler(getTransactions)
);

router.get(
    "/:id",
    requireAuth,
    validate(transactionParamsSchema, "params"),
    asyncHandler(getTransactionById)
);

router.patch(
    "/:id",
    requireAuth,
    validate(transactionParamsSchema, "params"),
    validate(updateTransactionSchema),
    asyncHandler(updateTransaction)
);

router.delete(
    "/:id",
    requireAuth,
    validate(transactionParamsSchema, "params"),
    asyncHandler(deleteTransaction)
);

router.post(
    "/",
    requireAuth,
    validate(createTransactionSchema),
    asyncHandler(createTransaction)
);

export default router;