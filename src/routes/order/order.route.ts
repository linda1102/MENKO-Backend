import { Router } from "express";
import OrderController from "../../controllers/order/order.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

// CUSTOMER - Membuat pesanan tanpa login
router.post("/", OrderController.createOrder);

// ADMIN & CASHIER - Melihat pesanan
router.get("/", authenticate, OrderController.getAllOrders);
router.get("/:id", authenticate, OrderController.getOrderById);

// ADMIN & CASHIER - Mengubah status pesanan
router.patch("/:id/status", authenticate, OrderController.updateOrderStatus);

export default router;
