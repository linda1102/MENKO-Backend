import { Router } from "express";
import TransactionController from "../../controllers/transaction/transaction.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

// Membuat transaksi pembayaran
router.post(
  "/:orderId",
  authenticate,
  TransactionController.createTransaction
);

export default router;
