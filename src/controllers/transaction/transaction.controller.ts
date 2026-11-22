import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../config/db";
import {
  ordersTable,
  transactionsTable,
} from "../../config/schema";
import {
  createTransactionSchema,
  transactionParamsSchema,
} from "../../validations/transaction.validation";

class TransactionController {
  // Membuat transaksi pembayaran
  static createTransaction = async (req: Request, res: Response) => {
    try {
      const params = transactionParamsSchema.safeParse(req.params);
      const body = createTransactionSchema.safeParse(req.body);

      if (!params.success) {
        return res.status(400).json({
          message: "ID pesanan tidak valid",
          errors: params.error.flatten(),
        });
      }

      if (!body.success) {
        return res.status(400).json({
          message: "Data pembayaran tidak valid",
          errors: body.error.flatten(),
        });
      }

      const { orderId } = params.data;
      const { paymentMethod } = body.data;

      // Cari pesanan
      const [order] = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, orderId));

      if (!order) {
        return res.status(404).json({
          message: "Pesanan tidak ditemukan",
        });
      }

      // Transaksi hanya dibuat setelah pesanan dikonfirmasi
      if (order.status !== "confirmed") {
        return res.status(400).json({
          message: "Pesanan harus dikonfirmasi kasir terlebih dahulu",
        });
      }

      // Cek apakah pesanan sudah memiliki transaksi
      const [existingTransaction] = await db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.orderId, orderId));

      if (existingTransaction) {
        return res.status(409).json({
          message: "Pesanan sudah memiliki transaksi",
        });
      }

      // Pembayaran tunai
      if (paymentMethod === "cash") {
        const [transaction] = await db
          .insert(transactionsTable)
          .values({
            orderId,
            paymentMethod: "cash",
            amount: order.totalAmount,
            paymentStatus: "pending",
          })
          .returning();

        return res.status(201).json({
          message: "Transaksi tunai berhasil dibuat",
          data: transaction,
        });
      }

      // Pembayaran QRIS menggunakan Xendit
      const secretKey = process.env.XENDIT_SECRET_KEY;

      if (!secretKey) {
        return res.status(503).json({
          message: "Xendit belum dikonfigurasi. Secret API Key belum tersedia.",
        });
      }

      const externalId = `MENKO-${order.orderCode}`;

      const xenditResponse = await fetch(
        "https://api.xendit.co/v2/invoices",
        {
          method: "POST",
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(`${secretKey}:`).toString("base64"),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            external_id: externalId,
            amount: order.totalAmount,
            description: `Pembayaran pesanan ${order.orderCode}`,
            invoice_duration: 86400,
            currency: "IDR",
            payment_methods: ["QRIS"],
          }),
        }
      );

      const invoice = await xenditResponse.json();

      if (!xenditResponse.ok) {
        console.error("Xendit error:", invoice);

        return res.status(502).json({
          message: "Gagal membuat pembayaran Xendit",
        });
      }

      // Simpan transaksi setelah Invoice berhasil dibuat
      const [transaction] = await db
        .insert(transactionsTable)
        .values({
          orderId,
          paymentMethod: "qris",
          amount: order.totalAmount,
          paymentStatus: "pending",
          paymentReference: invoice.id,
        })
        .returning();

      return res.status(201).json({
        message: "Invoice pembayaran berhasil dibuat",
        data: {
          transaction,
          invoiceUrl: invoice.invoice_url,
        },
      });
    } catch (error) {
      console.error("Create transaction error:", error);

      return res.status(500).json({
        message: "Terjadi kesalahan saat membuat transaksi",
      });
    }
  };
}

export default TransactionController;
