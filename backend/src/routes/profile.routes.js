import { Router } from "express";
import validate from "../middlewares/validate.js";
import {
    getProfile,
    updateProfile,
    changePassword
} from "../controllers/profile.controller.js";
import {
    updateProfileSchema,
    changePasswordSchema
} from "../validation/profile.validation.js";
import { requireAuth } from "../middlewares/auth.js";
import asyncHandler from "../middlewares/asyncHandler.js";

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

router.put(
    "/password", 
    requireAuth,
    validate(changePasswordSchema),
    asyncHandler(changePassword)
);

export default router;