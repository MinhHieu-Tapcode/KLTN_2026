import { authenticateUserService } from "../src/services/auth.service";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== KIỂM TRA ĐĂNG NHẬP THỰC TẾ TRÊN CSDL SUPABASE ===");

  const tRes = await authenticateUserService("teacher@simpace.vn", "simpace2026");
  console.log("1. Giáo viên (teacher@simpace.vn):", tRes.success ? `Thành công (Họ tên: ${tRes.user.profile?.fullName}, Role: ${tRes.user.role.code})` : `Thất bại: ${(tRes as any).error}`);

  const sRes = await authenticateUserService("student@simpace.vn", "simpace2026");
  console.log("2. Học sinh (student@simpace.vn):", sRes.success ? `Thành công (Họ tên: ${sRes.user.profile?.fullName}, Role: ${sRes.user.role.code})` : `Thất bại: ${(sRes as any).error}`);

  const aRes = await authenticateUserService("admin@simpace.vn", "simpace2026");
  console.log("3. Admin (admin@simpace.vn):", aRes.success ? `Thành công (Họ tên: ${aRes.user.profile?.fullName}, Role: ${aRes.user.role.code})` : `Thất bại: ${(aRes as any).error}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
