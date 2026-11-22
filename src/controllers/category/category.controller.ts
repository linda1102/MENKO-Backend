
import { Request, Response } from "express";
import { db } from "../../config/db";
import { categoriesTable, productsTable } from "../../config/schema";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../../validations/category.validation";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";

class CategoryController {
  // GET ALL CATEGORIES
  getAllCategories = async (req: Request, res: Response) => {
    try {
      const categories = await db
        .select()
        .from(categoriesTable);

      return res.status(200).json({
        success: true,
        message: "Data kategori berhasil diambil",
        data: categories,
      });
    } catch (error) {
      console.error("Get categories error:", error);

      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  };

  // GET CATEGORY BY ID
  getCategoryById = async (req: Request, res: Response) => {
    try {
      const categoryId = Number(req.params.id);

      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID kategori tidak valid",
        });
      }

      const [category] = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, categoryId))
        .limit(1);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Kategori tidak ditemukan",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Detail kategori berhasil diambil",
        data: category,
      });
    } catch (error) {
      console.error("Get category error:", error);

      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  };

  // CREATE CATEGORY
  createCategory = async (req: Request, res: Response) => {
    try {
      const validateData = createCategorySchema.parse(req.body);

      const [existingCategory] = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.name, validateData.name))
        .limit(1);

      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: "Nama kategori sudah digunakan",
        });
      }

      const [newCategory] = await db
        .insert(categoriesTable)
        .values(validateData)
        .returning();

      return res.status(201).json({
        success: true,
        message: "Kategori berhasil ditambahkan",
        data: newCategory,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validasi gagal",
          errors: error.issues,
        });
      }

      console.error("Create category error:", error);

      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  };

  // UPDATE CATEGORY
  updateCategory = async (req: Request, res: Response) => {
    try {
      const categoryId = Number(req.params.id);

      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID kategori tidak valid",
        });
      }

      const validateData = updateCategorySchema.parse(req.body);

      const [existingCategory] = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, categoryId))
        .limit(1);

      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: "Kategori tidak ditemukan",
        });
      }

      if (validateData.name) {
        const [duplicateCategory] = await db
          .select()
          .from(categoriesTable)
          .where(eq(categoriesTable.name, validateData.name))
          .limit(1);

        if (duplicateCategory && duplicateCategory.id !== categoryId) {
          return res.status(409).json({
            success: false,
            message: "Nama kategori sudah digunakan",
          });
        }
      }

      const [updatedCategory] = await db
        .update(categoriesTable)
        .set(validateData)
        .where(eq(categoriesTable.id, categoryId))
        .returning();

      return res.status(200).json({
        success: true,
        message: "Kategori berhasil diperbarui",
        data: updatedCategory,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validasi gagal",
          errors: error.issues,
        });
      }

      console.error("Update category error:", error);

      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  };

  // DELETE CATEGORY
  deleteCategory = async (req: Request, res: Response) => {
    try {
      const categoryId = Number(req.params.id);

      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID kategori tidak valid",
        });
      }

      const [existingCategory] = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, categoryId))
        .limit(1);

      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: "Kategori tidak ditemukan",
        });
      }

      const [existingProduct] = await db
        .select({ id: productsTable.id })
        .from(productsTable)
        .where(eq(productsTable.categoryId, categoryId))
        .limit(1);

      if (existingProduct) {
        return res.status(409).json({
          success: false,
          message: "Kategori tidak bisa dihapus karena masih memiliki produk",
        });
      }

      await db
        .delete(categoriesTable)
        .where(eq(categoriesTable.id, categoryId));

      return res.status(200).json({
        success: true,
        message: "Kategori berhasil dihapus",
      });
    } catch (error) {
      console.error("Delete category error:", error);

      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  };
}

export default new CategoryController();
