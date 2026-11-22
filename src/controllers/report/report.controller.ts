
import { Request, Response } from "express";
import { db } from "../../config/db";
import {
  ordersTable,
  orderDetailsTable,
  transactionsTable,
} from "../../config/schema";
import {
  and,
  eq,
  gte,
  lte,
  sql,
  desc,
} from "drizzle-orm";
import { reportQuerySchema } from "../../validations/report.validation";
import { ZodError } from "zod";

class ReportController {
  // DASHBOARD SUMMARY
  getDashboard = async (req: Request, res: Response) => {
    try {
      const [revenue] = await db
        .select({
          totalRevenue: sql<number>`COALESCE(SUM(${transactionsTable.amount}), 0)`,
          totalTransactions: sql<number>`COUNT(*)`,
        })
        .from(transactionsTable)
        .where(eq(transactionsTable.paymentStatus, "paid"));

      const [orders] = await db
        .select({
          totalOrders: sql<number>`COUNT(*)`,
        })
        .from(ordersTable);

      return res.status(200).json({
        success: true,
        message: "Data dashboard berhasil diambil",
        data: {
          totalRevenue: Number(revenue.totalRevenue),
          totalTransactions: Number(revenue.totalTransactions),
          totalOrders: Number(orders.totalOrders),
        },
      });
    } catch (error) {
      console.error("Get dashboard error:", error);

      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  };

  // SALES REPORT
  getSalesReport = async (req: Request, res: Response) => {
    try {
      const filters = reportQuerySchema.parse(req.query);

      const conditions = [
        eq(transactionsTable.paymentStatus, "paid"),
      ];

      if (filters.startDate) {
        conditions.push(
          gte(
            transactionsTable.createdAt,
            new Date(`${filters.startDate}T00:00:00.000Z`)
          )
        );
      }

      if (filters.endDate) {
        const endDate = new Date(
          `${filters.endDate}T00:00:00.000Z`
        );
        endDate.setUTCDate(endDate.getUTCDate() + 1);

        conditions.push(
          sql`${transactionsTable.createdAt} < ${endDate}`
        );
      }

      const transactions = await db
        .select({
          amount: transactionsTable.amount,
          createdAt: transactionsTable.createdAt,
        })
        .from(transactionsTable)
        .where(and(...conditions))
        .orderBy(transactionsTable.createdAt);

      const groupedSales: Record<
        string,
        { totalTransactions: number; totalRevenue: number }
      > = {};

      for (const transaction of transactions) {
        if (!transaction.createdAt) continue;

        const date = transaction.createdAt;
        const key =
          filters.period === "monthly"
            ? `${date.getUTCFullYear()}-${String(
                date.getUTCMonth() + 1
              ).padStart(2, "0")}`
            : date.toISOString().slice(0, 10);

        if (!groupedSales[key]) {
          groupedSales[key] = {
            totalTransactions: 0,
            totalRevenue: 0,
          };
        }

        groupedSales[key].totalTransactions += 1;
        groupedSales[key].totalRevenue += transaction.amount;
      }

      return res.status(200).json({
        success: true,
        message: "Laporan penjualan berhasil diambil",
        data: Object.entries(groupedSales).map(([date, value]) => ({
          date,
          ...value,
        })),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Filter laporan tidak valid",
          errors: error.issues,
        });
      }

      console.error("Get sales report error:", error);

      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  };

  // BEST SELLING PRODUCTS
  getBestSellingProducts = async (req: Request, res: Response) => {
    try {
      const products = await db
        .select({
          productName: orderDetailsTable.productName,
          totalSold: sql<number>`SUM(${orderDetailsTable.quantity})`,
          totalRevenue: sql<number>`SUM(${orderDetailsTable.subtotal})`,
        })
        .from(orderDetailsTable)
        .innerJoin(
          ordersTable,
          eq(orderDetailsTable.orderId, ordersTable.id)
        )
        .innerJoin(
          transactionsTable,
          eq(transactionsTable.orderId, ordersTable.id)
        )
        .where(
          eq(transactionsTable.paymentStatus, "paid")
        )
        .groupBy(orderDetailsTable.productName)
        .orderBy(
          desc(sql`SUM(${orderDetailsTable.quantity})`)
        );

      return res.status(200).json({
        success: true,
        message: "Data produk terlaris berhasil diambil",
        data: products.map((product) => ({
          ...product,
          totalSold: Number(product.totalSold),
          totalRevenue: Number(product.totalRevenue),
        })),
      });
    } catch (error) {
      console.error("Get best selling products error:", error);

      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  };
}

export default new ReportController();
