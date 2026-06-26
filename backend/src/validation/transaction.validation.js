import { z } from "zod";

export const createTransactionSchema = z.object({

    savings_id: z
        .uuid("ID tabungan tidak valid."),

    type: z.enum(
        ["deposit", "withdrawal"],
        {
            message:
                "Type harus deposit atau withdrawal."
        }
    ),

    amount: z
        .number()
        .positive("Jumlah harus lebih dari 0."),

    description: z
        .string()
        .trim()
        .max(255)
        .optional()

});

export const transactionQuerySchema = z.object({

    page: z.coerce.number().min(1).optional(),

    limit: z.coerce.number().min(1).max(100).optional(),

    type: z.enum([
        "deposit",
        "withdrawal"
    ]).optional(),

    savings_id: z
        .string()
        .uuid("ID tabungan tidak valid.")
        .optional(),

    search: z
        .string()
        .trim()
        .optional(),

    sort: z.enum([
        "asc",
        "desc"
    ]).optional()

});

export const transactionParamsSchema = z.object({

    id: z
        .uuid("ID transaksi tidak valid.")

});

export const updateTransactionSchema = z.object({

    type: z
        .enum([
            "deposit",
            "withdrawal"
        ])
        .optional(),

    amount: z
        .coerce
        .number()
        .positive("Amount harus lebih dari 0.")
        .optional(),

    description: z
        .string()
        .trim()
        .max(255)
        .optional()

}).refine(

    data =>
        Object.keys(data).length > 0,

    {
        message: "Minimal satu field harus dikirim."
    }

);