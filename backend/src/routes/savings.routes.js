import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";

import asyncHandler from "../middleware/asyncHandler.js";

import {
    createSavings,
    getSavings,
    getSavingsById,
    updateSavings,
    deleteSavings
} from "../controllers/savings.controller.js";

const router = Router();

router.post(
    "/",
    requireAuth,
    asyncHandler(createSavings)
);
router.get(
    "/",
    requireAuth,
    asyncHandler(getSavings)
);
router.get(
    "/:id",
    requireAuth,
    asyncHandler(getSavingsById)
);

router.put(
    "/:id",
    requireAuth,
    asyncHandler(updateSavings)
);

router.delete(
    "/:id",
    requireAuth,
    asyncHandler(deleteSavings)
);

export default router;