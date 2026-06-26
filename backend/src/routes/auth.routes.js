import { Router } from "express";
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

router.post(
    "/register", 
    validate(registerSchema),
    asyncHandler(register)
);

router.post(
    "/login",
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