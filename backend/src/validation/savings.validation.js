import { z } from "zod";

export const createSavingsSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Nama tabungan tidak boleh kosong."),
    
    target_amount: z
        .number()
        .positive("Target tabungan harus lebih dari 0."),

    image_url: z
        .string()
        .trim()
        .url("URL gambar tidak valid.")
        .optional()
});

export const updateSavingsSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Nama tabungan tidak boleh kosong.")
        .optional(),
    
    target_amount: z
        .number()
        .positive("Target tabungan harus lebih dari 0.")
        .optional(),

    image_url: z
        .string()
        .trim()
        .url("URL gambar tidak valid.")
        .optional()
}).refine(
    data => Object.keys(data).length > 0,
    {
        message: "Minimal satu field harus diubah."
    }
);

export const savingsParamsSchema = z.object({
    id: z
        .string()
        .uuid("ID tabungan tidak valid.")
});

export const savingsQuerySchema = z.object({
    page: z.coerce.number().min(1).optional(),
    
    limit: z.coerce.number().min(1).max(100).optional(),
    
    search: z
        .string()
        .trim()
        .optional(),
    
    keyword: z
        .string()
        .trim()
        .optional(),
    
    sort: z.enum(["asc", "desc"]).optional()
});
