
import { z } from "zod";

export const reportQuerySchema = z.object({
  startDate: z.string().date("Format tanggal harus YYYY-MM-DD").optional(),
  endDate: z.string().date("Format tanggal harus YYYY-MM-DD").optional(),
  period: z.enum(["daily", "monthly"]).default("daily"),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  {
    message: "Tanggal awal tidak boleh melebihi tanggal akhir",
    path: ["endDate"],
  }
);
