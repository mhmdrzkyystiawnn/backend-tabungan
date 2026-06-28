import { Router } from "express";
import multer from "multer";

import { requireAuth } from "../middlewares/auth.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import validate from "../middlewares/validate.js";
import {
    createSharedSavings,
    createSharedTransaction,
    deleteSharedSavings,
    deleteSharedTransaction,
    getSharedSavings,
    getSharedSavingsById,
    getSharedSavingsMembers,
    getSharedSavingsStatistics,
    joinSharedSavings,
    updateSharedSavings,
    updateSharedTransaction,
    uploadSharedSavingsImage
} from "../controllers/sharedSavings.controller.js";
import {
    createSharedSavingsSchema,
    createSharedTransactionSchema,
    joinSharedSavingsSchema,
    sharedSavingsParamsSchema,
    sharedSavingsQuerySchema,
    sharedTransactionParamsSchema,
    updateSharedSavingsSchema,
    updateSharedTransactionSchema
} from "../validation/sharedSavings.validation.js";

const sharedSavingsRouter = Router();
const sharedTransactionRouter = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
            return;
        }

        cb(new Error("Format file tidak didukung. Gunakan gambar."));
    },
});

sharedSavingsRouter.post(
    "/",
    requireAuth,
    validate(createSharedSavingsSchema),
    asyncHandler(createSharedSavings)
);

sharedSavingsRouter.get(
    "/",
    requireAuth,
    validate(sharedSavingsQuerySchema, "query"),
    asyncHandler(getSharedSavings)
);

sharedSavingsRouter.post(
    "/join",
    requireAuth,
    validate(joinSharedSavingsSchema),
    asyncHandler(joinSharedSavings)
);

sharedSavingsRouter.get(
    "/:id",
    requireAuth,
    validate(sharedSavingsParamsSchema, "params"),
    asyncHandler(getSharedSavingsById)
);

sharedSavingsRouter.post(
    "/:id/image",
    requireAuth,
    validate(sharedSavingsParamsSchema, "params"),
    upload.single("image"),
    asyncHandler(uploadSharedSavingsImage)
);

sharedSavingsRouter.patch(
    "/:id",
    requireAuth,
    validate(sharedSavingsParamsSchema, "params"),
    validate(updateSharedSavingsSchema),
    asyncHandler(updateSharedSavings)
);

sharedSavingsRouter.delete(
    "/:id",
    requireAuth,
    validate(sharedSavingsParamsSchema, "params"),
    asyncHandler(deleteSharedSavings)
);

sharedSavingsRouter.get(
    "/:id/members",
    requireAuth,
    validate(sharedSavingsParamsSchema, "params"),
    asyncHandler(getSharedSavingsMembers)
);

sharedSavingsRouter.get(
    "/:id/statistics",
    requireAuth,
    validate(sharedSavingsParamsSchema, "params"),
    asyncHandler(getSharedSavingsStatistics)
);

sharedTransactionRouter.post(
    "/",
    requireAuth,
    validate(createSharedTransactionSchema),
    asyncHandler(createSharedTransaction)
);

sharedTransactionRouter.patch(
    "/:id",
    requireAuth,
    validate(sharedTransactionParamsSchema, "params"),
    validate(updateSharedTransactionSchema),
    asyncHandler(updateSharedTransaction)
);

sharedTransactionRouter.delete(
    "/:id",
    requireAuth,
    validate(sharedTransactionParamsSchema, "params"),
    asyncHandler(deleteSharedTransaction)
);

export { sharedSavingsRouter, sharedTransactionRouter };
export default sharedSavingsRouter;
