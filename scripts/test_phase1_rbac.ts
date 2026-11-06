/**
 * BỘ KIỂM THỬ THỰC NGHIỆM ĐỘC LẬP & TẤN CÔNG GIẢ ĐỊNH (ADVERSARIAL VERIFIER)
 * Giai đoạn Phase 1: Auth, Session & RBAC Lockdown
 * Nhánh: feature/phase1-auth-rbac (Commit deff895)
 *
 * Bao phủ 5 ca kiểm thử bắt buộc:
 * 1. Session Hardening & Token Security
 * 2. Mật khẩu bcrypt & Xác nhận triệt tiêu Backdoor
 * 3. Chống rò rỉ bài nộp (IDOR Prevention & Data Isolation)
 * 4. Phân quyền 5 vai trò & Phân quyền Trợ giảng (TEACHING_ASSISTANT)
 * 5. Phân quyền chấm điểm và tạo/xóa bài tập giữa các giáo viên khác lớp
 *
 * Cách chạy: npx tsx scripts/test_phase1_rbac.ts
 */

import assert from "node:assert/strict";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import {
  getSession,
  createSessionToken,
  verifySessionToken,
  hashPassword,
  verifyPassword,
  type SessionPayload,
} from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";
import { authenticateUserService } from "../src/services/auth.service";
import { filterAccessibleClasses } from "../src/lib/accessible-classes";
import {
  checkAuth,
  checkRole,
  checkNotStudent,
  hasRole,
  isAdmin,
  isSchoolManager,
  isTeacherOrTA,
  isStudent,
  ROLE_GROUPS,
} from "../src/lib/permissions";
import {
  getSubmissionsForAssignmentService,
  verifyAssignmentCreationPermission,
  verifyAssignmentDeletionPermission,
  verifySubmissionGradingPermission,
} from "../src/services/assignment.service";
import {
  getSubmissionsForAssignmentAction,
  gradeSubmissionAction,
  createAssignmentAction,
} from "../src/actions/assignments";

let passed = 0;
let failed = 0;
const failureDetails: string[] = [];

async function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err: any) {
    failed++;
    const msg = `  ✗ FAIL: ${name}\n    Lý do: ${err?.message || err}`;
    console.error(msg);
    failureDetails.push(msg);
  }
}

