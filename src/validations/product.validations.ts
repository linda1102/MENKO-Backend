import { z } from "zod";

export const createProductSchema = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().min(1, "Nama produk wajib diisi"),
  description: z.string().nullable().optional(),
  price: z.number().int().positive(),
  stock: z.number().int().min(0).default(0),
  imageUrl: z.string().nullable().optional(),
  isAvailable: z.boolean().default(true),
});

export const updateProductSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  price: z.number().int().positive().optional(),
  stock: z.number().int().min(0).optional(),
  imageUrl: z.string().nullable().optional(),
  isAvailable: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "Minimal satu data produk harus diisi",
});