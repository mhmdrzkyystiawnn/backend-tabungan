import { Router } from "express";
import rateLimit from "express-rate-limit"; // 1. Import library rate-limit
import validate from "../middlewares/validate.js";
import {
    register,
    login,
    refresh,
    logout
} from "../controllers/auth.controller.js";
import {
    registerSchema,
    loginSchema,
    refreshSchema
} from "../validation/auth.validation.js";
import { requireAuth } from "../middlewares/auth.js";
import asyncHandler from "../middlewares/asyncHandler.js";

const router = Router();

// 2. Buat instance rate limiter untuk login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Durasi: 15 menit
    max: 5, // Batas maksimal: 5 kali percobaan per IP
    message: { error: "Terlalu banyak percobaan login dari IP ini. Silakan coba lagi setelah 15 menit." },
    standardHeaders: true, 
    legacyHeaders: false,
});

router.post(
    "/register", 
    validate(registerSchema),
    asyncHandler(register)
);

// 3. Sisipkan loginLimiter sebagai middleware sebelum validasi
router.post(
    "/login",
    loginLimiter,
    validate(loginSchema),
    asyncHandler(login)
);

router.post(
    "/refresh",
    validate(refreshSchema),
    asyncHandler(refresh)
);

router.post(
    "/logout", 
    requireAuth, 
    asyncHandler(logout)
);

export default router;