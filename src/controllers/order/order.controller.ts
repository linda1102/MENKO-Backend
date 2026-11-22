
import { Request, Response } from "express";
import { db } from "../../config/db";
import {
  ordersTable,
  orderDetailsTable,
  productsTable,
} from "../../config/schema";
import {
  createOrderSchema,
  updateOrderStatusSchema,
} from "../../validations/order.validation";
import { eq, inArray, desc } from "drizzle-orm";
import { ZodError } from "zod";

class OrderController {
  // CREATE ORDER
  createOrder = async (req: Request, res: Response) => {
    try {
      const validateData = createOrderSchema.parse(req.body);

      const result = await db.transaction(async (tx) => {
        const productIds = validateData.items.map(
          (item) => item.productId
        );

        const products = await tx
          .select()
          .from(productsTable)
          .where(inArray(productsTable.id, productIds));

        if (products.length !== productIds.length) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        let totalAmount = 0;

        const orderItems = validateData.items.map((item) => {
          const product = products.find(
            (p) => p.id === item.productId
          );

          if (!product || !product.isAvailable) {
            throw new Error("PRODUCT_NOT_AVAILABLE");
          }

          if (product.stock < item.quantity) {
            throw new Error("INSUFFICIENT_STOCK");
          }

          const subtotal = product.price * item.quantity;
          totalAmount += subtotal;

          return {
            productId: product.id,
            productName: product.name,
            quantity: item.quantity,
            unitPrice: product.price,
            subtotal,
            note: item.note ?? null,
          };
        });

        const orderCode = `ORD-${Date.now()}`;

        const [newOrder] = await tx
          .insert(ordersTable)
          .values({
            orderCode,
            tableNumber: validateData.tableNumber,
            status: "pending",
            totalAmount,
          })
          .returning();

        await tx.insert(orderDetailsTable).values(
          orderItems.map((item) => ({
            orderId: newOrder.id,
            ...item,
          }))
        );

        return {
          ...newOrder,
          items: orderItems,
        };
      });

      return res.status(201).json({
        success: true,
        message: "Pesanan berhasil dibuat",
        data: result,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validasi gagal",
          errors: error.issues,
        });
      }

      if (error instanceof Error) {
        if (error.message === "PRODUCT_NOT_FOUND") {
          return res.status(404).json({
            success: false,
            message: "Produk tidak ditemukan",
          });
        }

        if (error.message === "PRODUCT_NOT_AVAILABLE") {
          return res.status(400).json({
            success: false,
            message: "Produk sedang tidak tersedia",
          });
        }

        if (error.message === "INSUFFICIENT_STOCK") {
          return res.status(409).json({
            success: false,
            message: "Stok produk tidak mencukupi",
          });
        }
      }

      console.error("Create order error:", error);

      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  };

  // GET ALL ORDERS
  getAllOrders = async (req: Request, res: Response) => {
    try {
      const orders = await db
        .select()
        .from(ordersTable)
        .orderBy(desc(ordersTable.createdAt));

      return res.status(200).json({
        success: true,
        message: "Data pesanan berhasil diambil",
        data: orders,
      });
    } catch (error) {
      console.error("Get orders error:", error);

      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  };

  // GET ORDER BY ID
  getOrderById = async (req: Request, res: Response) => {
    try {
      const orderId = Number(req.params.id);

      if (!Number.isInteger(orderId) || orderId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID pesanan tidak valid",
        });
      }

      const [order] = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, orderId))
        .limit(1);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Pesanan tidak ditemukan",
        });
      }

      const details = await db
        .select()
        .from(orderDetailsTable)
        .where(eq(orderDetailsTable.orderId, orderId));

      return res.status(200).json({
        success: true,
        message: "Detail pesanan berhasil diambil",
        data: {
          ...order,
          items: details,
        },
      });
    } catch (error) {
      console.error("Get order error:", error);

      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  };

  // UPDATE ORDER STATUS
  updateOrderStatus = async (req: Request, res: Response) => {
    try {
      const orderId = Number(req.params.id);

      if (!Number.isInteger(orderId) || orderId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID pesanan tidak valid",
        });
      }

      const validateData = updateOrderStatusSchema.parse(req.body);

      const updatedOrder = await db.transaction(async (tx) => {
        const [order] = await tx
          .select()
          .from(ordersTable)
          .where(eq(ordersTable.id, orderId))
          .limit(1);

        if (!order) {
          throw new Error("ORDER_NOT_FOUND");
        }

        const nextStatus = validateData.status;

        const allowedTransitions: Record<string, string[]> = {
          pending: ["confirmed", "cancelled"],
          confirmed: ["preparing"],
          preparing: ["ready"],
          ready: ["completed"],
          completed: [],
          cancelled: [],
        };

        if (
          !allowedTransitions[order.status].includes(nextStatus)
        ) {
          throw new Error("INVALID_STATUS_TRANSITION");
        }

        // Stok dikurangi hanya ketika pending menjadi confirmed
        if (order.status === "pending" && nextStatus === "confirmed") {
          const details = await tx
            .select()
            .from(orderDetailsTable)
            .where(eq(orderDetailsTable.orderId, orderId));

          const productIds = details.map(
            (item) => item.productId
          );

          const products = await tx
            .select()
            .from(productsTable)
            .where(inArray(productsTable.id, productIds))
            .for("update");

          for (const item of details) {
            const product = products.find(
              (p) => p.id === item.productId
            );

            if (!product || !product.isAvailable) {
              throw new Error("PRODUCT_NOT_AVAILABLE");
            }

            if (product.stock < item.quantity) {
              throw new Error("INSUFFICIENT_STOCK");
            }
          }

          for (const item of details) {
            const product = products.find(
              (p) => p.id === item.productId
            )!;

            await tx
              .update(productsTable)
              .set({
                stock: product.stock - item.quantity,
                updatedAt: new Date(),
              })
              .where(eq(productsTable.id, item.productId));
          }
        }

        const [updated] = await tx
          .update(ordersTable)
          .set({
            status: nextStatus,
            ...(nextStatus === "confirmed"
              ? { cashierId: req.user?.id ?? null }
              : {}),
          })
          .where(eq(ordersTable.id, orderId))
          .returning();

        return updated;
      });

      return res.status(200).json({
        success: true,
        message: "Status pesanan berhasil diperbarui",
        data: updatedOrder,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validasi gagal",
          errors: error.issues,
        });
      }

      if (error instanceof Error) {
        if (error.message === "ORDER_NOT_FOUND") {
          return res.status(404).json({
            success: false,
            message: "Pesanan tidak ditemukan",
          });
        }

        if (error.message === "INVALID_STATUS_TRANSITION") {
          return res.status(400).json({
            success: false,
            message: "Perubahan status pesanan tidak diperbolehkan",
          });
        }

        if (error.message === "PRODUCT_NOT_AVAILABLE") {
          return res.status(409).json({
            success: false,
            message: "Ada produk yang sudah tidak tersedia",
          });
        }

        if (error.message === "INSUFFICIENT_STOCK") {
          return res.status(409).json({
            success: false,
            message: "Stok tidak mencukupi untuk mengonfirmasi pesanan",
          });
        }
      }

      console.error("Update order status error:", error);

      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  };
}

export default new OrderController();
