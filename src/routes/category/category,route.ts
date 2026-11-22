import { Router } from "express";
import CategoryController from "../../controllers/category/category.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { isAdmin } from "../../middleware/isAdmin";

const router = Router();

// Semua route kategori hanya bisa diakses Admin
router.use(authenticate, isAdmin);

// CRUD Category
router.get("/", CategoryController.getAllCategories);
router.get("/:id", CategoryController.getCategoryById);
router.post("/", CategoryController.createCategory);
router.put("/:id", CategoryController.updateCategory);
router.delete("/:id", CategoryController.deleteCategory);

export default router;
