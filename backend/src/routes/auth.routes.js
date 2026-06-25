import { Router } from "express";
import {
    register,
    login,
    refresh,
    logout
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);

router.post("/login", login);

router.post("/refresh", refresh);

router.post("/logout", requireAuth, logout);

export default router;