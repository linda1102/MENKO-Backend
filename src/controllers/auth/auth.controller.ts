import { Request, Response } from "express";
import { loginSchema } from "../../validations/auth.validations";
import { usersTable } from "../../config/schema";
import { db } from "../../config/db";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

export class AuthController {
  // LOGIN ADMIN DAN KASIR
  login = async (req: Request, res: Response) => {
    try {
      // Validasi request body
      const validateData = loginSchema.parse(req.body);
      const { email, password } = validateData;

      // Cari user berdasarkan email
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

      // Periksa apakah user ditemukan
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Email atau password salah",
        });
      }

      // Periksa status akun
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: "Akun tidak aktif",
        });
      }

      // Periksa password
      const isPasswordValid = await bcrypt.compare(
        password,
        user.password
      );

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Email atau password salah",
        });
      }

      // Pastikan role merupakan admin atau cashier
      if (user.role !== "admin" && user.role !== "cashier") {
        return res.status(403).json({
          success: false,
          message: "Role tidak memiliki akses",
        });
      }

      // Buat JWT token
      const token = jwt.sign(
        {
          id: user.id,
          role: user.role,
        },
        process.env.JWT_SECRET as string,
        {
          expiresIn: "1d",
        }
      );

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          token,
          user: {
            id: user.id,
            username: user.name,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (error: unknown) {
      console.error(error);

      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.issues,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  // MENGAMBIL DATA USER YANG SEDANG LOGIN
  getMe = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const [user] = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          role: usersTable.role,
          isActive: usersTable.isActive,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);

      if (!user || !user.isActive) {
        return res.status(404).json({
          success: false,
          message: "User not found or inactive",
        });
      }

      return res.status(200).json({
        success: true,
        message: "User profile retrieved successfully",
        data: {
          user: {
            id: user.id,
            username: user.name,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (error: unknown) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
}

export default new AuthController();
