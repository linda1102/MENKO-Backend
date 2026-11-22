import { Router } from "express";
import AuthController from "../../controllers/auth/auth.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

// Login admin dan kasir
router.post("/login", AuthController.login);

// Mengambil data akun yang sedang login
router.get("/me", authenticate, AuthController.getMe);

export default router;
