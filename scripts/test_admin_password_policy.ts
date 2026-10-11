import { prisma } from "../src/lib/prisma";
import { createUserAction, updateUserAction, deleteUserAction } from "../src/actions/users";

function assert(description: string, condition: boolean) {
  if (condition) {
    console.log(`[PASS] ${description}`);
  } else {
    console.error(`[FAIL] ${description}`);
    process.exit(1);
  }
}

async function main() {
  console.log("=== KIỂM THỬ CHÍNH SÁCH BẢO MẬT MẬT KHẨU (ADMIN KHÔNG XEM / KHÔNG SỬA MẬT KHẨU) ===");

  const someClass = await prisma.class.findFirst({ where: { isActive: true } });
  if (!someClass) {
    console.error("Không tìm thấy lớp học hợp lệ để test");
    process.exit(1);
  }

  const testEmail = `test_policy_${Date.now()}@simpace.edu.vn`;
  
  // 1. Tạo tài khoản mới: Admin KHÔNG nhận được tempPassword
  console.log("\n1. Test tạo tài khoản mới: Admin không nhận được mật khẩu khởi tạo trong kết quả");
  const createRes = await createUserAction({
    fullName: "Nguyễn Chính Sách Test",
    email: testEmail,
    roleCode: "STUDENT",
    classIds: [someClass.id],
  });

  assert("Tạo tài khoản thành công", createRes.success === true);
  assert("Kết quả trả về KHÔNG chứa tempPassword (Admin không thể xem mật khẩu)", (createRes as any).tempPassword === undefined);
  assert("Người dùng được lưu mustChangePassword: true", (createRes as any).user?.mustChangePassword === true);

  const userId = (createRes as any).user?.id;

  // 2. Test Admin cố tình sửa mật khẩu của tài khoản khác -> BỊ TỪ CHỐI
  console.log("\n2. Test Admin sửa mật khẩu người khác -> Bị chặn với lỗi bảo mật");
  const updatePassRes = await updateUserAction(userId, {
    newPassword: "NewSecretPassword123",
  });

  assert("Sửa mật khẩu người khác bị từ chối", updatePassRes.success === false);
  assert(
    "Thông báo lỗi bảo mật chính xác",
    updatePassRes.error?.includes("Quy định bảo mật") === true
  );

  // 3. Test Admin sửa EMAIL của tài khoản khác -> ĐƯỢC CHẤP NHẬN
  console.log("\n3. Test Admin sửa email của tài khoản khác -> Thành công");
  const updatedEmail = `test_updated_${Date.now()}@simpace.edu.vn`;
  const updateEmailRes = await updateUserAction(userId, {
    email: updatedEmail,
  });

  assert("Sửa email thành công", updateEmailRes.success === true);

  const checkUser = await prisma.user.findUnique({ where: { id: userId } });
  assert("Email mới đã được cập nhật chính xác trong CSDL", checkUser?.email === updatedEmail);

  // 4. Test Người dùng tự đổi EMAIL qua updateProfileAction (Hồ sơ cá nhân)
  console.log("\n4. Test Người dùng tự đổi EMAIL trong Hồ sơ cá nhân (updateProfileAction)");
  const selfNewEmail = `test_self_profile_${Date.now()}@simpace.edu.vn`;
  const { updateProfileAction } = await import("../src/actions/users");
  
  const updateProfileRes = await updateProfileAction(userId, {
    fullName: "Nguyễn Chính Sách Đã Đổi Tên",
    email: selfNewEmail,
  });

  assert("Người dùng tự đổi email trong hồ sơ thành công", updateProfileRes.success === true);

  const checkUserAfterSelfUpdate = await prisma.user.findUnique({ where: { id: userId } });
  assert(
    "Email cá nhân đã được cập nhật thành công trong CSDL",
    checkUserAfterSelfUpdate?.email === selfNewEmail
  );

  // Test đổi sang email sai định dạng -> Từ chối
  const badFormatRes = await updateProfileAction(userId, {
    fullName: "Nguyễn Văn Sai",
    email: "email-sai-dinh-dang",
  });
  assert("Chặn đổi sang email sai định dạng", badFormatRes.success === false);

  // Cleanup
  await deleteUserAction(userId);
  await prisma.userProfile.deleteMany({ where: { userId } });
  await prisma.classEnrollment.deleteMany({ where: { studentId: userId } });
  await prisma.user.delete({ where: { id: userId } });

  console.log("\n=== TẤT CẢ TEST CHÍNH SÁCH BẢO MẬT MẬT KHẨU ĐỀU ĐẠT (PASS) ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
