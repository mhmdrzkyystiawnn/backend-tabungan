import { Router } from "express";
import multer from "multer";
import validate from "../middlewares/validate.js";
import {
    getProfile,
    updateProfile,
    changePassword,
    uploadAvatar
} from "../controllers/profile.controller.js";
import {
    updateProfileSchema,
    changePasswordSchema
} from "../validation/profile.validation.js";
import path from "path";
import { requireAuth } from "../middlewares/auth.js";
import asyncHandler from "../middlewares/asyncHandler.js";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        // 2. Cek MIME Type bawaan
        const isValidMime = file.mimetype.startsWith("image/");
        
        // 3. Cek Ekstensi File Asli (Whitelist)
        const allowedExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
        const ext = path.extname(file.originalname).toLowerCase();
        const isValidExt = allowedExtensions.includes(ext);

        // 4. Luluskan hanya jika KEDUANYA valid
        if (isValidMime && isValidExt) {
            cb(null, true);
        } else {
            cb(new Error("Format file tidak didukung. Harap unggah gambar (PNG, JPG, JPEG, WEBP, atau GIF)."));
        }
    },
});

const router = Router();

router.get(
    "/", 
    requireAuth, 
    asyncHandler(getProfile)
);

router.put(
    "/", 
    requireAuth,
    validate(updateProfileSchema),
    asyncHandler(updateProfile)
);

router.post(
    "/avatar",
    requireAuth,
    upload.single("avatar"),
    asyncHandler(uploadAvatar)
);

router.put(
    "/password", 
    requireAuth,
    validate(changePasswordSchema),
    asyncHandler(changePassword)
);

export default router;