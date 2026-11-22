import express from "express";
import authRouter from "./routes/auth/auth.route";
import cashierRouter from "./routes/cashier/cashier.route";
import categoryRouter from "./routes/category/category,route";
import orderRouter from "./routes/order/order.route";
import reportRouter from "./routes/report/report.route";
import transactionRouter from "./routes/transaction/transaction.route";

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/cashier", cashierRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/reports", reportRouter);
app.use("/api/v1/transactions", transactionRouter);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