async function main() {
  console.log("==================================================================");
  console.log("  KIỂM THỬ THỰC NGHIỆM ĐỘC LẬP: AUTH & 5-ROLE RBAC LOCKDOWN");
  console.log("  Dự án LMS SIMPACE - Nhánh feature/phase1-auth-rbac (deff895)");
  console.log("==================================================================\n");

  /* =========================================================================
   * CASE 1: SESSION HARDENING & TOKEN SECURITY
   * ========================================================================= */
  console.log("▶ CASE 1: Session Hardening & An toàn JWT Token (src/lib/auth.ts)");

  // Xóa sạch mockSession trên globalStore nếu có
  delete (globalThis as any).mockSession;

  await runTest("1.1. getSession() khi không có cookie/mock trả về null (Triệt tiêu fallback teacher-1)", async () => {
    delete (globalThis as any).mockSession;
    const session = await getSession();
    assert.equal(session, null, "Kỳ vọng session là null khi không có cookie/mock");
    assert.notEqual((session as any)?.userId, "teacher-1", "LỖI: Vẫn còn fallback teacher-1!");
  });

  await runTest("1.2. verifySessionToken() với chuỗi token rác/hỏng trả về null", async () => {
    const invalidToken = "not-a-valid-jwt-token.xyz.123";
    const res = await verifySessionToken(invalidToken);
    assert.equal(res, null);
  });

  await runTest("1.3. verifySessionToken() với token bị giả mạo/chữ ký sai trả về null", async () => {
    // Ký token bằng một khóa bí mật hoàn toàn khác
    const fakeSecret = new TextEncoder().encode("malicious-attacker-secret-key-12345");
    const fakeToken = await new SignJWT({
      userId: "attacker-1",
      username: "attacker",
      email: "attacker@evil.com",
      role: "ADMIN",
      fullName: "Hacker",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(fakeSecret);

    const res = await verifySessionToken(fakeToken);
    assert.equal(res, null, "Token ký bằng secret giả mạo phải bị từ chối 100%");
  });

  await runTest("1.4. verifySessionToken() với token đã hết hạn (Expired Token) trả về null", async () => {
    const validSecret = new TextEncoder().encode(
      process.env.AUTH_SECRET || "simpace-lms-kltn-2026-super-secure-key"
    );
    // Token đã hết hạn từ 10 giây trước
    const expiredToken = await new SignJWT({
      userId: "user-expired",
      username: "expired",
      email: "expired@simpace.vn",
      role: "STUDENT",
      fullName: "Học viên hết hạn",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 100)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(validSecret);

    const res = await verifySessionToken(expiredToken);
    assert.equal(res, null, "Token hết hạn phải bị jwtVerify từ chối");
  });

  await runTest("1.5. createSessionToken() & verifySessionToken() xử lý chính xác payload hợp lệ", async () => {
    const originalPayload: SessionPayload = {
      userId: "test-user-99",
      username: "teacher_test",
      email: "teacher99@simpace.vn",
      role: "TEACHER",
      fullName: "Thầy Giáo Test",
      mustChangePassword: false,
    };

    const token = await createSessionToken(originalPayload);
    assert.ok(typeof token === "string" && token.length > 20);

    const decoded = await verifySessionToken(token);
    assert.ok(decoded);
    assert.equal(decoded.userId, originalPayload.userId);
    assert.equal(decoded.username, originalPayload.username);
    assert.equal(decoded.email, originalPayload.email);
    assert.equal(decoded.role, originalPayload.role);
    assert.equal(decoded.fullName, originalPayload.fullName);
  });

  await runTest("1.6. getSession() phản hồi chính xác khi có mockSession trong môi trường test", async () => {
    const mockUser: SessionPayload = {
      userId: "mock-admin-1",
      username: "admin_test",
      email: "admin@simpace.vn",
      role: "ADMIN",
      fullName: "Admin Test",
    };
    (globalThis as any).mockSession = mockUser;

    const session = await getSession();
    assert.deepEqual(session, mockUser);

    delete (globalThis as any).mockSession;
    const sessionAfterClear = await getSession();
    assert.equal(sessionAfterClear, null);
  });

  /* =========================================================================
   * CASE 2: MẬT KHẨ BCRYPT & XÓA SẠCH BACKDOOR
   * ========================================================================= */
  console.log("\n▶ CASE 2: Mật khẩu bcrypt & Triệt tiêu hoàn toàn Backdoor (src/services/auth.service.ts)");

  let sampleHash = "";
  await runTest("2.1. hashPassword() sinh chuỗi băm chuẩn bcrypt ($2a$ hoặc $2b$)", async () => {
    sampleHash = await hashPassword("SimpaceStrongPass2026@!");
    assert.ok(sampleHash.startsWith("$2a$") || sampleHash.startsWith("$2b$"), "Mật khẩu phải được băm qua bcrypt");
    assert.equal(sampleHash.length, 60, "Bcrypt hash chuẩn có độ dài 60 ký tự");
  });

  await runTest("2.2. verifyPassword() đối chiếu chính xác mật khẩu đúng và chặn mật khẩu sai", async () => {
    const isCorrect = await verifyPassword("SimpaceStrongPass2026@!", sampleHash);
    assert.equal(isCorrect, true);

    const isWrong = await verifyPassword("WrongPassword123", sampleHash);
    assert.equal(isWrong, false);

    const isDifferentCase = await verifyPassword("simpacestrongpass2026@!", sampleHash);
    assert.equal(isDifferentCase, false);
  });

  await runTest("2.3. Tấn công giả định: Thử đăng nhập bằng backdoor 'simpace2026' khi mật khẩu khác", async () => {
    const isBackdoorPassed = await verifyPassword("simpace2026", sampleHash);
    assert.equal(isBackdoorPassed, false, "LỖI AN NINH NGHIÊM TRỌNG: Backdoor simpace2026 vẫn mở!");
  });

  await runTest("2.4. authenticateUserService() chặn tài khoản bị khóa (isActive: false) dù nhập đúng pass", async () => {
    const originalFindFirst = prisma.user.findFirst;
    try {
      const activeHash = await hashPassword("UserPass123");
      // Stub findFirst để mô phỏng user bị khóa
      (prisma.user as any).findFirst = async () => ({
        id: "locked-user-1",
        username: "locked_account",
        email: "locked@simpace.vn",
        isActive: false,
        mustChangePassword: false,
        passwordHash: activeHash,
        role: { code: "STUDENT", name: "Học viên" },
        profile: { fullName: "Học Viên Bị Khóa" },
      });

      const res = await authenticateUserService("locked_account", "UserPass123");
      assert.equal(res.success, false);
      assert.ok(res.error?.includes("bị khóa"));
    } finally {
      prisma.user.findFirst = originalFindFirst;
    }
  });

  await runTest("2.5. authenticateUserService() từ chối khi nhập sai mật khẩu hoặc cố dùng backdoor", async () => {
    const originalFindFirst = prisma.user.findFirst;
    try {
      const realHash = await hashPassword("RealSecretPassword@2026");
      (prisma.user as any).update = async () => ({});
      (prisma.user as any).findFirst = async () => ({
        id: "active-user-1",
        username: "teacher_real",
        email: "teacher@simpace.vn",
        isActive: true,
        mustChangePassword: false,
        passwordHash: realHash,
        role: { code: "TEACHER", name: "Giáo viên" },
        profile: { fullName: "Giáo Viên Thật" },
      });

      // Thử với mật khẩu backdoor simpace2026
      const backdoorAttempt = await authenticateUserService("teacher_real", "simpace2026");
      assert.equal(backdoorAttempt.success, false);
      assert.ok(backdoorAttempt.error?.includes("không chính xác"));

      // Thử với mật khẩu đúng
      const correctAttempt = await authenticateUserService("teacher_real", "RealSecretPassword@2026");
      assert.equal(correctAttempt.success, true);
      if (correctAttempt.success) {
        assert.equal(correctAttempt.user.username, "teacher_real");
      }
    } finally {
      prisma.user.findFirst = originalFindFirst;
    }
  });

  /* =========================================================================
   * CASE 3: CHỐNG RÒ RỈ BÀI NỘP (IDOR PREVENTION & DATA ISOLATION)
   * ========================================================================= */
  console.log("\n▶ CASE 3: Chống rò rỉ bài nộp (IDOR Prevention & Data Isolation)");

  await runTest("3.1. getSubmissionsForAssignmentAction() chặn 100% người chưa đăng nhập (session = null)", async () => {
    delete (globalThis as any).mockSession;
    const res = await getSubmissionsForAssignmentAction("demo-assign-1");
    assert.equal(res.success, false);
    assert.equal(res.submissions.length, 0);
    assert.ok(res.error?.includes("đăng nhập"));
  });

  await runTest("3.2. getSubmissionsForAssignmentService() với role STUDENT chỉ trả về bài của chính mình", async () => {
    // Trong demoAssignments: assignment 'demo-assign-1' có 2 bài của 'demo-student-1' và 1 bài của 'st-1'
    const studentUser = { userId: "demo-student-1", role: "STUDENT" };
    const res = await getSubmissionsForAssignmentService("demo-assign-1", studentUser);

    assert.equal(res.success, true);
    assert.ok(res.submissions.length > 0, "Phải có bài nộp của demo-student-1");
    for (const sub of res.submissions) {
      assert.equal(sub.studentId, "demo-student-1", "Học sinh A KHÔNG ĐƯỢC thấy bài nộp của học sinh khác!");
      assert.notEqual(sub.studentId, "st-1", "LỖI IDOR: Đã rò rỉ bài nộp của học sinh st-1 cho demo-student-1!");
    }
  });

  await runTest("3.3. Học sinh B (st-1) chỉ nhận được bài của B, không thấy bài của Học sinh A (demo-student-1)", async () => {
    const studentUserB = { userId: "st-1", role: "STUDENT" };
    const res = await getSubmissionsForAssignmentService("demo-assign-1", studentUserB);

    assert.equal(res.success, true);
    assert.equal(res.submissions.length, 1);
    assert.equal(res.submissions[0].studentId, "st-1");
  });

  await runTest("3.4. Học sinh không có bài nộp nào trong bài tập nhận về danh sách rỗng (không lộ bài của ai)", async () => {
    const studentNoSub = { userId: "student-ghost-999", role: "STUDENT" };
    const res = await getSubmissionsForAssignmentService("demo-assign-1", studentNoSub);

    assert.equal(res.success, true);
    assert.equal(res.submissions.length, 0, "Học sinh chưa nộp bài phải nhận danh sách rỗng");
  });

  await runTest("3.5. Kiểm thử DB Path: verify whereCondition ép buộc studentId khi truy vấn CSDL", async () => {
    // Đặt DB alive giả định để kiểm tra nhánh Prisma
    (globalThis as any).isDbReachable = true;
    (globalThis as any).lastDbCheckTime = Date.now() + 100000;

    let capturedWhere: any = null;
    const originalFindMany = prisma.assignmentSubmission.findMany;
    try {
      (prisma.assignmentSubmission as any).findMany = async (args: any) => {
        capturedWhere = args.where;
        return [];
      };

      await getSubmissionsForAssignmentService("test-assign-123", {
        userId: "student-victim-id",
        role: "STUDENT",
      });

      assert.ok(capturedWhere, "findMany phải được gọi");
      assert.equal(capturedWhere.assignmentId, "test-assign-123");
      assert.equal(
        capturedWhere.studentId,
        "student-victim-id",
        "Truy vấn CSDL bắt buộc phải có whereCondition.studentId = requestUser.userId"
      );
    } finally {
      prisma.assignmentSubmission.findMany = originalFindMany;
      delete (globalThis as any).isDbReachable;
      delete (globalThis as any).lastDbCheckTime;
    }
  });

  await runTest("3.6. Quản trị viên (ADMIN) có quyền xem toàn bộ bài nộp của bài tập", async () => {
    const adminUser = { userId: "admin-root", role: "ADMIN" };
    const res = await getSubmissionsForAssignmentService("demo-assign-1", adminUser);

    assert.equal(res.success, true);
    assert.ok(res.submissions.length >= 3, "ADMIN phải xem được tất cả các bài nộp");
  });

  /* =========================================================================
   * CASE 4: PHÂN QUYỀN 5 VAI TRÒ & VAI TRÒ TRỢ GIẢNG (filterAccessibleClasses)
   * ========================================================================= */
  console.log("\n▶ CASE 4: Phân quyền 5 vai trò & Trợ giảng TEACHING_ASSISTANT (accessible-classes.ts)");

  const mockClasses = [
    {
      id: "class-ielts-101",
      name: "IELTS Fighter 101",
      isActive: true,
      schoolId: "school-hn-1",
      school: { managerId: "manager-hn-1" },
      assignments: [
        { userId: "teacher-tuan-1", staff: { id: "teacher-tuan-1", role: "TEACHER" } },
        { userId: "ta-linh-1", staff: { id: "ta-linh-1", role: "TEACHING_ASSISTANT" } },
      ],
      enrollments: [
        { studentId: "student-an-1" },
      ],
    },
    {
      id: "class-ielts-202",
      name: "IELTS Master 202",
      isActive: true,
      schoolId: "school-hcm-2",
      school: { managerId: "manager-hcm-2" },
      assignments: [
        { userId: "teacher-hung-2", staff: { id: "teacher-hung-2", role: "TEACHER" } },
        { userId: "ta-mai-2", staff: { id: "ta-mai-2", role: "TEACHING_ASSISTANT" } },
      ],
      enrollments: [
        { studentId: "student-binh-2" },
      ],
    },
    {
      id: "class-archived-999",
      name: "Lớp học đã lưu trữ (InActive)",
      isActive: false,
      schoolId: "school-hn-1",
      school: { managerId: "manager-hn-1" },
      assignments: [
        { userId: "teacher-tuan-1" },
        { userId: "ta-linh-1" },
      ],
      enrollments: [{ studentId: "student-an-1" }],
    },
  ];

  await runTest("4.1. filterAccessibleClasses() cho ADMIN: Thấy tất cả các lớp đang hoạt động (isActive: true)", () => {
    const adminUser = { userId: "admin-1", role: "ADMIN" };
    const accessible = filterAccessibleClasses(mockClasses, adminUser);
    assert.equal(accessible.length, 2);
    assert.deepEqual(
      accessible.map((c) => c.id),
      ["class-ielts-101", "class-ielts-202"]
    );
  });

  await runTest("4.2. filterAccessibleClasses() cho TEACHING_ASSISTANT (ta-linh-1): Nhận đúng lớp 101 được phân công", () => {
    const taUser = { userId: "ta-linh-1", role: "TEACHING_ASSISTANT" };
    const accessible = filterAccessibleClasses(mockClasses, taUser);
    assert.equal(accessible.length, 1);
    assert.equal(accessible[0].id, "class-ielts-101", "Trợ giảng phải thấy lớp mình phụ trách");
  });

  await runTest("4.3. filterAccessibleClasses() cho TEACHING_ASSISTANT: Không được thấy lớp 202 không phụ trách", () => {
    const taUser = { userId: "ta-linh-1", role: "TEACHING_ASSISTANT" };
    const accessible = filterAccessibleClasses(mockClasses, taUser);
    const hasClass202 = accessible.some((c) => c.id === "class-ielts-202");
    assert.equal(hasClass202, false, "Trợ giảng không được thấy lớp không phân công");
  });

  await runTest("4.4. filterAccessibleClasses() cho TEACHER (teacher-tuan-1): Chỉ thấy lớp 101, không thấy lớp 202", () => {
    const teacherUser = { userId: "teacher-tuan-1", role: "TEACHER" };
    const accessible = filterAccessibleClasses(mockClasses, teacherUser);
    assert.equal(accessible.length, 1);
    assert.equal(accessible[0].id, "class-ielts-101");
  });

  await runTest("4.5. filterAccessibleClasses() cho SCHOOL_MANAGER: Chỉ thấy lớp thuộc cơ sở trường mình quản lý", () => {
    const managerHn = { userId: "manager-hn-1", username: "manager_hn", role: "SCHOOL_MANAGER" };
    const accessible = filterAccessibleClasses(mockClasses, managerHn);
    assert.equal(accessible.length, 1);
    assert.equal(accessible[0].id, "class-ielts-101");
  });

  await runTest("4.6. filterAccessibleClasses() cho STUDENT: Chỉ thấy lớp mình đang theo học (enrollments)", () => {
    const studentUser = { userId: "student-an-1", username: "student_an", role: "STUDENT" };
    const accessible = filterAccessibleClasses(mockClasses, studentUser);
    assert.equal(accessible.length, 1);
    assert.equal(accessible[0].id, "class-ielts-101");
  });

  await runTest("4.7. Ca biên: Lớp bị vô hiệu hóa (isActive: false) bị loại bỏ khỏi mọi vai trò", () => {
    const adminUser = { userId: "admin-1", role: "ADMIN" };
    const accessible = filterAccessibleClasses(mockClasses, adminUser);
    const hasArchived = accessible.some((c) => c.id === "class-archived-999");
    assert.equal(hasArchived, false, "Lớp isActive: false phải luôn bị lọc bỏ");
  });

  await runTest("4.8. permissions.ts: Type-guards & Role-groups kiểm tra chính xác 5 vai trò", () => {
    assert.equal(isTeacherOrTA({ userId: "1", username: "u", email: "e", role: "TEACHING_ASSISTANT", fullName: "TA" }), true);
    assert.equal(isTeacherOrTA({ userId: "1", username: "u", email: "e", role: "TEACHER", fullName: "GV" }), true);
    assert.equal(isTeacherOrTA({ userId: "1", username: "u", email: "e", role: "STUDENT", fullName: "HV" }), false);
    assert.equal(isAdmin({ userId: "1", username: "u", email: "e", role: "ADMIN", fullName: "AD" }), true);
    assert.equal(isStudent({ userId: "1", username: "u", email: "e", role: "STUDENT", fullName: "HV" }), true);

    const checkStudentRes = checkNotStudent({ userId: "1", username: "u", email: "e", role: "STUDENT", fullName: "HV" });
    assert.equal(checkStudentRes.ok, false);
  });

  await runTest("4.9. [Adversarial Verification] Phát hiện lỗ hổng tiềm ẩn: accessible-classes.ts thiếu guard kiểm tra tồn tại username", () => {
    // Khi gọi với đối tượng thiếu username (chỉ có userId và role)
    const managerNoUsername = { userId: "manager-hn-1", role: "SCHOOL_MANAGER" };
    const result = filterAccessibleClasses(mockClasses, managerNoUsername);
    // Nếu kết quả trả về 2 lớp (lọt cả class-ielts-202) do undefined === undefined
    const isVulnerable = result.length === 2;
    assert.ok(isVulnerable, "Xác nhận lỗ hổng tồn tại: c.school?.manager?.username === currentUser.username đánh giá undefined === undefined là true");
  });

  /* =========================================================================
   * CASE 5: PHÂN QUYỀN CHẤM ĐIỂM & TẠO/XÓA BÀI TẬP GIỮA CÁC GIÁO VIÊN KHÁC LỚP
   * ========================================================================= */
  console.log("\n▶ CASE 5: Phân quyền Chấm điểm & Tạo/Xóa bài tập giữa các lớp (assignment.service.ts)");

  await runTest("5.1. createAssignmentAction() chặn khi chưa đăng nhập hoặc khi vai trò là STUDENT", async () => {
    delete (globalThis as any).mockSession;
    const unauthRes = await createAssignmentAction({
      title: "Bài tập trái phép",
      skill: "READING",
      type: "HOMEWORK",
      classId: "class-1",
      questions: [],
    });
    assert.equal(unauthRes.success, false);
    assert.ok(unauthRes.error?.includes("đăng nhập") || unauthRes.error?.includes("quyền"));

    // Thử với vai trò STUDENT
    (globalThis as any).mockSession = {
      userId: "student-attacker",
      username: "student_atk",
      email: "atk@simpace.vn",
      role: "STUDENT",
      fullName: "Học sinh tấn công",
    };
    const studentRes = await createAssignmentAction({
      title: "Bài tập học sinh tạo",
      skill: "READING",
      type: "HOMEWORK",
      classId: "class-1",
      questions: [],
    });
    assert.equal(studentRes.success, false);
    assert.ok(studentRes.error?.includes("Chỉ Giáo viên và Quản trị viên"));
    delete (globalThis as any).mockSession;
  });

  await runTest("5.2. createAssignmentAction() chặn TEACHING_ASSISTANT tạo bài tập (Theo quy tắc BR)", async () => {
    (globalThis as any).mockSession = {
      userId: "ta-test-1",
      username: "ta_test",
      email: "ta@simpace.vn",
      role: "TEACHING_ASSISTANT",
      fullName: "Trợ giảng Test",
    };
    const taRes = await createAssignmentAction({
      title: "Bài tập TA tạo",
      skill: "READING",
      type: "HOMEWORK",
      classId: "class-1",
      questions: [],
    });
    assert.equal(taRes.success, false);
    assert.ok(taRes.error?.includes("Chỉ Giáo viên và Quản trị viên"));
    delete (globalThis as any).mockSession;
  });

  await runTest("5.3. verifyAssignmentCreationPermission(): Chặn Giáo viên giao bài cho lớp mình không phụ trách", async () => {
    (globalThis as any).isDbReachable = true;
    (globalThis as any).lastDbCheckTime = Date.now() + 100000;

    const originalFindMany = prisma.classAssignment.findMany;
    try {
      // Giả lập teacher-tuan chỉ được phân công lớp class-ielts-101
      (prisma.classAssignment as any).findMany = async (args: any) => {
        if (args.where.userId === "teacher-tuan-1") {
          return [{ classId: "class-ielts-101" }];
        }
        return [];
      };

      // Thử tạo bài cho lớp class-ielts-202 (lớp không phụ trách)
      const resWrongClass = await verifyAssignmentCreationPermission(
        "teacher-tuan-1",
        "TEACHER",
        ["class-ielts-202"]
      );
      assert.equal(resWrongClass.ok, false);
      if (!resWrongClass.ok) {
        assert.ok(resWrongClass.error.includes("phân công giảng dạy"));
      }

      // Thử tạo bài cho nhiều lớp [101, 202] (chỉ phụ trách 1 trong 2)
      const resMultiClass = await verifyAssignmentCreationPermission(
        "teacher-tuan-1",
        "TEACHER",
        ["class-ielts-101", "class-ielts-202"]
      );
      assert.equal(resMultiClass.ok, false);

      // Thử tạo bài cho đúng lớp 101 phụ trách
      const resCorrect = await verifyAssignmentCreationPermission(
        "teacher-tuan-1",
        "TEACHER",
        ["class-ielts-101"]
      );
      assert.equal(resCorrect.ok, true);

      // ADMIN tạo bài cho bất kỳ lớp nào cũng được duyệt
      const resAdmin = await verifyAssignmentCreationPermission(
        "admin-1",
        "ADMIN",
        ["class-ielts-202"]
      );
      assert.equal(resAdmin.ok, true);
    } finally {
      prisma.classAssignment.findMany = originalFindMany;
      delete (globalThis as any).isDbReachable;
      delete (globalThis as any).lastDbCheckTime;
    }
  });

  await runTest("5.4. verifyAssignmentDeletionPermission(): Chỉ người tạo hoặc giáo viên phụ trách lớp mới được xóa", async () => {
    (globalThis as any).isDbReachable = true;
    (globalThis as any).lastDbCheckTime = Date.now() + 100000;

    const originalFindUnique = prisma.assignment.findUnique;
    try {
      (prisma.assignment as any).findUnique = async () => ({
        createdById: "teacher-creator-1",
        class: {
          assignments: [{ userId: "teacher-assigned-2" }],
        },
        assignedClasses: [],
      });

      // Người tạo xóa -> OK
      const resCreator = await verifyAssignmentDeletionPermission("assign-1", "teacher-creator-1", "TEACHER");
      assert.equal(resCreator.ok, true);

      // Giáo viên phụ trách lớp xóa -> OK
      const resAssigned = await verifyAssignmentDeletionPermission("assign-1", "teacher-assigned-2", "TEACHER");
      assert.equal(resAssigned.ok, true);

      // Giáo viên khác (không phải người tạo, không phụ trách lớp) -> Bị chặn
      const resOther = await verifyAssignmentDeletionPermission("assign-1", "teacher-stranger-3", "TEACHER");
      assert.equal(resOther.ok, false);
      if (!resOther.ok) {
        assert.ok(resOther.error.includes("không phải người tạo hoặc giáo viên phụ trách"));
      }

      // Học sinh xóa -> Bị chặn
      const resStudent = await verifyAssignmentDeletionPermission("assign-1", "student-1", "STUDENT");
      assert.equal(resStudent.ok, false);

      // Admin xóa -> OK
      const resAdmin = await verifyAssignmentDeletionPermission("assign-1", "admin-1", "ADMIN");
      assert.equal(resAdmin.ok, true);
    } finally {
      prisma.assignment.findUnique = originalFindUnique;
      delete (globalThis as any).isDbReachable;
      delete (globalThis as any).lastDbCheckTime;
    }
  });

  await runTest("5.5. gradeSubmissionAction() chặn khi chưa đăng nhập hoặc khi vai trò là STUDENT", async () => {
    delete (globalThis as any).mockSession;
    const unauthRes = await gradeSubmissionAction({
      submissionId: "sub-1",
      gradedAnswers: [],
    });
    assert.equal(unauthRes.success, false);
    assert.ok(unauthRes.error?.includes("đăng nhập") || unauthRes.error?.includes("quyền"));

    (globalThis as any).mockSession = {
      userId: "student-1",
      username: "student",
      email: "st@simpace.vn",
      role: "STUDENT",
      fullName: "Học sinh",
    };
    const studentRes = await gradeSubmissionAction({
      submissionId: "sub-1",
      gradedAnswers: [],
    });
    assert.equal(studentRes.success, false);
    assert.ok(studentRes.error?.includes("Chỉ Giáo viên, Trợ giảng và Quản trị viên"));
    delete (globalThis as any).mockSession;
  });

  await runTest("5.6. verifySubmissionGradingPermission(): Chặn Giáo viên / Trợ giảng chấm bài lớp không phụ trách", async () => {
    (globalThis as any).isDbReachable = true;
    (globalThis as any).lastDbCheckTime = Date.now() + 100000;

    const originalFindUnique = prisma.assignmentSubmission.findUnique;
    try {
      (prisma.assignmentSubmission as any).findUnique = async () => ({
        classId: "class-ielts-101",
        assignment: {
          createdById: "teacher-creator-1",
          class: {
            assignments: [
              { userId: "teacher-assigned-1" },
              { userId: "ta-assigned-1" },
            ],
          },
          assignedClasses: [],
        },
      });

      // Giáo viên phụ trách lớp chấm bài -> OK
      const resTeacher = await verifySubmissionGradingPermission("sub-1", "teacher-assigned-1", "TEACHER");
      assert.equal(resTeacher.ok, true);

      // Trợ giảng phụ trách lớp chấm bài -> OK
      const resTA = await verifySubmissionGradingPermission("sub-1", "ta-assigned-1", "TEACHING_ASSISTANT");
      assert.equal(resTA.ok, true);

      // Giáo viên lớp khác cố chấm bài -> BỊ CHẶN
      const resOtherTeacher = await verifySubmissionGradingPermission("sub-1", "teacher-other-class-2", "TEACHER");
      assert.equal(resOtherTeacher.ok, false);
      if (!resOtherTeacher.ok) {
        assert.ok(resOtherTeacher.error.includes("không được phân công phụ trách lớp học"));
      }

      // Trợ giảng lớp khác cố chấm bài -> BỊ CHẶN
      const resOtherTA = await verifySubmissionGradingPermission("sub-1", "ta-other-class-2", "TEACHING_ASSISTANT");
      assert.equal(resOtherTA.ok, false);

      // Học sinh chấm bài -> BỊ CHẶN
      const resStudent = await verifySubmissionGradingPermission("sub-1", "student-1", "STUDENT");
      assert.equal(resStudent.ok, false);

      // ADMIN chấm bài -> OK
      const resAdmin = await verifySubmissionGradingPermission("sub-1", "admin-1", "ADMIN");
      assert.equal(resAdmin.ok, true);
    } finally {
      prisma.assignmentSubmission.findUnique = originalFindUnique;
      delete (globalThis as any).isDbReachable;
      delete (globalThis as any).lastDbCheckTime;
    }
  });

  /* =========================================================================
   * TỔNG KẾT BÁO CÁO
   * ========================================================================= */
  console.log("\n==================================================================");
  console.log(`  KẾT QUẢ KIỂM THỬ: ${passed} PASS / ${failed} FAIL`);
  if (failed > 0) {
    console.log("  DANH SÁCH THẤT BẠI:");
    failureDetails.forEach((f) => console.log(f));
    console.log("==================================================================");
    process.exit(1);
  } else {
    console.log("  PHÁN QUYẾT: TOÀN BỘ CÁC CA KIỂM THỬ ĐẠT CHUẨN 100%");
    console.log("==================================================================");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("LỖI TOÀN CỤC TRONG TIẾN TRÌNH TEST:", err);
  process.exit(1);
});
