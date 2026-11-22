import { Router } from "express";
import CashierController from "../../controllers/cashier/cashier.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { isAdmin } from "../../middleware/isAdmin";

const router = Router();

router.post(
  "/",
  authenticate,
  isAdmin,
  CashierController.registerCashier
);

export default router;