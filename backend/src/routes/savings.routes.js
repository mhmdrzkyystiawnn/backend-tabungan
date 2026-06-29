    import { Router } from "express";
    import multer from "multer";

    import { requireAuth } from "../middlewares/auth.js";

    import asyncHandler from "../middlewares/asyncHandler.js";

    import validate from "../middlewares/validate.js";

    import {
        createSavings,
        getSavings,
        getSavingsById,
        updateSavings,
        uploadSavingsImage,
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

    router.post(
        "/:id/image",
        requireAuth,
        validate(savingsParamsSchema, "params"),
        upload.single("image"),
        asyncHandler(uploadSavingsImage)
    );

    router.get(
        "/:id/transactions",
        requireAuth,
        // PERBAIKAN SARAN #3: Gunakan savingsParamsSchema karena params :id merujuk pada tabungan, bukan transaksi
        validate(savingsParamsSchema, "params"), 
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