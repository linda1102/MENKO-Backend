import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Nama kategori wajib diisi"),
  description: z.string().nullable().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, "Nama kategori wajib diisi").optional(),
  description: z.string().nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "Minimal satu data kategori harus diubah",
});