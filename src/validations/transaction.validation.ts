import { z } from "zod";

// Validasi metode pembayaran
export const createTransactionSchema = z.object({
  paymentMethod: z.enum(["cash", "qris"], {
    message: "Metode pembayaran harus cash atau qris",
  }),
});

// Validasi ID pesanan dari parameter URL
export const transactionParamsSchema = z.object({
  orderId: z.coerce
    .number()
    .int("ID pesanan harus berupa angka bulat")
    .positive("ID pesanan tidak valid"),
});
