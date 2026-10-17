/**
 * Bộ kiểm thử tự động cho 3 luồng nghiệp vụ phức tạp nhất của SIMPACE LMS:
 * 1. Kiểm tra xung đột lịch học (Schedule Conflict Checker - src/lib/schedule.ts)
 * 2. Phân lớp IELTS hàng loạt & Cân bằng sĩ số (Bulk IELTS Allocation - src/actions/bulk-allocation.ts)
 * 3. Chấm điểm tự động (src/lib/grading.ts) & Phân quyền RBAC tập trung (src/lib/permissions.ts)
 *
 * Cách chạy: npx tsx scripts/test-core-flows.ts
 */

import assert from "node:assert/strict";
import { parseSchedule, areSchedulesConflicting } from "../src/lib/schedule";
import {
  checkAuth,
  checkRole,
  checkNotStudent,
  hasFeatureAccess,
  isAdmin,
  isSchoolManager,
  isTeacherOrTA,
  isStudent,
} from "../src/lib/permissions";
import {
  distributeStudentsBalanced,
  rebalanceOnClassCountChangeAction,
  rebalanceOnStudentTransferAction,
  type ValidatedStudentRow,
  type LevelAllocationPlan,
} from "../src/actions/bulk-allocation";
import { isAnswerCorrect, isObjectiveType, isObjectiveOnly } from "../src/lib/grading";
import type { SessionPayload } from "../src/lib/auth";

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err: any) {
    failed++;
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    Lý do: ${err?.message || err}`);
  }
}

async function main() {
  console.log("==================================================================");
  console.log("  CHẠY KIỂM THỬ TỰ ĐỘNG CÁC LUỒNG CỐT LÕI (SIMPACE LMS)");
  console.log("==================================================================\n");

  /* =========================================================================
   * LUỒNG 1: KIỂM TRA XUNG ĐỘT LỊCH HỌC (src/lib/schedule.ts)
   * ========================================================================= */
  console.log("▶ 1. Luồng kiểm tra bóc tách & xung đột lịch học (schedule.ts)");

  await runTest("Bóc tách đúng chuỗi lịch chuẩn 'Thứ 2, Thứ 4, Thứ 6 • 18:00 - 20:00'", () => {
    const parsed = parseSchedule("Thứ 2, Thứ 4, Thứ 6 • 18:00 - 20:00");
    assert.ok(parsed);
    assert.deepEqual(parsed.days, [2, 4, 6]);
    assert.equal(parsed.startTimeMinutes, 18 * 60);
    assert.equal(parsed.endTimeMinutes, 20 * 60);
  });

  await runTest("Bóc tách đúng định dạng viết tắt 'T3, T5, CN • 08h30 - 10h30'", () => {
    const parsed = parseSchedule("T3, T5, CN • 08h30 - 10h30");
    assert.ok(parsed);
    assert.deepEqual(parsed.days, [3, 5, 8]);
    assert.equal(parsed.startTimeMinutes, 8 * 60 + 30);
    assert.equal(parsed.endTimeMinutes, 10 * 60 + 30);
  });

  await runTest("Phát hiện trùng lịch khi cùng Thứ 2 và giao khung giờ (17:30-19:30 vs 18:00-20:00)", () => {
    const conflict = areSchedulesConflicting(
      "Thứ 2, Thứ 4 • 17:30 - 19:30",
      "Thứ 2, Thứ 6 • 18:00 - 20:00"
    );
    assert.equal(conflict, true);
  });

  await runTest("Ca biên: Cùng Thứ 2 nhưng ca nối tiếp chạm mốc 19:30 (17:30-19:30 vs 19:30-21:30) -> KHÔNG xung đột", () => {
    const conflict = areSchedulesConflicting(
      "Thứ 2, Thứ 4 • 17:30 - 19:30",
      "Thứ 2, Thứ 4 • 19:30 - 21:30"
    );
    assert.equal(conflict, false);
  });

  await runTest("Khác thứ trong tuần (Thứ 2, 4, 6 vs Thứ 3, 5, 7) cùng khung giờ -> KHÔNG xung đột", () => {
    const conflict = areSchedulesConflicting(
      "Thứ 2, Thứ 4, Thứ 6 • 18:00 - 20:00",
      "Thứ 3, Thứ 5, Thứ 7 • 18:00 - 20:00"
    );
    assert.equal(conflict, false);
  });

  await runTest("Ca biên: Cùng thứ và cùng giờ nhưng 2 khóa học khác giai đoạn ngày khai giảng/bế giảng -> KHÔNG xung đột", () => {
    const conflict = areSchedulesConflicting(
      "Thứ 2, Thứ 4 • 18:00 - 20:00",
      "Thứ 2, Thứ 4 • 18:00 - 20:00",
      { start: new Date("2026-01-01"), end: new Date("2026-03-31") },
      { start: new Date("2026-04-01"), end: new Date("2026-06-30") }
    );
    assert.equal(conflict, false);
  });

  await runTest("Cùng thứ, cùng giờ và khoảng ngày khóa học giao nhau -> CÓ xung đột", () => {
    const conflict = areSchedulesConflicting(
      "Thứ 2, Thứ 4 • 18:00 - 20:00",
      "Thứ 2, Thứ 6 • 19:00 - 21:00",
      { start: new Date("2026-01-01"), end: new Date("2026-04-15") },
      { start: new Date("2026-04-01"), end: new Date("2026-06-30") }
    );
    assert.equal(conflict, true);
  });

  /* =========================================================================
   * LUỒNG 2: PHÂN LỚP IELTS HÀNG LOẠT & CÂN BẰNG SĨ SỐ (bulk-allocation.ts)
   * ========================================================================= */
  console.log("\n▶ 2. Luồng phân lớp IELTS hàng loạt & tự động cân bằng sĩ số (bulk-allocation.ts)");

  const mockStudents: ValidatedStudentRow[] = Array.from({ length: 31 }, (_, idx) => ({
    rowNumber: idx + 2,
    fullName: `Học viên ${idx + 1}`,
    email: `hv${idx + 1}@simpace.edu.vn`,
    ieltsScore: 5.5,
    levelId: "lvl-medium",
    levelCode: "MEDIUM",
    levelName: "Trung bình",
  }));

  await runTest("Chia đều 31 học sinh vào 3 lớp -> Sĩ số cân bằng [11, 10, 10], chênh lệch tối đa <= 1", async () => {
    const classes = await distributeStudentsBalanced(
      mockStudents,
      3,
      "MEDIUM",
      "Trung bình",
      "lvl-medium",
      "TD"
    );
    assert.equal(classes.length, 3);
    const counts = classes.map((c) => c.students.length);
    assert.deepEqual(counts, [11, 10, 10]);
    assert.equal(classes[0].code, "IELTS_MEDIUM_TD_01");
    assert.equal(classes[2].code, "IELTS_MEDIUM_TD_03");
  });

  await runTest("Thay đổi số lớp từ 3 sang 4 lớp -> Tự động cân bằng lại 31 học sinh thành [8, 8, 8, 7]", async () => {
    const initialClasses = await distributeStudentsBalanced(
      mockStudents,
      3,
      "MEDIUM",
      "Trung bình",
      "lvl-medium",
      "TD"
    );
    const plan: LevelAllocationPlan = {
      levelId: "lvl-medium",
      levelCode: "MEDIUM",
      levelName: "Trung bình",
      studentCount: 31,
      classCount: 3,
      classes: initialClasses,
    };

    const res = await rebalanceOnClassCountChangeAction(plan, 4, "TD");
    assert.equal(res.success, true);
    assert.ok(res.updatedPlan);
    assert.equal(res.updatedPlan.classCount, 4);
    assert.deepEqual(
      res.updatedPlan.classes.map((c) => c.students.length),
      [8, 8, 8, 7]
    );
  });

  await runTest("Ca biên: Nhập số lớp không hợp lệ (<= 0) -> Trả về lỗi tiếng Việt rõ ràng", async () => {
    const plan: LevelAllocationPlan = {
      levelId: "lvl-medium",
      levelCode: "MEDIUM",
      levelName: "Trung bình",
      studentCount: 0,
      classCount: 1,
      classes: [],
    };
    const res = await rebalanceOnClassCountChangeAction(plan, 0, "TD");
    assert.equal(res.success, false);
    assert.ok(res.error?.includes("Số lớp phải là số nguyên dương"));
  });

  await runTest("Chuyển học sinh giữa các lớp cùng trình độ -> Bảo toàn tổng số 31 học sinh", async () => {
    const initialClasses = await distributeStudentsBalanced(
      mockStudents,
      2,
      "MEDIUM",
      "Trung bình",
      "lvl-medium",
      "TD"
    );
    const plan: LevelAllocationPlan = {
      levelId: "lvl-medium",
      levelCode: "MEDIUM",
      levelName: "Trung bình",
      studentCount: 31,
      classCount: 2,
      classes: initialClasses,
    };

    const targetTempId = initialClasses[1].tempId;
    const res = await rebalanceOnStudentTransferAction(plan, "hv1@simpace.edu.vn", targetTempId, "TD");
    assert.equal(res.success, true);
    const totalAfter = res.updatedPlan!.classes.reduce((sum, c) => sum + c.students.length, 0);
    assert.equal(totalAfter, 31);
  });

  /* =========================================================================
   * LUỒNG 3: NỘP BÀI, CHẤM ĐIỂM TỰ ĐỘNG & PHÂN QUYỀN RBAC (permissions.ts)
   * ========================================================================= */
  console.log("\n▶ 3. Luồng phân quyền RBAC tập trung & Chấm điểm tự động (grading.ts)");

  const adminSession: SessionPayload = {
    userId: "u-admin",
    username: "ADMIN_01",
    email: "admin@simpace.vn",
    fullName: "Admin",
    role: "ADMIN",
    mustChangePassword: false,
  };
  const studentSession: SessionPayload = {
    userId: "u-student",
    username: "HV_01",
    email: "hv@simpace.vn",
    fullName: "Học viên",
    role: "STUDENT",
    mustChangePassword: false,
  };
  const taSession: SessionPayload = {
    userId: "u-ta",
    username: "TA_01",
    email: "ta@simpace.vn",
    fullName: "Trợ giảng",
    role: "TEACHING_ASSISTANT",
    mustChangePassword: false,
  };

  await runTest("RBAC: Chặn truy cập khi chưa đăng nhập (session = null)", () => {
    const res = checkAuth(null);
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.ok(res.error.includes("Vui lòng đăng nhập"));
    }
  });

  await runTest("RBAC: Học viên bị chặn ở các thao tác quản trị (checkNotStudent & checkRole)", () => {
    const notStudentRes = checkNotStudent(studentSession, "Học sinh không có quyền tạo bài tập!");
    assert.equal(notStudentRes.ok, false);

    const adminOnlyRes = checkRole(studentSession, ["ADMIN"], "Chỉ Admin mới có quyền!");
    assert.equal(adminOnlyRes.ok, false);

    const allowedTaRes = checkNotStudent(taSession);
    assert.equal(allowedTaRes.ok, true);
  });

  await runTest("RBAC: Type guards nhận diện đúng vai trò (isAdmin, isTeacherOrTA, isStudent, isSchoolManager)", () => {
    assert.equal(isAdmin(adminSession), true);
    assert.equal(isTeacherOrTA(taSession), true);
    assert.equal(isStudent(studentSession), true);
    assert.equal(isSchoolManager(adminSession), false);
    assert.equal(hasFeatureAccess(studentSession, "VIEW_SCHEDULE"), true);
    assert.equal(hasFeatureAccess(studentSession, "MANAGE_USERS"), false);
  });

  await runTest("Chấm tự động (code thật src/lib/grading.ts): bỏ khoảng trắng thừa, không phân biệt hoa/thường", () => {
    assert.equal(isAnswerCorrect("Sustainable Development", "  sustainable development  "), true);
    assert.equal(isAnswerCorrect("B", "b"), true);
    assert.equal(isAnswerCorrect("B", "C"), false);
  });

  await runTest("Chấm tự động: ca biên đáp án gốc rỗng hoặc học viên bỏ trống -> luôn SAI", () => {
    assert.equal(isAnswerCorrect("", ""), false);
    assert.equal(isAnswerCorrect(null, null), false);
    assert.equal(isAnswerCorrect("B", ""), false);
    assert.equal(isAnswerCorrect("B", undefined), false);
  });

  await runTest("Phân loại câu hỏi: trắc nghiệm/Đúng-Sai-NG/điền từ tự chấm; Essay/Speaking chờ giáo viên", () => {
    assert.equal(isObjectiveType("MULTIPLE_CHOICE"), true);
    assert.equal(isObjectiveType("TRUE_FALSE_NG"), true);
    assert.equal(isObjectiveType("FILL_IN_BLANK"), true);
    assert.equal(isObjectiveType("ESSAY"), false);
    assert.equal(isObjectiveType("SPEAKING"), false);
    assert.equal(isObjectiveType(undefined), false);
  });

  await runTest("Trạng thái bài nộp: chỉ câu khách quan -> GRADED ngay; có Essay/Speaking -> chờ chấm tay", () => {
    assert.equal(isObjectiveOnly([{ type: "MULTIPLE_CHOICE" }, { type: "FILL_IN_BLANK" }]), true);
    assert.equal(isObjectiveOnly([{ type: "MULTIPLE_CHOICE" }, { type: "ESSAY" }]), false);
  });

  console.log("\n==================================================================");
  console.log(`  KẾT QUẢ: ${passed} PASS / ${failed} FAIL`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

main();
