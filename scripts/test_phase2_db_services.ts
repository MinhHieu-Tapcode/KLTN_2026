import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { normalizeIeltsLevelCode, determineIeltsLevelService, getIeltsLevelsService } from "../src/services/ielts-levels.service";
import { getClassDetailService, createClassService } from "../src/services/class.service";
import { getAssignmentDetailService, submitAssignmentService } from "../src/services/assignment.service";
import { getSchoolsService, generateSchoolCode } from "../src/services/school.service";
import { getSystemPermissionsService } from "../src/services/permission.service";
import { logSystemWarning } from "../src/lib/telemetry";

async function runTest(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
  } catch (err: any) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    -> ${err.message}`);
    throw err;
  }
}

async function runPhase2TestSuite() {
  console.log("==================================================================");
  console.log("  BỘ KIỂM THỬ ĐỘC LẬP PHASE 2: DATABASE, SERVICES & DATA INTEGRITY");
  console.log("  Dự án LMS SIMPACE - Nhánh feature/phase2-db-services");
  console.log("==================================================================");

  /* =========================================================================
   * NHÓM 1: KIỂM TRA TUÂN THỦ KIẾN TRÚC 3 TẦNG (ACTION -> SERVICE -> ENTITY)
   * ========================================================================= */
  console.log("\n▶ NHÓM 1: Kiểm tra kiến trúc 3 tầng & Triệt tiêu hoàn toàn Prisma tại Actions");

  await runTest("1.1. src/actions/schools.ts không import prisma và dưới 300 dòng", () => {
    const filePath = path.resolve(process.cwd(), "src/actions/schools.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    assert.equal(content.includes('import { prisma'), false, "Action schools.ts không được import prisma!");
    assert.equal(content.includes('from "@/lib/prisma"'), false, "Action schools.ts không được import prisma!");
    const lineCount = content.split("\n").length;
    assert.ok(lineCount < 300, `schools.ts phải dưới 300 dòng (hiện tại: ${lineCount})`);
  });

  await runTest("1.2. src/actions/ielts-levels.ts không import prisma và dưới 300 dòng", () => {
    const filePath = path.resolve(process.cwd(), "src/actions/ielts-levels.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    assert.equal(content.includes('import { prisma'), false, "Action ielts-levels.ts không được import prisma!");
    assert.equal(content.includes('from "@/lib/prisma"'), false, "Action ielts-levels.ts không được import prisma!");
    const lineCount = content.split("\n").length;
    assert.ok(lineCount < 300, `ielts-levels.ts phải dưới 300 dòng (hiện tại: ${lineCount})`);
  });

  await runTest("1.3. src/actions/permissions.ts không import prisma và dưới 100 dòng", () => {
    const filePath = path.resolve(process.cwd(), "src/actions/permissions.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    assert.equal(content.includes('import { prisma'), false, "Action permissions.ts không được import prisma!");
    assert.equal(content.includes('from "@/lib/prisma"'), false, "Action permissions.ts không được import prisma!");
    const lineCount = content.split("\n").length;
    assert.ok(lineCount < 100, `permissions.ts phải dưới 100 dòng (hiện tại: ${lineCount})`);
  });

  await runTest("1.4. Tồn tại đầy đủ 3 services mới độc lập trong src/services/", () => {
    assert.ok(fs.existsSync(path.resolve(process.cwd(), "src/services/school.service.ts")));
    assert.ok(fs.existsSync(path.resolve(process.cwd(), "src/services/ielts-levels.service.ts")));
    assert.ok(fs.existsSync(path.resolve(process.cwd(), "src/services/permission.service.ts")));
  });

  /* =========================================================================
   * NHÓM 2: CHUẨN HÓA MÃ TRÌNH ĐỘ IELTS SANG INTERMEDIATE
   * ========================================================================= */
  console.log("\n▶ NHÓM 2: Chuẩn hóa mã trình độ IELTS (INTERMEDIATE) & tương thích ngược");

  await runTest("2.1. normalizeIeltsLevelCode chuyển đổi MEDIUM thành INTERMEDIATE", () => {
    assert.equal(normalizeIeltsLevelCode("medium"), "INTERMEDIATE");
    assert.equal(normalizeIeltsLevelCode("MEDIUM"), "INTERMEDIATE");
    assert.equal(normalizeIeltsLevelCode("BASIC"), "BASIC");
    assert.equal(normalizeIeltsLevelCode("ADVANCED"), "ADVANCED");
    assert.equal(normalizeIeltsLevelCode("INTERMEDIATE"), "INTERMEDIATE");
  });

  await runTest("2.2. determineIeltsLevelService xác định đúng INTERMEDIATE cho điểm 5.5", async () => {
    const res = await determineIeltsLevelService(5.5);
    assert.equal(res.success, true);
    assert.equal(res.level?.code, "INTERMEDIATE");
    assert.equal(res.level?.name, "Trung bình");
  });

  await runTest("2.3. getIeltsLevelsService trả về danh sách có cấp độ INTERMEDIATE", async () => {
    const res = await getIeltsLevelsService();
    assert.equal(res.success, true);
    const codes = res.levels?.map((l: any) => l.code);
    assert.ok(codes?.includes("INTERMEDIATE"), "Danh sách trình độ phải chứa INTERMEDIATE");
    assert.equal(codes?.includes("MEDIUM"), false, "Danh sách trình độ không được chứa MEDIUM");
  });

  /* =========================================================================
   * NHÓM 3: XỬ LÝ TRIỆT ĐỂ SILENT MOCK FALLBACK (EMPTY LIST & 404 FALLBACK)
   * ========================================================================= */
  console.log("\n▶ NHÓM 3: Khắc phục triệt để hiện tượng Silent Mock Fallback");

  await runTest("3.1. getClassDetailService với ID không tồn tại trả về null (không fallback về demo[0])", async () => {
    const fakeId = "completely-nonexistent-class-id-xyz-999";
    const res = await getClassDetailService(fakeId);
    assert.equal(res, null, "Khi ID không tồn tại trong DB và demo, phải trả về null!");
  });

  await runTest("3.2. getAssignmentDetailService với ID không tồn tại trả về lỗi 404 (không fallback về demo[0])", async () => {
    const fakeId = "completely-nonexistent-assignment-id-999";
    const res = await getAssignmentDetailService(fakeId, "student-1");
    assert.equal(res.success, false);
    assert.ok(res.error?.includes("không tồn tại"), `Thông báo lỗi phải rõ ràng: ${res.error}`);
    assert.equal(res.assignment, undefined);
  });

  await runTest("3.3. createClassService chặn mutation giả mạo khi thiếu thông tin bắt buộc", async () => {
    const res = await createClassService({
      name: "",
      schoolId: "",
    });
    assert.equal(res.success, false);
    assert.ok(res.error?.includes("Vui lòng nhập tên lớp"));
  });

  /* =========================================================================
   * NHÓM 4: BẢO VỆ TOÀN VẸN KHÓA NGOẠI (P2003) & TELEMETRY WARNING
   * ========================================================================= */
  console.log("\n▶ NHÓM 4: Bảo vệ toàn vẹn khóa ngoại (P2003) & Telemetry Warning Logger");

  await runTest("4.1. submitAssignmentService từ chối nộp bài khi assignmentId không tồn tại", async () => {
    const res = await submitAssignmentService(
      {
        assignmentId: "invalid-assignment-id-404",
        answers: [{ questionId: "q-1", studentAnswer: "A" }],
        tabSwitchCount: 0,
        isCheatingFlagged: false,
      },
      { userId: "student-1", email: "student@simpace.vn" }
    );
    assert.equal(res.success, false);
    assert.ok(res.error?.includes("không tồn tại"));
  });

  await runTest("4.2. Telemetry warning logger hoạt động đúng cấu trúc chuẩn", () => {
    const payload = logSystemWarning({
      context: "test.phase2",
      operation: "unitTestCheck",
      reason: "Kiểm thử đo kiểm hệ thống",
      error: new Error("Mô phỏng cảnh báo đo kiểm"),
    });
    assert.equal(payload.context, "test.phase2");
    assert.equal(payload.operation, "unitTestCheck");
    assert.ok(payload.timestamp);
  });

  await runTest("4.3. generateSchoolCode sinh mã chuẩn SCH_ từ tên trường", async () => {
    const code1 = await generateSchoolCode("THPT Chu Văn An");
    assert.equal(code1.startsWith("SCH_"), true);
    assert.ok(code1.includes("CVA"));

    const code2 = await generateSchoolCode("Trường THCS Giảng Võ");
    assert.equal(code2.startsWith("SCH_"), true);
    assert.ok(code2.includes("GV"));
  });

  console.log("\n==================================================================");
  console.log("  KẾT QUẢ KIỂM THỬ PHASE 2: 13 PASS / 0 FAIL");
  console.log("  PHÁN QUYẾT: TOÀN BỘ CÁC MỤC TIÊU PHASE 2 ĐÃ ĐẠT CHUẨN 100%");
  console.log("==================================================================");
}

runPhase2TestSuite().catch((err) => {
  console.error("Kiểm thử thất bại:", err);
  process.exit(1);
});
