import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    // Periksa token pada header
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Sesi habis, silakan login kembali",
      });
    }

    const token = authHeader.split(" ")[1];

    // Pastikan JWT_SECRET tersedia
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        success: false,
        message: "JWT secret is not configured",
      });
    }

    // Verifikasi token
    const decoded = jwt.verify(token, secret);

    if (typeof decoded === "string") {
      return res.status(403).json({
        success: false,
        message: "Token tidak valid",
      });
    }

    const payload = decoded as JwtPayload;

    // Periksa isi token
    if (
      typeof payload.id !== "number" ||
      !["admin", "cashier"].includes(payload.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Token tidak valid",
      });
    }

    // Simpan informasi user ke request
    req.user = {
      id: payload.id,
      role: payload.role,
    };

    return next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Token tidak valid atau sudah kedaluwarsa",
    });
  }
};
