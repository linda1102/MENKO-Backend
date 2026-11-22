import { Router } from "express";
import ReportController from "../../controllers/report/report.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { isAdmin } from "../../middleware/isAdmin";

const router = Router();

router.use(authenticate, isAdmin);

// DASHBOARD
router.get("/dashboard", ReportController.getDashboard);

// SALES REPORT
router.get("/sales", ReportController.getSalesReport);

// BEST SELLING PRODUCTS
router.get("/best-selling", ReportController.getBestSellingProducts);

export default router;
