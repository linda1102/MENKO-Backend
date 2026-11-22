
import bcrypt from "bcryptjs";
import { db } from "./config/db";
import { usersTable } from "./config/schema";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

const seedAdmin = async () => {
  try {
    const email = "admin@menko.com";
    const password = "admin123";

    // Cek apakah akun admin sudah tersedia
    const existingAdmin = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (existingAdmin.length > 0) {
      console.log("Akun admin sudah tersedia");
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Simpan akun admin
    await db.insert(usersTable).values({
      name: "Admin MENKO",
      email,
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });

    console.log("Akun admin berhasil dibuat");
    console.log("Email:", email);
    console.log("Password:", password);
  } catch (error) {
    console.error("Gagal membuat akun admin:", error);
  } finally {
    process.exit();
  }
};

seedAdmin();
