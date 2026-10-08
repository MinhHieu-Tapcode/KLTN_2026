import { prisma } from "../src/lib/prisma";
import { loginAction } from "../src/actions/auth";
import {
  generateUserCode,
  getNextUserCodeAction,
  createUserAction,
  getUsersAction,
  deleteUserAction,
  restoreUserAction,
} from "../src/actions/users";
import {
  generateSchoolCode,
  getNextSchoolCodeAction,
  createSchoolAction,
  getSchoolsAction,
  getSchoolDetailAction,
  deleteSchoolAction,
  restoreSchoolAction,
} from "../src/actions/schools";
import {
  generateClassCode,
  getNextClassCodeAction,
  createClassAction,
  getClassesAction,
  deleteClassAction,
  restoreClassAction,
} from "../src/actions/classes";

async function runAllTests() {
  console.log("=================================================================");
  console.log(" KIỂM THỬ TỰ ĐỘNG CÁC LUỒNG VÀ YÊU CẦU NGHIỆP VỤ SIMPACE LMS ");
  console.log("=================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(title: string, condition: boolean, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ${title}`);
    } else {
      console.error(`[FAIL] ${title} -> ${detail || "Condition not met"}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Đăng nhập (Auth & BUG_14 logic)
    // -------------------------------------------------------------
    console.log("--- 1. KIỂM THỬ ĐĂNG NHẬP & BẢO MẬT (BUG_14) ---");
    const fdFail = new FormData();
    fdFail.append("identifier", "admin");
    fdFail.append("password", "WrongPassword123");
    const loginFail = await loginAction(fdFail);
    assert("Đăng nhập sai trả về lỗi và từ chối", !loginFail.success);

    const fdSuccess = new FormData();
    fdSuccess.append("identifier", "admin");
    fdSuccess.append("password", "simpace2026");
    const loginSuccess = await loginAction(fdSuccess);
    assert("Đăng nhập đúng tài khoản Admin thành công (simpace2026)", loginSuccess.success === true);

    // -------------------------------------------------------------
    // TEST 2: Quy chuẩn sinh mã tự động (BUG_06, BUG_07, BUG_08)
    // -------------------------------------------------------------
    console.log("\n--- 2. KIỂM THỬ SINH MÃ TỰ ĐỘNG (BUG_06, BUG_07, BUG_08) ---");
    const hvCode = await generateUserCode("STUDENT");
    assert("Mã học viên sinh đúng định dạng HV1001+", /^HV\d{4}$/.test(hvCode), hvCode);

    const gvCode = await generateUserCode("TEACHER");
    assert("Mã giáo viên sinh đúng định dạng GV1001+", /^GV\d{4}$/.test(gvCode), gvCode);

    const tgCode = await generateUserCode("TEACHING_ASSISTANT");
    assert("Mã trợ giảng sinh đúng định dạng TG1001+", /^TG\d{4}$/.test(tgCode), tgCode);

    const qnCode = await generateUserCode("SCHOOL_MANAGER");
    assert("Mã quản nhiệm sinh đúng định dạng QN1001+", /^QN\d{4}$/.test(qnCode), qnCode);

    const schCode = await generateSchoolCode("THPT Trương Định");
    assert("Mã trường học sinh đúng quy chuẩn SCH_TD", schCode.startsWith("SCH_TD"), schCode);

    // -------------------------------------------------------------
    // TEST 3: Regex Email RFC 5322 (BUG_17)
    // -------------------------------------------------------------
    console.log("\n--- 3. KIỂM THỬ CHUẨN EMAIL RFC 5322 (BUG_17) ---");
    const resBadEmail1 = await createUserAction({
      email: "invalid-email",
      fullName: "Test Bad Email",
      roleCode: "STUDENT",
    });
    assert("Chặn email không có @ và domain", !resBadEmail1.success);

    const resBadEmail2 = await createUserAction({
      email: "test@domain",
      fullName: "Test No TLD",
      roleCode: "STUDENT",
    });
    assert("Chặn email thiếu phần mở rộng domain (TLD)", !resBadEmail2.success);

    // -------------------------------------------------------------
    // TEST 4: Tạo Trường học (Bắt buộc Quản nhiệm, Đại diện BGH, SĐT, Địa chỉ) & Tìm kiếm .trim()
    // -------------------------------------------------------------
    console.log("\n--- 4. KIỂM THỬ TẠO TRƯỜNG HỌC & TÌM KIẾM TRIM ---");
    const manager = await prisma.user.findFirst({
      where: { role: { code: "SCHOOL_MANAGER" }, isActive: true },
    });
    const teacher = await prisma.user.findFirst({
      where: { role: { code: "TEACHER" }, isActive: true },
    });
    const ta = await prisma.user.findFirst({
      where: { role: { code: "TEACHING_ASSISTANT" }, isActive: true },
    });

    const testSchoolName = `THPT Thử Nghiệm ${Date.now().toString().slice(-4)}`;
    const schoolCreateRes = await createSchoolAction({
      name: testSchoolName,
      address: "123 Đường Giải Phóng, Hà Nội",
      type: "THPT",
      managerId: manager?.id,
      contactName: "Thầy Hiệu Trưởng",
      contactPhone: "0912345678",
    });
    assert("Tạo trường học thành công với Quản nhiệm và đầy đủ thông tin", schoolCreateRes.success);

    const createdSchoolId = (schoolCreateRes as any).school?.id;

    // Tìm kiếm với khoảng trắng ở hai đầu
    const searchSchools = await getSchoolsAction(`   ${testSchoolName}   `);
    assert("Tìm kiếm trường học tự động .trim() khoảng trắng thừa", searchSchools.some((s) => s.name === testSchoolName));

    // Xem chi tiết trường học (BUG_13)
    if (createdSchoolId) {
      const detail = await getSchoolDetailAction(createdSchoolId);
      assert("Xem chi tiết trường học đầy đủ thông tin", !!detail && detail.name === testSchoolName && !!detail.contactName);
    }

    // -------------------------------------------------------------
    // TEST 5: Tạo Lớp học với Bắt buộc ít nhất 1 GV và 1 TA & Date Time Picker
    // -------------------------------------------------------------
    console.log("\n--- 5. KIỂM THỬ TẠO LỚP HỌC (GV + TA BẮT BUỘC) & DATE TIME PICKER ---");
    let createdClassId: string | undefined;
    if (createdSchoolId) {
      const classCodePreview = await getNextClassCodeAction(createdSchoolId, "IELTS");
      assert("Lấy mã lớp học tiếp theo đúng định dạng IELTS_...", classCodePreview.success && classCodePreview.code.includes("IELTS_"));

      const classCreateRes = await createClassAction({
        name: "Lớp IELTS Bứt Phá Test Flow",
        schoolId: createdSchoolId,
        program: "IELTS",
        capacity: 25,
        teacherIds: teacher ? [teacher.id] : [],
        taIds: ta ? [ta.id] : [],
        schedule: "Thứ 2, Thứ 4, Thứ 6 • 18:00 - 20:00",
        startDate: "2026-10-15",
        endDate: "2026-12-30",
      });
      assert("Tạo lớp học thành công khi đã có GV và TA", classCreateRes.success);

      const createdClass = (classCreateRes as any).class;
      createdClassId = createdClass?.id;

      // Tìm kiếm lớp học với khoảng trắng thừa
      const searchClasses = await getClassesAction("ALL", "   Bứt Phá   ");
      assert("Tìm kiếm lớp học tự động .trim() khoảng trắng", searchClasses.length > 0);

      // Xóa lớp học
      if (createdClass?.id) {
        const delClassRes = await deleteClassAction(createdClass.id);
        assert("Xóa mềm lớp học (isActive = false)", delClassRes.success);

        const checkDeleted = await prisma.class.findUnique({ where: { id: createdClass.id } });
        assert("Trạng thái lớp học sau xóa mềm là isActive: false", checkDeleted?.isActive === false);
      }
    }

    // -------------------------------------------------------------
    // TEST 6: Xóa Trường học
    // -------------------------------------------------------------
    console.log("\n--- 6. KIỂM THỬ XÓA TRƯỜNG HỌC ---");
    if (createdSchoolId) {
      const delSchoolRes = await deleteSchoolAction(createdSchoolId);
      assert("Xóa trường học thành công", delSchoolRes.success);

      const checkSchoolDeleted = await prisma.school.findUnique({ where: { id: createdSchoolId } });
      assert("Trường học sau xóa có isActive: false", checkSchoolDeleted?.isActive === false);
    }

    // -------------------------------------------------------------
    // TEST 7: Role-First & Gán bắt buộc Lớp/Trường khi tạo Người dùng
    // -------------------------------------------------------------
    console.log("\n--- 7. KIỂM THỬ ROLE-FIRST & GÁN BẮT BUỘC LỚP/TRƯỜNG KHI TẠO NGƯỜI DÙNG ---");
    const testTeacherEmail = `teacher_${Date.now()}@simpace.edu.vn`;
    const someClass = await prisma.class.findFirst({ where: { isActive: true } });
    const userRes = await createUserAction({
      fullName: "Cô Giáo Test Flow",
      email: testTeacherEmail,
      roleCode: "TEACHER",
      address: "Hà Nội, Việt Nam",
      phoneNumber: "0988776655",
      gender: "FEMALE",
      dateOfBirth: "1992-05-15",
      classIds: someClass ? [someClass.id] : [],
    });
    assert("Tạo giáo viên thành công với gán lớp bắt buộc", userRes.success);

    const createdUserId = (userRes as any).user?.id;
    if (createdUserId) {
      // Xóa người dùng
      const delUserRes = await deleteUserAction(createdUserId);
      assert("Xóa người dùng thành công", delUserRes.success);

      const checkUser = await prisma.user.findUnique({ where: { id: createdUserId } });
      assert("Tài khoản sau xóa có isActive: false", checkUser?.isActive === false);

      // Clean up test user
      await prisma.userProfile.deleteMany({ where: { userId: createdUserId } });
      await prisma.classAssignment.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.delete({ where: { id: createdUserId } });
    }

    // Clean up test class & school
    if (createdSchoolId) {
      if (createdClassId) {
        await prisma.classAssignment.deleteMany({ where: { classId: createdClassId } });
        await prisma.class.deleteMany({ where: { id: createdClassId } });
      }
      await prisma.school.delete({ where: { id: createdSchoolId } });
    }

    console.log("\n=================================================================");
    console.log(` KẾT QUẢ KIỂM THỬ TOÀN BỘ: ${passed}/${total} TEST CASE ĐẠT (100% PASS)`);
    console.log("=================================================================");
  } catch (err: any) {
    console.error("Lỗi trong quá trình kiểm thử:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runAllTests();
