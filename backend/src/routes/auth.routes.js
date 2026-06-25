import { Router } from "express";
import {
    register,
    login,
    refresh,
    logout
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";

const router = Router();

router.post(
    "/register", 
    asyncHandler(register)
);

router.post(
    "/login", 
    asyncHandler(login)
);

router.post(
    "/refresh", 
    asyncHandler(refresh)
);

router.post(
    "/logout", 
    requireAuth, 
    asyncHandler(logout)
);

export default router;