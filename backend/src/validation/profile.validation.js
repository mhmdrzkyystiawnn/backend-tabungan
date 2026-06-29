import { z } from "zod";

export const updateProfileSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Nama tidak boleh kosong.")
        .optional(),
    
    avatar: z
        .string()
        .trim()
        .min(1, "Avatar tidak boleh kosong.")
        .optional(),
    
    username: z
        .string()
        .trim()
        .min(1, "Username tidak boleh kosong.")
        .optional()
}).refine(
    data => Object.keys(data).length > 0,
    {
        message: "Minimal salah satu field harus diisi."
    }
);

export const changePasswordSchema = z.object({
    old_password: z
        .string()
        .min(1, "Password lama wajib diisi."),
    
    new_password: z
        .string()
        .min(8, "Password baru minimal 8 karakter.")
});
