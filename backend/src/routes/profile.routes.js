import { Router } from "express";
import {
    getProfile,
    updateProfile,
    changePassword
} from "../controllers/profile.controller.js";
import { requireAuth } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";

const router = Router();

router.get(
    "/", 
    requireAuth, 
    asyncHandler(getProfile)
);

router.put(
    "/", 
    requireAuth, 
    asyncHandler(updateProfile)
);

router.put(
    "/password", 
    requireAuth, 
    asyncHandler(changePassword)
);

export default router;