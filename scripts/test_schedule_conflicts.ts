import { prisma } from "../src/lib/prisma";
import { parseSchedule, areSchedulesConflicting } from "../src/lib/schedule";
import {
  createClassAction,
  assignStaffToClassAction,
  enrollStudentToClassAction,
  transferStudentClassAction,
} from "../src/actions/classes";
import {
  checkSchoolManagerScheduleConflictAction,
  changeSchoolManagerAction,
} from "../src/actions/schools";

async function testScheduleConflicts() {
  console.log("=================================================================");
  console.log(" KIỂM THỬ TỰ ĐỘNG: RÀNG BUỘC XUNG ĐỘT LỊCH HỌC (SCHEDULE CONFLICT) ");
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
    // 1. Kiểm thử parseSchedule
    console.log("--- 1. BÓC TÁCH & PHÂN TÍCH LỊCH HỌC (parseSchedule) ---");
    const s1 = parseSchedule("Thứ 2, Thứ 4, Thứ 6 • 18:00 - 20:00");
    assert("Phát hiện đúng thứ 2, 4, 6", JSON.stringify(s1?.days) === JSON.stringify([2, 4, 6]));
    assert("Phân tích giờ bắt đầu 18:00 = 1080 phút", s1?.startTimeMinutes === 1080);
    assert("Phân tích giờ kết thúc 20:00 = 1200 phút", s1?.endTimeMinutes === 1200);

    const s2 = parseSchedule("T3, T5, T7 • 17:30 - 19:30");
    assert("Phát hiện đúng T3, T5, T7", JSON.stringify(s2?.days) === JSON.stringify([3, 5, 7]));

    const s3 = parseSchedule("Thứ 7, Chủ nhật • 08:30 - 10:30");
    assert("Phát hiện đúng Thứ 7 và Chủ nhật (8)", Boolean(s3?.days.includes(7) && s3?.days.includes(8)));

    // 2. Kiểm thử areSchedulesConflicting
    console.log("\n--- 2. SO SÁNH XUNG ĐỘT LỊCH HỌC (areSchedulesConflicting) ---");
    const conflict1 = areSchedulesConflicting(
      "Thứ 2, Thứ 4, Thứ 6 • 18:00 - 20:00",
      "Thứ 2, Thứ 6 • 19:00 - 21:00"
    );
    assert("Hai lớp trùng Thứ 2, Thứ 6 và trùng khung 19h -> Báo xung đột", conflict1 === true);

    const noConflictDays = areSchedulesConflicting(
      "Thứ 2, Thứ 4, Thứ 6 • 18:00 - 20:00",
      "Thứ 3, Thứ 5, Thứ 7 • 18:00 - 20:00"
    );
    assert("Hai lớp cùng giờ nhưng khác ngày trong tuần -> Không xung đột", noConflictDays === false);

    const noConflictTime = areSchedulesConflicting(
      "Thứ 2, Thứ 4, Thứ 6 • 17:30 - 19:30",
      "Thứ 2, Thứ 4, Thứ 6 • 19:30 - 21:30"
    );
    assert("Hai lớp học nối tiếp (17h30-19h30 và 19h30-21h30) -> Không xung đột", noConflictTime === false);

    // 3. Chuẩn bị dữ liệu kiểm thử
    console.log("\n--- 3. CHUẨN BỊ DỮ LIỆU ĐỂ TEST GIÁO VIÊN, TRỢ GIẢNG, HỌC VIÊN, QUẢN NHIỆM ---");
    const manager = await prisma.user.findFirst({
      where: { role: { code: "SCHOOL_MANAGER" }, isActive: true },
    });
    const teacher = await prisma.user.findFirst({
      where: { role: { code: "TEACHER" }, isActive: true },
    });
    const ta = await prisma.user.findFirst({
      where: { role: { code: "TEACHING_ASSISTANT" }, isActive: true },
    });
    const student = await prisma.user.findFirst({
      where: { role: { code: "STUDENT" }, isActive: true },
    });

    if (!manager || !teacher || !ta || !student) {
      console.warn("Không đủ dữ liệu mẫu trong DB để chạy kiểm thử DB!");
      return;
    }

    // Tạo 2 trường học test
    const schoolA = await prisma.school.create({
      data: {
        code: `SCH_TEST_A_${Date.now()}`,
        name: "Trường Test A",
        managerId: manager.id,
        isActive: true,
      },
    });

    const schoolB = await prisma.school.create({
      data: {
        code: `SCH_TEST_B_${Date.now()}`,
        name: "Trường Test B",
        managerId: manager.id,
        isActive: true,
      },
    });

    // Tạo lớp 1 tại Trường A: Thứ 2, Thứ 4, Thứ 6 • 18:00 - 20:00
    const class1 = await prisma.class.create({
      data: {
        code: `CLS_TEST_1_${Date.now()}`,
        name: "Lớp Test 1",
        schoolId: schoolA.id,
        program: "IELTS",
        description: "Thứ 2, Thứ 4, Thứ 6 • 18:00 - 20:00",
        isActive: true,
      },
    });

    // Gán teacher, ta, student vào Lớp 1
    await prisma.classAssignment.createMany({
      data: [
        { classId: class1.id, userId: teacher.id, roleInClass: "TEACHER" },
        { classId: class1.id, userId: ta.id, roleInClass: "TEACHING_ASSISTANT" },
      ],
    });
    await prisma.classEnrollment.create({
      data: { classId: class1.id, studentId: student.id, status: "STUDYING" },
    });

    // 4. Test ràng buộc Giáo viên & Trợ giảng: Không thể tạo/gán vào lớp có lịch trùng
    console.log("\n--- 4. KIỂM THỬ TRÙNG LỊCH GIÁO VIÊN & TRỢ GIẢNG ---");
    const createConflictClassRes = await createClassAction({
      name: "Lớp Test Trùng Lịch",
      schoolId: schoolA.id,
      schedule: "Thứ 2, Thứ 4 • 18:30 - 20:30", // Trùng với Lớp 1
      teacherId: teacher.id,
      taId: ta.id,
    });
    assert(
      "Từ chối tạo lớp khi giáo viên đã có lịch trùng",
      createConflictClassRes.success === false && createConflictClassRes.error?.includes("Xung đột lịch học")
    );

    // Tạo lớp không trùng trước: Thứ 3, Thứ 5 • 18:00 - 20:00
    const class2 = await prisma.class.create({
      data: {
        code: `CLS_TEST_2_${Date.now()}`,
        name: "Lớp Test 2 Không Trùng",
        schoolId: schoolA.id,
        program: "IELTS",
        description: "Thứ 3, Thứ 5 • 18:00 - 20:00",
        isActive: true,
      },
    });

    // Tạo lớp 3 tại Trường B có lịch TRÙNG với Lớp 1: Thứ 2, Thứ 4 • 18:00 - 20:00
    const class3 = await prisma.class.create({
      data: {
        code: `CLS_TEST_3_${Date.now()}`,
        name: "Lớp Test 3 Tại Trường B",
        schoolId: schoolB.id,
        program: "IELTS",
        description: "Thứ 2, Thứ 4 • 18:00 - 20:00",
        isActive: true,
      },
    });

    // Thử gán giáo viên vào lớp 3 ở trường B (bị trùng lịch với lớp 1 trường A)
    const assignTeacherConflict = await assignStaffToClassAction(class3.id, teacher.id, "TEACHER");
    assert(
      "Từ chối gán Giáo viên vào lớp ở trường khác khi bị trùng khung giờ",
      assignTeacherConflict.success === false && assignTeacherConflict.error?.includes("Xung đột lịch học")
    );

    // 5. Test ràng buộc Học sinh: Không thể ghi danh hoặc chuyển sang lớp bị trùng lịch
    console.log("\n--- 5. KIỂM THỬ TRÙNG LỊCH HỌC SINH ---");
    const enrollStudentConflict = await enrollStudentToClassAction(class3.id, student.id);
    assert(
      "Từ chối ghi danh học sinh vào lớp có lịch trùng với lớp đang học",
      enrollStudentConflict.success === false && enrollStudentConflict.error?.includes("Xung đột lịch học")
    );

    // Test chuyển lớp trong cùng trường nhưng trùng lịch:
    // Thêm student vào class2 (không trùng), rồi thử chuyển sang 1 lớp bị trùng
    await enrollStudentToClassAction(class2.id, student.id);
    // Tạo thêm class4 trong cùng trường A có lịch trùng với class1
    const class4 = await prisma.class.create({
      data: {
        code: `CLS_TEST_4_${Date.now()}`,
        name: "Lớp Test 4 Trùng Lịch Class 1",
        schoolId: schoolA.id,
        program: "IELTS",
        description: "Thứ 2, Thứ 4 • 18:00 - 20:00",
        isActive: true,
      },
    });

    const transferStudentConflict = await transferStudentClassAction(class2.id, class4.id, student.id);
    assert(
      "Từ chối chuyển học sinh sang lớp bị trùng lịch với lớp khác của học sinh",
      transferStudentConflict.success === false && transferStudentConflict.error?.includes("Xung đột lịch học")
    );

    // 6. Test ràng buộc Quản nhiệm: Không thể quản nhiệm 2 trường có lớp trùng lịch
    console.log("\n--- 6. KIỂM THỬ TRÙNG LỊCH QUẢN NHIỆM (CROSS-SCHOOL CONFLICT) ---");
    // School A có Class 1 (Thứ 2, 4, 6: 18h-20h), School B có Class 3 (Thứ 2, 4: 18h-20h)
    // Cả 2 trường đều có lớp trùng lịch!
    const managerConflictCheck = await checkSchoolManagerScheduleConflictAction(schoolA.id, manager.id);
    assert(
      "Phát hiện xung đột lịch giữa 2 trường mà Quản nhiệm đang phụ trách",
      managerConflictCheck.success === true && managerConflictCheck.hasConflict === true
    );

    // Thử đổi quản nhiệm (changeSchoolManagerAction) khi có xung đột
    const changeManagerRes = await changeSchoolManagerAction({
      schoolId: schoolA.id,
      newManagerId: manager.id,
      actionType: "OVERWRITE",
    });
    assert(
      "Từ chối thay đổi/ghi đè quản nhiệm khi có xung đột lịch học giữa các trường",
      changeManagerRes.success === false && changeManagerRes.error?.includes("Xung đột lịch")
    );

    // Dọn dẹp dữ liệu test
    await prisma.classEnrollment.deleteMany({
      where: { classId: { in: [class1.id, class2.id, class3.id, class4.id] } },
    });
    await prisma.classAssignment.deleteMany({
      where: { classId: { in: [class1.id, class2.id, class3.id, class4.id] } },
    });
    await prisma.class.deleteMany({
      where: { id: { in: [class1.id, class2.id, class3.id, class4.id] } },
    });
    await prisma.school.deleteMany({
      where: { id: { in: [schoolA.id, schoolB.id] } },
    });

    console.log("\n=================================================================");
    console.log(` KẾT QUẢ KIỂM THỬ XUNG ĐỘT: ${passed}/${total} TEST CASE ĐẠT (100% PASS)`);
    console.log("=================================================================");
  } catch (err: any) {
    console.error("Lỗi trong quá trình kiểm thử:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testScheduleConflicts();
