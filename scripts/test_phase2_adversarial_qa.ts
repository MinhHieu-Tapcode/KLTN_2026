import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import {
  submitAssignmentService,
  getAssignmentDetailService,
} from "../src/services/assignment.service";
import {
  getClassDetailService,
  createClassService,
} from "../src/services/class.service";
import { getUsersService } from "../src/services/user.service";
import {
  getMaterialFoldersService,
  getLearningMaterialsService,
} from "../src/services/material.service";
import {
  determineIeltsLevelService,
  createIeltsLevelService,
  checkScoreOverlapService,
  normalizeIeltsLevelCode,
} from "../src/services/ielts-levels.service";
import {
  areSchedulesConflicting,
  validateScheduleString,
  parseSchedule,
} from "../src/lib/schedule";

let passedCount = 0;
let failedCount = 0;

async function runTest(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    -> ${err.message}`);
    failedCount++;
    throw err;
  }
}

async function runAdversarialTestSuite() {
  console.log("==================================================================");
  console.log("  KIỂM THỬ TẤN CÔNG ỨNG SUẤT ĐỘC LẬP (ADVERSARIAL STRESS-TEST)");
  console.log("  Phase 2: Database, Service, Mock Fallback & Toàn vẹn Dữ liệu");
  console.log("  Agent: qa_phase2_1 (Archetype: teamwork_challenger)");
  console.log("==================================================================");

  // Lưu lại các method gốc của Prisma để khôi phục sau test
  const originalAssignmentFindUnique = prisma.assignment.findUnique;
  const originalAssignmentSubmissionCreate = prisma.assignmentSubmission.create;
  const originalAssignmentSubmissionCount = prisma.assignmentSubmission.count;
  const originalUserFindMany = prisma.user.findMany;
  const originalFolderFindMany = prisma.materialFolder.findMany;
  const originalMaterialFindMany = prisma.learningMaterial.findMany;
  const originalClassCreate = prisma.class.create;
  const originalClassFindUnique = prisma.class.findUnique;
  const originalClassAssignmentFindMany = prisma.classAssignment.findMany;
  const originalIeltsLevelFindMany = prisma.ieltsLevel.findMany;
  const originalNotificationCreateMany = (prisma as any).notification?.createMany;

  // Giả lập môi trường Database alive thông qua biến môi trường Cloud
  const originalDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://postgres:mockpassword@mock-db.supabase.co:5432/postgres";
  (prisma.classAssignment.findMany as any) = async () => [];
  if ((prisma as any).notification) {
    (prisma as any).notification.createMany = async () => ({ count: 0 });
  }

  try {
    /* =========================================================================
     * NHÓM 1: CHỐNG P2003 & TOÀN VẸN KHÓA NGOẠI (ORPHAN QUESTION FILTERING)
     * ========================================================================= */
    console.log("\n▶ NHÓM 1: Chống P2003 & Lọc sạch bản ghi mồ côi (Orphan Foreign Keys)");

    await runTest("1.1. submitAssignmentService tự động lọc bỏ questionId mồ côi/không tồn tại", async () => {
      let createdDataPassedToPrisma: any = null;

      // Mock assignment có 1 câu hỏi thật
      (prisma.assignment.findUnique as any) = async () => ({
        id: "assign-real-1",
        title: "Bài tập kiểm thử P2003",
        dueDate: new Date(Date.now() + 86400000),
        maxAttempts: 3,
        questions: [
          { id: "q-real-1", points: 10, type: "MULTIPLE_CHOICE", correctAnswer: "A" },
        ],
        assignedClasses: [],
      });

      (prisma.assignmentSubmission.count as any) = async () => 0;

      (prisma.assignmentSubmission.create as any) = async (args: any) => {
        createdDataPassedToPrisma = args.data;
        return {
          id: "sub-101",
          score: 10,
          totalPoints: 10,
          isCheatingFlagged: false,
        };
      };

      // Gửi payload chứa 1 câu hỏi thật và 2 câu hỏi mồ côi
      const res = await submitAssignmentService(
        {
          assignmentId: "assign-real-1",
          answers: [
            { questionId: "q-real-1", studentAnswer: "A" },
            { questionId: "orphan-q-9999", studentAnswer: "B" },
            { questionId: "ghost-q-xyz", studentAnswer: "C" },
          ],
          tabSwitchCount: 0,
          isCheatingFlagged: false,
        },
        { userId: "student-1", email: "student@simpace.vn" }
      );

      assert.equal(res.success, true);
      assert.ok(createdDataPassedToPrisma, "Prisma create phải được gọi");
      const createdAnswers = createdDataPassedToPrisma.answers.create;
      assert.equal(createdAnswers.length, 1, "Chỉ duy nhất 1 câu hỏi hợp lệ được phép truyền xuống DB");
      assert.equal(createdAnswers[0].questionId, "q-real-1");
      assert.equal(createdAnswers[0].awardedPoints, 10);
    });

    await runTest("1.2. submitAssignmentService an toàn khi 100% questionId đều là mồ côi", async () => {
      let createdAnswersCount = -1;

      (prisma.assignmentSubmission.create as any) = async (args: any) => {
        createdAnswersCount = args.data.answers.create.length;
        return { id: "sub-102", score: 0, totalPoints: 0 };
      };

      const res = await submitAssignmentService(
        {
          assignmentId: "assign-real-1",
          answers: [
            { questionId: "orphan-1", studentAnswer: "A" },
            { questionId: "orphan-2", studentAnswer: "B" },
          ],
          tabSwitchCount: 0,
          isCheatingFlagged: false,
        },
        { userId: "student-1", email: "student@simpace.vn" }
      );

      assert.equal(res.success, true);
      assert.equal(createdAnswersCount, 0, "Không được có câu hỏi mồ côi nào truyền xuống DB");
    });

    await runTest("1.3. submitAssignmentService bắt ngoại lệ P2003 từ DB và trả về error trung thực", async () => {
      // Giả lập DB ném lỗi khóa ngoại P2003
      (prisma.assignmentSubmission.create as any) = async () => {
        const p2003Err: any = new Error("Foreign key constraint failed on the field: `questionId`");
        p2003Err.code = "P2003";
        throw p2003Err;
      };

      const res = await submitAssignmentService(
        {
          assignmentId: "assign-real-1",
          answers: [{ questionId: "q-real-1", studentAnswer: "A" }],
          tabSwitchCount: 0,
          isCheatingFlagged: false,
        },
        { userId: "student-1", email: "student@simpace.vn" }
      );

      assert.equal(res.success, false, "Khi DB throw lỗi, bắt buộc trả về success: false");
      assert.ok(res.error?.includes("Foreign key"), "Thông báo lỗi phải chứa thông tin CSDL");
    });

    /* =========================================================================
     * NHÓM 2: TRIỆT TIÊU 404 DEMO FALLBACK (ELIMINATE 404 TO DEMO[0])
     * ========================================================================= */
    console.log("\n▶ NHÓM 2: Triệt tiêu Demo Fallback khi ID không tồn tại (404 Fallback)");

    await runTest("2.1. getClassDetailService trả về null khi classId không tồn tại (DB Online)", async () => {
      (prisma.class.findUnique as any) = async () => null;

      const res = await getClassDetailService("nonexistent-class-id-404-online");
      assert.equal(res, null, "Không được fallback về demoClasses[0]!");
    });

    await runTest("2.2. getClassDetailService trả về null khi classId không tồn tại (DB Offline)", async () => {
      process.env.DATABASE_URL = ""; // Offline
      const res = await getClassDetailService("nonexistent-class-id-404-offline");
      assert.equal(res, null, "Khi offline không tìm thấy id cũng phải trả về null, không rơi về demo[0]!");
      process.env.DATABASE_URL = "postgresql://postgres:mockpassword@mock-db.supabase.co:5432/postgres"; // Restore
    });

    await runTest("2.3. getAssignmentDetailService trả về lỗi 404 khi assignmentId rác", async () => {
      const res = await getAssignmentDetailService("completely-random-garbage-id-9999", "student-1");
      assert.equal(res.success, false);
      assert.ok(res.error?.includes("không tồn tại"));
      assert.equal(res.assignment, undefined);
    });

    await runTest("2.4. submitAssignmentService từ chối nộp bài khi assignmentId không tồn tại", async () => {
      (prisma.assignment.findUnique as any) = async () => null;

      const res = await submitAssignmentService(
        {
          assignmentId: "ghost-assignment-404",
          answers: [],
          tabSwitchCount: 0,
          isCheatingFlagged: false,
        },
        { userId: "student-1" }
      );

      assert.equal(res.success, false);
      assert.ok(res.error?.includes("không tồn tại") || res.error?.includes("bị xóa"));
    });

    /* =========================================================================
     * NHÓM 3: TRIỆT TIÊU EMPTY LIST FALLBACK (EMPTY DB MUST RETURN EMPTY LIST)
     * ========================================================================= */
    console.log("\n▶ NHÓM 3: Triệt tiêu Empty List Fallback (CSDL rỗng phải trả về rỗng)");

    await runTest("3.1. getUsersService trả về mảng rỗng [] khi CSDL không có người dùng nào", async () => {
      (prisma.user.findMany as any) = async () => [];

      const users = await getUsersService(null);
      assert.ok(Array.isArray(users), "Kết quả phải là một mảng");
      assert.equal(users.length, 0, "CSDL trả về [] thì service bắt buộc trả về [], không được tráo demo!");
    });

    await runTest("3.2. getMaterialFoldersService trả về folders: [] khi CSDL rỗng", async () => {
      (prisma.materialFolder.findMany as any) = async () => [];

      const res = await getMaterialFoldersService({});
      assert.equal(res.success, true);
      assert.ok(Array.isArray(res.folders));
      assert.equal(res.folders.length, 0, "Thư mục CSDL rỗng phải trả về folders: [], không rơi vào memoryFolders!");
    });

    await runTest("3.3. getLearningMaterialsService trả về materials: [] khi CSDL rỗng", async () => {
      (prisma.learningMaterial.findMany as any) = async () => [];

      const res = await getLearningMaterialsService("folder-empty-1");
      assert.equal(res.success, true);
      assert.ok(Array.isArray(res.materials));
      assert.equal(res.materials.length, 0, "Tài liệu CSDL rỗng phải trả về materials: [], không rơi vào demoMaterials!");
    });

    /* =========================================================================
     * NHÓM 4: TRIỆT TIÊU MUTATION FAKE SUCCESS (MUTATION FAILURE INTEGRITY)
     * ========================================================================= */
    console.log("\n▶ NHÓM 4: Triệt tiêu Mutation Fake Success (Báo lỗi trung thực khi CSDL lỗi)");

    await runTest("4.1. createClassService trả về success: false khi CSDL ném lỗi ghi", async () => {
      (prisma.class.findUnique as any) = async () => null;
      (prisma.class.create as any) = async () => {
        throw new Error("P2002: Unique constraint failed on field `code`");
      };

      const res = await createClassService({
        code: "CLS_TEST_P2002",
        name: "Lớp Ngoại Lệ Crash DB",
        schoolId: "sch-1",
        teacherId: "teacher-1",
      });

      assert.equal(res.success, false, "Phải báo thất bại khi CSDL lỗi");
      assert.ok(res.error?.includes("P2002") || res.error?.includes("Không thể tạo"));
    });

    /* =========================================================================
     * NHÓM 5: ADVERSARIAL EDGE CASES & ỨNG SUẤT NÂNG CAO
     * ========================================================================= */
    console.log("\n▶ NHÓM 5: Adversarial Edge Cases & Ứng suất Nâng cao");

    await runTest("5.1. Xử lý an toàn khi payload nộp bài có duplicate questionId", async () => {
      (prisma.assignment.findUnique as any) = async () => ({
        id: "assign-dup-test",
        title: "Test Duplicate Answers",
        dueDate: new Date(Date.now() + 86400000),
        maxAttempts: 3,
        questions: [
          { id: "q-dup-1", points: 5, type: "MULTIPLE_CHOICE", correctAnswer: "A" },
        ],
        assignedClasses: [],
      });

      (prisma.assignmentSubmission.count as any) = async () => 0;
      (prisma.assignmentSubmission.create as any) = async (args: any) => ({
        id: "sub-dup-1",
        score: args.data.score,
        totalPoints: args.data.totalPoints,
      });

      // Gửi 2 lần cùng 1 questionId: "q-dup-1"
      const res = await submitAssignmentService(
        {
          assignmentId: "assign-dup-test",
          answers: [
            { questionId: "q-dup-1", studentAnswer: "A" },
            { questionId: "q-dup-1", studentAnswer: "A" },
          ],
          tabSwitchCount: 0,
          isCheatingFlagged: false,
        },
        { userId: "student-1" }
      );

      assert.equal(res.success, true);
    });

    await runTest("5.2. parseSchedule & areSchedulesConflicting chống chọi chuỗi thời gian dị dạng", () => {
      // Chuỗi rỗng / null / khoảng trắng
      assert.equal(parseSchedule(""), null);
      assert.equal(parseSchedule("   "), null);
      assert.equal(parseSchedule(null as any), null);

      // Chuỗi không có thứ hoặc giờ hợp lệ
      const malformed1 = parseSchedule("Thứ 9 • 25:00 - 30:00");
      assert.equal(malformed1?.days.length, 0);

      // areSchedulesConflicting với chuỗi rác
      const isConflict = areSchedulesConflicting("Chuỗi rác ABC", "Thứ 2 • 18:00 - 20:00");
      assert.equal(isConflict, false, "Chuỗi rác không được gây xung đột ảo hay sập chương trình");

      // validateScheduleString với giờ kết thúc trước giờ bắt đầu
      const err = validateScheduleString("Thứ 2 • 20:00 - 18:00");
      assert.ok(err?.includes("sau giờ bắt đầu"));
    });

    await runTest("5.3. createIeltsLevelService chặn khoảng điểm nghịch đảo và ngoài thang 0-9", async () => {
      // Nghịch đảo: min > max
      const res1 = await createIeltsLevelService({
        name: "Test Inverted",
        minScore: 8.0,
        maxScore: 5.0,
      });
      assert.equal(res1.success, false);
      assert.ok(res1.error?.includes("Khoảng điểm không hợp lệ"));

      // Ngoài thang: min < 0
      const res2 = await createIeltsLevelService({
        name: "Test Negative",
        minScore: -1.0,
        maxScore: 4.0,
      });
      assert.equal(res2.success, false);
      assert.ok(res2.error?.includes("Khoảng điểm không hợp lệ"));

      // Ngoài thang: max > 9.0
      const res3 = await createIeltsLevelService({
        name: "Test Over Max",
        minScore: 7.0,
        maxScore: 10.0,
      });
      assert.equal(res3.success, false);
      assert.ok(res3.error?.includes("Khoảng điểm không hợp lệ"));
    });

    await runTest("5.4. normalizeIeltsLevelCode bảo vệ tương thích ngược cho mọi biến thể MEDIUM", () => {
      assert.equal(normalizeIeltsLevelCode("medium"), "INTERMEDIATE");
      assert.equal(normalizeIeltsLevelCode("Medium"), "INTERMEDIATE");
      assert.equal(normalizeIeltsLevelCode("  MEDIUM  "), "INTERMEDIATE");
      assert.equal(normalizeIeltsLevelCode("basic"), "BASIC");
      assert.equal(normalizeIeltsLevelCode("ADVANCED"), "ADVANCED");
      assert.equal(normalizeIeltsLevelCode(undefined), "");
    });

    await runTest("5.5. determineIeltsLevelService định vị chính xác tại các điểm biên", async () => {
      (prisma.ieltsLevel.findMany as any) = async () => [
        { id: "lvl-basic", code: "BASIC", name: "Cơ bản", minScore: 0.0, maxScore: 4.5, sortOrder: 1, isActive: true },
        { id: "lvl-intermediate", code: "INTERMEDIATE", name: "Trung bình", minScore: 4.5, maxScore: 6.5, sortOrder: 2, isActive: true },
        { id: "lvl-advanced", code: "ADVANCED", name: "Nâng cao", minScore: 6.5, maxScore: 9.0, sortOrder: 3, isActive: true }
      ];

      // 0.0 -> BASIC
      const b0 = await determineIeltsLevelService(0.0);
      assert.equal(b0.success, true);
      assert.equal(b0.level?.code, "BASIC");

      // 4.0 -> BASIC (max của BASIC là 4.0)
      const b4 = await determineIeltsLevelService(4.0);
      assert.equal(b4.success, true);
      assert.equal(b4.level?.code, "BASIC");

      // 4.5 -> BASIC (điểm mút trên của BASIC [0.0 - 4.5], duyệt mảng theo sortOrder gặp BASIC trước)
      const b45 = await determineIeltsLevelService(4.5);
      assert.equal(b45.success, true);
      assert.equal(b45.level?.code, "BASIC");

      // 5.0 -> INTERMEDIATE (nằm hoàn toàn trong [4.5 - 6.5])
      const b50 = await determineIeltsLevelService(5.0);
      assert.equal(b50.success, true);
      assert.equal(b50.level?.code, "INTERMEDIATE");

      // 5.5 -> INTERMEDIATE
      const b55 = await determineIeltsLevelService(5.5);
      assert.equal(b55.success, true);
      assert.equal(b55.level?.code, "INTERMEDIATE");

      // 6.5 -> INTERMEDIATE (điểm mút trên của INTERMEDIATE [4.5 - 6.5])
      const b65 = await determineIeltsLevelService(6.5);
      assert.equal(b65.success, true);
      assert.equal(b65.level?.code, "INTERMEDIATE");

      // 7.0 -> ADVANCED (min của ADVANCED là 6.5 hoặc 7.0)
      const b70 = await determineIeltsLevelService(7.0);
      assert.equal(b70.success, true);
      assert.equal(b70.level?.code, "ADVANCED");

      // 9.0 -> ADVANCED
      const b90 = await determineIeltsLevelService(9.0);
      assert.equal(b90.success, true);
      assert.equal(b90.level?.code, "ADVANCED");

      // 9.5 -> Ngoại lệ không hợp lệ
      const b95 = await determineIeltsLevelService(9.5);
      assert.equal(b95.success, false);
      assert.ok(b95.error?.includes("0.0 đến 9.0"));
    });

  } finally {
    // Khôi phục trạng thái nguyên bản
    process.env.DATABASE_URL = originalDatabaseUrl;
    prisma.assignment.findUnique = originalAssignmentFindUnique;
    prisma.assignmentSubmission.create = originalAssignmentSubmissionCreate;
    prisma.assignmentSubmission.count = originalAssignmentSubmissionCount;
    prisma.user.findMany = originalUserFindMany;
    prisma.materialFolder.findMany = originalFolderFindMany;
    prisma.learningMaterial.findMany = originalMaterialFindMany;
    prisma.class.create = originalClassCreate;
    prisma.class.findUnique = originalClassFindUnique;
    prisma.classAssignment.findMany = originalClassAssignmentFindMany;
    prisma.ieltsLevel.findMany = originalIeltsLevelFindMany;
    if ((prisma as any).notification) {
      (prisma as any).notification.createMany = originalNotificationCreateMany;
    }
  }

  console.log("\n==================================================================");
  console.log(`  TỔNG KẾT ADVERSARIAL STRESS-TEST: ${passedCount} PASS / ${failedCount} FAIL`);
  if (failedCount === 0) {
    console.log("  PHÁN QUYẾT: TOÀN BỘ CÁC GIẢ THUYẾT TẤN CÔNG ĐÃ ĐƯỢC BẢO VỆ 100%");
  } else {
    console.log("  PHÁN QUYẾT: PHÁT HIỆN LỖ HỔNG HOẶC LỖI GÃY!");
  }
  console.log("==================================================================");
}

runAdversarialTestSuite().catch((err) => {
  console.error("Adversarial test suite failed:", err);
  process.exit(1);
});
