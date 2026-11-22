import { Request, Response } from "express";
import { db } from "../../config/db";
import {
  productsTable,
  categoriesTable,
} from "../../config/schema";
import { createProductSchema, updateProductSchema } from "../../validations/product.validations";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";

export class ProductController {
  // GET ALL PRODUCTS
  getAllProducts = async (req: Request, res: Response) => {
    try {
      const products = await db
        .select({
          id: productsTable.id,
          name: productsTable.name,
          description: productsTable.description,
          price: productsTable.price,
          stock: productsTable.stock,
          imageUrl: productsTable.imageUrl,
          isAvailable: productsTable.isAvailable,
          categoryId: productsTable.categoryId,
          categoryName: categoriesTable.name,
        })
        .from(productsTable)
        .leftJoin(
          categoriesTable,
          eq(productsTable.categoryId, categoriesTable.id)
        );

      return res.status(200).json({
        success: true,
        message: "Data produk berhasil diambil",
        data: products,
      });
    } catch (error) {
      console.error("Get products error:", error);

      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  };

  // GET PRODUCT BY ID
  getProductById = async (req: Request, res: Response) => {
    try {
      const productId = Number(req.params.id);

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID produk tidak valid",
        });
      }

      const [product] = await db
        .select({
          id: productsTable.id,
          name: productsTable.name,
          description: productsTable.description,
          price: productsTable.price,
          stock: productsTable.stock,
          imageUrl: productsTable.imageUrl,
          isAvailable: productsTable.isAvailable,
          categoryId: productsTable.categoryId,
          categoryName: categoriesTable.name,
        })
        .from(productsTable)
        .leftJoin(
          categoriesTable,
          eq(productsTable.categoryId, categoriesTable.id)
        )
        .where(eq(productsTable.id, productId))
        .limit(1);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Produk tidak ditemukan",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Detail produk berhasil diambil",
        data: product,
      });
    } catch (error) {
      console.error("Get product error:", error);

      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  };

  // CREATE PRODUCT
  createProduct = async (req: Request, res: Response) => {
    try {
      const validateData = createProductSchema.parse(req.body);

      const [category] = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, validateData.categoryId))
        .limit(1);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Kategori tidak ditemukan",
        });
      }

      const [newProduct] = await db
        .insert(productsTable)
        .values({
          ...validateData,
        })
        .returning();

      return res.status(201).json({
        success: true,
        message: "Produk berhasil ditambahkan",
        data: newProduct,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validasi gagal",
          errors: error.issues,
        });
      }

      console.error("Create product error:", error);

      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  };

  // UPDATE PRODUCT
  updateProduct = async (req: Request, res: Response) => {
    try {
      const productId = Number(req.params.id);

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID produk tidak valid",
        });
      }

      const validateData = updateProductSchema.parse(req.body);

      const [existingProduct] = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.id, productId))
        .limit(1);

      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Produk tidak ditemukan",
        });
      }

      if (validateData.categoryId !== undefined) {
        const [category] = await db
          .select()
          .from(categoriesTable)
          .where(eq(categoriesTable.id, validateData.categoryId))
          .limit(1);

        if (!category) {
          return res.status(404).json({
            success: false,
            message: "Kategori tidak ditemukan",
          });
        }
      }

      const [updatedProduct] = await db
        .update(productsTable)
        .set({
          ...validateData,
          updatedAt: new Date(),
        })
        .where(eq(productsTable.id, productId))
        .returning();

      return res.status(200).json({
        success: true,
        message: "Produk berhasil diperbarui",
        data: updatedProduct,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validasi gagal",
          errors: error.issues,
        });
      }

      console.error("Update product error:", error);

      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  };

  // DELETE PRODUCT
  deleteProduct = async (req: Request, res: Response) => {
    try {
      const productId = Number(req.params.id);

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID produk tidak valid",
        });
      }

      const [existingProduct] = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.id, productId))
        .limit(1);

      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Produk tidak ditemukan",
        });
      }

      const [deletedProduct] = await db
        .update(productsTable)
        .set({
          isAvailable: false,
          updatedAt: new Date(),
        })
        .where(eq(productsTable.id, productId))
        .returning();

      return res.status(200).json({
        success: true,
        message: "Produk berhasil dinonaktifkan",
        data: deletedProduct,
      });
    } catch (error) {
      console.error("Delete product error:", error);

      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  };
}

export default new ProductController();