import { Request, Response } from "express";
import { createCashierSchema } from "../../validations/cashier.validations";
import { usersTable } from "../../config/schema";
import { db } from "../../config/db";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { eq } from "drizzle-orm";

export class CashierController {
  registerCashier = async (req: Request, res: Response) => {
    try {
      const validateData = createCashierSchema.parse(req.body);
      const { username, email, password } = validateData;

      const [existingEmail] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "Email sudah digunakan",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [newCashier] = await db
        .insert(usersTable)
        .values({
          name: username,
          email,
          password: hashedPassword,
          role: "cashier",
        })
        .returning({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          role: usersTable.role,
        });

      return res.status(201).json({
        success: true,
        message: "Akun kasir berhasil dibuat",
        data: {
          cashier: {
            id: newCashier.id,
            username: newCashier.name,
            email: newCashier.email,
            role: newCashier.role,
          },
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validasi gagal",
          errors: error.issues,
        });
      }

      console.error("Register cashier error:", error);

      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  };
}

export default new CashierController();