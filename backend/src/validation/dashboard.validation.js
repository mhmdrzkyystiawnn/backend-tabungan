import { z } from "zod";

export const dashboardQuerySchema = z.object({}).strict();

// PERBAIKAN BUG #5: Schema ini wajib ada agar validate() di dashboard.routes.js bisa bekerja.
// Tanpa schema ini, routes.js mengimpor `recentTransactionsQuerySchema` yang tidak exist
// → runtime error "recentTransactionsQuerySchema is not exported".
// Limit dibatasi 1–50 agar query tidak membebani database.
export const recentTransactionsQuerySchema = z.object({
    limit: z
        .coerce
        .number()
        .int("Limit harus bilangan bulat.")
        .min(1, "Limit minimal 1.")
        .max(50, "Limit maksimal 50.")
        .optional(),
}).strict();

export const monthlySummaryQuerySchema = z.object({
    month: z
        .string()
        .trim()
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format bulan harus YYYY-MM"),
    savings_id: z
        .string()
        .uuid("savings_id harus berupa UUID")
        .optional(),
}).strict();