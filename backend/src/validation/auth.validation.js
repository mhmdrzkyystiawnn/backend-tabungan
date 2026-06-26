import { z } from "zod";

export const registerSchema = z.object({

    email: z
        .email("Format email tidak valid."),

    password: z
        .string()
        .min(8, "Password minimal 8 karakter.")

});

export const loginSchema = z.object({

    email: z
        .email("Format email tidak valid."),

    password: z
        .string()
        .min(1, "Password wajib diisi.")

});

export const refreshSchema = z.object({
    refresh_token: z
        .string()
        .min(1, "refresh_token wajib diisi.")
});