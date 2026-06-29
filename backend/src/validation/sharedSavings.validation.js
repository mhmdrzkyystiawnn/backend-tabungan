import { z } from "zod";

export const createSharedSavingsSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Nama tabungan bersama tidak boleh kosong."),

    description: z
        .string()
        .trim()
        .max(255)
        .optional(),

    target_amount: z
        .coerce.number()
        .positive("Target tabungan bersama harus lebih dari 0."),

    image_url: z
        .string()
        .trim()
        .url("URL gambar tidak valid.")
        .optional()
});

export const updateSharedSavingsSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Nama tabungan bersama tidak boleh kosong.")
        .optional(),

    description: z
        .string()
        .trim()
        .max(255)
        .optional(),

    target_amount: z
        .coerce.number()
        .positive("Target tabungan bersama harus lebih dari 0.")
        .optional(),

    image_url: z
        .string()
        .trim()
        .url("URL gambar tidak valid.")
        .optional()
}).refine(
    (data) => Object.keys(data).length > 0,
    {
        message: "Minimal satu field harus diubah."
    }
);

export const sharedSavingsQuerySchema = z.object({
    page: z.coerce.number().min(1).optional(),

    limit: z.coerce.number().min(1).max(100).optional(),

    search: z
        .string()
        .trim()
        .optional(),

    sort: z.enum(["asc", "desc"]).optional()
});

export const sharedSavingsParamsSchema = z.object({
    id: z.uuid("ID tabungan bersama tidak valid.")
});

export const joinSharedSavingsSchema = z.object({
    invite_code: z
        .string()
        .trim()
        .min(1, "Kode undangan tidak boleh kosong.")
});

export const createSharedTransactionSchema = z.object({
    shared_savings_id: z.uuid("ID tabungan bersama tidak valid."),

    type: z.enum(["deposit", "withdrawal"], {
        message: "Type harus deposit atau withdrawal."
    }),

    amount: z
        .coerce.number()
        .positive("Jumlah harus lebih dari 0."),

    description: z
        .string()
        .trim()
        .max(255)
        .optional()
});

export const updateSharedTransactionSchema = z.object({
    type: z.enum(["deposit", "withdrawal"]).optional(),

    amount: z.coerce.number().positive("Jumlah harus lebih dari 0.").optional(),

    description: z.string().trim().max(255).optional()
}).refine(
    (data) => Object.keys(data).length > 0,
    {
        message: "Minimal satu field harus diubah."
    }
);

export const sharedTransactionParamsSchema = z.object({
    id: z.uuid("ID transaksi tabungan bersama tidak valid.")
});
