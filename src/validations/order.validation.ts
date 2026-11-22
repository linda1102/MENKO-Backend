import { z } from "zod";

// VALIDASI ITEM ORDER
const orderItemSchema = z.object({
  productId: z.number().int().positive("ID produk tidak valid"),
  quantity: z.number().int().positive("Jumlah produk minimal 1"),
  note: z
    .string()
    .trim()
    .max(255, "Catatan maksimal 255 karakter")
    .nullable()
    .optional(),
});

// VALIDASI CREATE ORDER
export const createOrderSchema = z.object({
  tableNumber: z
    .string()
    .trim()
    .min(1, "Nomor meja wajib diisi")
    .max(10, "Nomor meja maksimal 10 karakter"),

  items: z
    .array(orderItemSchema)
    .min(1, "Pesanan minimal harus memiliki 1 produk"),
}).refine(
  (data) => {
    const productIds = data.items.map((item) => item.productId);
    return new Set(productIds).size === productIds.length;
  },
  {
    message: "Produk yang sama tidak boleh dimasukkan dua kali",
    path: ["items"],
  }
);

// VALIDASI UPDATE STATUS ORDER
export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "confirmed",
    "preparing",
    "ready",
    "completed",
    "cancelled",
  ]),
});
