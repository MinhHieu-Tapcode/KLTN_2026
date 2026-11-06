/**
 * KIỂM THỬ PHÂN QUYỀN & PHẠM VI (AUTHZ-01 → AUTHZ-36)
 * Cách chạy: ALLOW_MOCK_SESSION=1 npx tsx scripts/test_authz_scope.ts
 *
 * Bộ test này KHÔNG cần CSDL: nó kiểm tra các lớp chặn nằm TRƯỚC truy vấn DB (vai trò, tham số, fail-closed khi DB chết).
 * Các ca cần dữ liệu thật (QN trường A sửa lớp trường B, GV lớp khác...) cần seed DB riêng, xem mục "CHƯA TỰ ĐỘNG HÓA" ở cuối.
 */
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { getSession, type SessionPayload } from "../src/lib/auth";
import {
  assertClassAccess,
  assertSchoolAccess,
  assertUserMutationAllowed,
  assertAssignmentAccess,
  assertFolderAccess,
} from "../src/services/access-scope.service";
import {
  verifyAssignmentCreationPermission,
  verifyAssignmentDeletionPermission,
  verifySubmissionGradingPermission,
} from "../src/services/assignment.service";
import {
  createUserAction, updateUserAction, updateProfileAction, restoreUserAction,
  commitImportUsersAction, parseAndValidateExcelAction, getUsersAction,
  getTeachersAction, getTAsAction, getNextUserCodeAction, deleteUserAction,
} from "../src/actions/users";
import {
  createClassAction, deleteClassAction, restoreClassAction, deleteMultipleClassesAction,
  updateClassAction, enrollStudentToClassAction, transferStudentClassAction, getClassDetailAction,
  getAvailableStudentsForClassAction,
} from "../src/actions/classes";
import { commitBulkAllocationAction } from "../src/actions/bulk-allocation";
import { commitAdmissionBatchAction, exportPhase1ExcelAction } from "../src/actions/admission-batch";
import { getSchoolsAction, getSchoolDetailAction, updateSchoolAction, getSchoolManagersAction } from "../src/actions/schools";
import {
  updateAssignmentAction, regradeAssignmentSubmissionsAction, submitAssignmentAction,
  getAssignmentDetailAction, getClassAssignmentsAction, transcribeSpeakingAnswerAction,
} from "../src/actions/assignments";
import {
  getStudentReportAction, saveReportCommentAction, markReportCommentReadAction,
} from "../src/actions/reports";
import {
  createMaterialFolderAction, deleteLearningMaterialAction, updateLearningMaterialAction,
  getMaterialFoldersAction, uploadLearningMaterialAction,
} from "../src/actions/materials";
import { getSystemPermissionsAction } from "../src/actions/permissions";
import { requestPasswordResetOtpAction } from "../src/actions/auth";
import { POST as uploadPOST } from "../src/app/api/materials/upload/route";
import { GET as pdfProxyGET } from "../src/app/api/pdf-proxy/route";
import { stripSensitive, redactClassmatesForStudent } from "../src/lib/sanitize";
import { getRecentActivitiesAction } from "../src/actions/dashboard";
import { generateTempPassword } from "../src/lib/temp-password";
import { requireFeature } from "../src/services/feature-access.service";
import { generateOtp, isOtpLocked, recordOtpFailure, clearOtpFailures } from "../src/lib/otp-guard";

const mk = (role: string, id = `${role.toLowerCase()}-1`): SessionPayload => ({
  userId: id, username: id, email: `${id}@t.vn`, role, fullName: id,
});
const S = { ADMIN: mk("ADMIN"), QN: mk("SCHOOL_MANAGER"), GV: mk("TEACHER"), TA: mk("TEACHING_ASSISTANT"), HS: mk("STUDENT") };
const setSession = (s: SessionPayload | null) => {
  if (s) (globalThis as any).mockSession = s; else delete (globalThis as any).mockSession;
};

let passed = 0, failed = 0;
async function t(name: string, fn: () => Promise<void> | void) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e: any) { failed++; console.error(`  ✗ ${name}\n      ${e?.message || e}`); }
}
const denied = (r: any) => {
  const v = Array.isArray(r) ? (r.length === 0 ? { success: false } : r) : r;
  assert.ok(v == null || v.success === false || v.ok === false || v.hasConflict !== undefined && v.error, `Kỳ vọng bị từ chối, nhận: ${JSON.stringify(v)?.slice(0, 120)}`);
};
const asRole = async (s: SessionPayload | null, fn: () => Promise<any>) => { setSession(s); try { return await fn(); } finally { setSession(null); } };

async function main() {
  delete process.env.DEMO_MODE;
  const NOBODY = [null, S.HS, S.GV, S.TA];

  console.log("▶ AUTHZ-09: mockSession chỉ hoạt động khi được bật");
  await t("không bật ALLOW_MOCK_SESSION => bỏ qua mockSession", async () => {
    const keep = process.env.ALLOW_MOCK_SESSION;
    delete process.env.ALLOW_MOCK_SESSION;
    (globalThis as any).mockSession = S.ADMIN;
    const s = await getSession();
    if (keep) process.env.ALLOW_MOCK_SESSION = keep;
    delete (globalThis as any).mockSession;
    assert.equal(s, null);
  });
  process.env.ALLOW_MOCK_SESSION = "1";
  await t("bật ALLOW_MOCK_SESSION => đọc được mockSession", async () => {
    setSession(S.GV);
    assert.equal((await getSession())?.role, "TEACHER");
    setSession(null);
  });

  console.log("▶ AUTHZ-01/02/03/04: người dùng");
  for (const who of NOBODY) {
    const label = who?.role ?? "khách";
    await t(`${label}: createUser / updateUser / restore / import / parseExcel / getUsers... bị chặn`, async () => {
      await asRole(who, async () => {
        denied(await createUserAction({ fullName: "x", email: "x@x.vn", roleCode: "ADMIN" } as any));
        denied(await updateUserAction("any", { roleCode: "ADMIN" }));
        denied(await restoreUserAction("any"));
        denied(await commitImportUsersAction([], "f.xlsx"));
        denied(await parseAndValidateExcelAction("AAAA"));
        denied(await deleteUserAction("any"));
        assert.deepEqual(await getUsersAction(), []);
        assert.deepEqual(await getTeachersAction(), []);
        assert.deepEqual(await getTAsAction(), []);
        denied(await getNextUserCodeAction("STUDENT" as any));
      });
    });
  }
  await t("HS tự nâng quyền: updateUserAction(chính mình, ADMIN) bị chặn", async () => {
    denied(await asRole(S.HS, () => updateUserAction(S.HS.userId, { roleCode: "ADMIN" })));
  });
  await t("AUTHZ-03: khách gọi updateProfileAction bị chặn", async () => {
    denied(await asRole(null, () => updateProfileAction("admin-1", { fullName: "x", email: "evil@x.com" })));
  });
  await t("AUTHZ-03: HS sửa hồ sơ của Admin bị chặn", async () => {
    const r = await asRole(S.HS, () => updateProfileAction("admin-1", { fullName: "x", email: "evil@x.com" }));
    assert.equal(r.success, false);
    assert.match(String(r.error), /chính mình/);
  });
  await t("QN không được tạo ADMIN / QN, không được gán schoolIds", async () => {
    assert.equal((await assertUserMutationAllowed(S.QN, { roleCode: "ADMIN" })).ok, false);
    assert.equal((await assertUserMutationAllowed(S.QN, { roleCode: "SCHOOL_MANAGER" })).ok, false);
    assert.equal((await assertUserMutationAllowed(S.QN, { roleCode: "TEACHER", schoolIds: ["s1"] })).ok, false);
  });
  await t("Admin không tự đổi vai trò của chính mình", async () => {
    assert.equal((await assertUserMutationAllowed(S.ADMIN, { targetUserId: S.ADMIN.userId, roleCode: "TEACHER" })).ok, false);
    assert.equal((await assertUserMutationAllowed(S.ADMIN, { targetUserId: "other", roleCode: "TEACHER" })).ok, true);
  });
  await t("GV/HS/TA không qua được assertUserMutationAllowed", async () => {
    for (const r of [S.GV, S.HS, S.TA]) assert.equal((await assertUserMutationAllowed(r, { roleCode: "STUDENT" })).ok, false);
  });

  console.log("▶ AUTHZ-05/15/11: lớp học");
  for (const who of NOBODY) {
    await t(`${who?.role ?? "khách"}: tạo/sửa/xóa/khôi phục/ghi danh/chuyển lớp bị chặn`, async () => {
      await asRole(who, async () => {
        denied(await createClassAction({ name: "x", schoolId: "s1" }));
        denied(await updateClassAction("c1", { name: "y" }));
        denied(await deleteClassAction("c1"));
        denied(await restoreClassAction("c1"));
        denied(await deleteMultipleClassesAction(["c1", "c2"]));
        denied(await enrollStudentToClassAction("c1", "u1"));
        denied(await transferStudentClassAction("c1", "c2", "u1"));
        denied(await getAvailableStudentsForClassAction("c1"));
      });
    });
  }
  await t("getClassDetailAction: khách/HS ngoài lớp nhận null (DB không khả dụng => fail-closed)", async () => {
    assert.equal(await asRole(null, () => getClassDetailAction("c1")), null);
    assert.equal(await asRole(S.HS, () => getClassDetailAction("c1")), null);
  });

  console.log("▶ AUTHZ-06: phân lớp hàng loạt / tuyển sinh");
  for (const who of NOBODY) {
    await t(`${who?.role ?? "khách"}: commitBulkAllocation / commitAdmissionBatch / exportPhase1 bị chặn`, async () => {
      await asRole(who, async () => {
        denied(await commitBulkAllocationAction([], "s1", "f.xlsx"));
        denied(await commitAdmissionBatchAction("s1", "b1", []));
        denied(await exportPhase1ExcelAction([] as any));
      });
    });
  }

  console.log("▶ AUTHZ-12/14: trường học");
  for (const who of [null, S.HS, S.GV, S.TA]) {
    await t(`${who?.role ?? "khách"}: danh sách/chi tiết/quản nhiệm trường bị chặn, sửa trường bị chặn`, async () => {
      await asRole(who, async () => {
        assert.deepEqual(await getSchoolsAction(), []);
        assert.equal(await getSchoolDetailAction("s1"), null);
        assert.deepEqual(await getSchoolManagersAction(), []);
        denied(await updateSchoolAction("s1", { name: "x" }));
      });
    });
  }

  console.log("▶ AUTHZ-20/21/26/27/28/29: bài tập");
  for (const who of [null, S.HS, S.TA]) {
    await t(`${who?.role ?? "khách"}: sửa/chấm lại bài tập bị chặn`, async () => {
      await asRole(who, async () => {
        denied(await updateAssignmentAction("a1", { title: "x" }));
        denied(await regradeAssignmentSubmissionsAction("a1"));
      });
    });
  }
  await t("GV/TA/Admin không được nộp bài (chỉ HS)", async () => {
    for (const r of [S.GV, S.TA, S.ADMIN, null]) {
      denied(await asRole(r, () => submitAssignmentAction({ assignmentId: "a1", answers: [], tabSwitchCount: 0, isCheatingFlagged: false })));
    }
  });
  await t("xem chi tiết bài / danh sách bài lớp: HS, GV không có phạm vi bị chặn (fail-closed)", async () => {
    for (const r of [S.HS, S.GV]) {
      denied(await asRole(r, () => getAssignmentDetailAction("a1")));
      denied(await asRole(r, () => getClassAssignmentsAction("c1")));
    }
  });
  await t("transcribe: HS bị chặn, audioUrl ngoài /uploads/ bị chặn", async () => {
    denied(await asRole(S.HS, () => transcribeSpeakingAnswerAction({ audioUrl: "/uploads/x.webm" })));
    denied(await asRole(S.GV, () => transcribeSpeakingAnswerAction({ audioUrl: "http://evil/x.webm" })));
  });

  console.log("▶ AUTHZ-17/18/19: báo cáo & nhận xét");
  await t("TA và khách không xem báo cáo học sinh", async () => {
    for (const r of [S.TA, null]) denied(await asRole(r, () => getStudentReportAction({ studentId: "st1" } as any)));
  });
  await t("HS/TA/khách không viết nhận xét; GV ngoài phạm vi bị chặn", async () => {
    const input = { scope: "CLASS" as const, classId: "c1", periodKey: "THIS_MONTH" as any, content: "x" };
    for (const r of [S.HS, S.TA, null]) denied(await asRole(r, () => saveReportCommentAction(input)));
    denied(await asRole(S.GV, () => saveReportCommentAction(input)));
  });
  await t("chỉ HS đánh dấu đã đọc nhận xét", async () => {
    for (const r of [S.GV, S.TA, null]) denied(await asRole(r, () => markReportCommentReadAction("cm1")));
  });

  console.log("▶ AUTHZ-25: học liệu");
  for (const who of [null, S.HS, S.TA]) {
    await t(`${who?.role ?? "khách"}: tạo thư mục / sửa / xóa / tải lên học liệu bị chặn`, async () => {
      await asRole(who, async () => {
        denied(await createMaterialFolderAction({ name: "x", classId: "c1" }));
        denied(await deleteLearningMaterialAction("m1"));
        denied(await updateLearningMaterialAction({ materialId: "m1", title: "x" }));
        denied(await uploadLearningMaterialAction({ folderId: "f1", title: "x", fileName: "x.pdf", fileSize: 1, fileType: "PDF", fileUrl: "/uploads/x.pdf" }));
      });
    });
  }
  await t("HS xem thư mục lớp không có phạm vi bị chặn", async () => {
    denied(await asRole(S.HS, () => getMaterialFoldersAction({ classId: "c1" })));
  });

  console.log("▶ AUTHZ-22/34: fail-closed khi không xác minh được");
  await t("verify*Permission trả ok:false khi DB không khả dụng và không bật DEMO_MODE", async () => {
    assert.equal((await verifyAssignmentCreationPermission("u", "TEACHER", ["c1"])).ok, false);
    assert.equal((await verifyAssignmentDeletionPermission("a1", "u", "TEACHER")).ok, false);
    assert.equal((await verifySubmissionGradingPermission("s1", "u", "TEACHER")).ok, false);
  });
  await t("assert* của GV/QN/HS từ chối khi DB không khả dụng", async () => {
    for (const r of [S.QN, S.GV, S.TA, S.HS]) {
      assert.equal((await assertClassAccess(r, "c1", "VIEW")).ok, false);
      assert.equal((await assertAssignmentAccess(r, "a1", "VIEW")).ok, false);
      assert.equal((await assertFolderAccess(r, "f1", "VIEW")).ok, false);
    }
    assert.equal((await assertSchoolAccess(S.QN, "s1")).ok, false);
    assert.equal((await assertSchoolAccess(S.GV, "s1")).ok, false);
  });
  await t("ADMIN luôn qua các assert*", async () => {
    assert.equal((await assertClassAccess(S.ADMIN, "c1", "MANAGE")).ok, true);
    assert.equal((await assertSchoolAccess(S.ADMIN, "s1")).ok, true);
  });
  await t("DEMO_MODE=1 cho phép chế độ demo khi DB chết", async () => {
    process.env.DEMO_MODE = "1";
    try {
      assert.equal((await assertClassAccess(S.GV, "c1", "VIEW")).ok, true);
      assert.equal((await verifyAssignmentDeletionPermission("a1", "u", "TEACHER")).ok, true);
    } finally { delete process.env.DEMO_MODE; }
  });
  await t("vai trò sai bị từ chối trước khi chạm DB", async () => {
    assert.equal((await verifyAssignmentCreationPermission("u", "STUDENT", ["c1"])).ok, false);
    assert.equal((await verifyAssignmentDeletionPermission("a1", "u", "TEACHING_ASSISTANT")).ok, false);
  });

  console.log("▶ AUTHZ-13: quyền hệ thống");
  await t("khách không đọc được ma trận quyền; có đăng nhập thì đọc được", async () => {
    assert.deepEqual(await asRole(null, () => getSystemPermissionsAction()), []);
    const r = await asRole(S.HS, () => getSystemPermissionsAction());
    assert.ok(Array.isArray(r) && r.length > 0);
  });

  console.log("▶ AUTHZ-07/31/32: API routes");
  const upload = (name: string, type = "application/octet-stream") => {
    const fd = new FormData();
    fd.append("file", new File([new Uint8Array([1, 2, 3])], name, { type }));
    return new NextRequest("http://localhost/api/materials/upload", { method: "POST", body: fd });
  };
  await t("upload: khách => 401", async () => {
    assert.equal((await asRole(null, () => uploadPOST(upload("a.pdf")))).status, 401);
  });
  await t("upload: .html/.svg/.js => 400 (kể cả Admin)", async () => {
    for (const n of ["x.html", "x.svg", "x.js", "x.htm", "x"]) {
      assert.equal((await asRole(S.ADMIN, () => uploadPOST(upload(n)))).status, 400, n);
    }
  });
  await t("upload: HS tải .pdf => 403, HS tải .html => 400", async () => {
    assert.equal((await asRole(S.HS, () => uploadPOST(upload("a.pdf")))).status, 403);
    assert.equal((await asRole(S.HS, () => uploadPOST(upload("a.html")))).status, 400);
  });
  await t("pdf-proxy: khách => 401; địa chỉ nội bộ => 403; không còn CORS *", async () => {
    const mkReq = (u: string) => new NextRequest(`http://localhost/api/pdf-proxy?url=${encodeURIComponent(u)}`);
    assert.equal((await asRole(null, () => pdfProxyGET(mkReq("https://example.com/a.pdf")))).status, 401);
    for (const u of ["http://127.0.0.1:5432/", "http://169.254.169.254/latest/meta-data", "http://localhost/x", "http://10.0.0.1/x", "http://[::1]/x"]) {
      const res = await asRole(S.HS, () => pdfProxyGET(mkReq(u)));
      assert.equal(res.status, 403, u);
      assert.equal(res.headers.get("Access-Control-Allow-Origin"), null);
    }
  });

  console.log("▶ AUTHZ-36: OTP");
  await t("OTP 6 chữ số, khóa sau 5 lần sai", () => {
    for (let i = 0; i < 200; i++) assert.match(generateOtp(), /^[1-9]\d{5}$/);
    const k = "test:key";
    clearOtpFailures(k);
    for (let i = 0; i < 4; i++) recordOtpFailure(k);
    assert.equal(isOtpLocked(k), false);
    recordOtpFailure(k);
    assert.equal(isOtpLocked(k), true);
    clearOtpFailures(k);
    assert.equal(isOtpLocked(k), false);
  });

  console.log("▶ AUTHZ-35 / mật khẩu tạm");
  await t("requireFeature: dùng ma trận mặc định khi DB chết (Admin luôn qua, QN qua VIEW_USERS, GV bị chặn)", async () => {
    assert.equal((await requireFeature(S.ADMIN, "SYSTEM_SETTINGS")).ok, true);
    assert.equal((await requireFeature(S.QN, "VIEW_USERS")).ok, true);
    assert.equal((await requireFeature(S.QN, "SYSTEM_SETTINGS")).ok, false);
    assert.equal((await requireFeature(S.GV, "VIEW_USERS")).ok, false);
    assert.equal((await requireFeature(S.TA, "VIEW_REPORTS")).ok, false);
  });
  await t("mật khẩu tạm: 12 ký tự, đủ hoa/thường/số/ký tự đặc biệt, không trùng nhau, không phải mật khẩu cũ", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const p = generateTempPassword();
      assert.equal(p.length, 12);
      assert.match(p, /[A-Z]/); assert.match(p, /[a-z]/); assert.match(p, /\d/); assert.match(p, /[@#$%]/);
      assert.notEqual(p, "Simpace@2026");
      seen.add(p);
    }
    assert.equal(seen.size, 200);
  });

  console.log("▶ Dữ liệu trả về client");
  await t("stripSensitive loại passwordHash ở mọi tầng, giữ nguyên Date", () => {
    const d = new Date();
    const out: any = stripSensitive({ a: 1, passwordHash: "x", when: d, staff: [{ passwordHash: "y", profile: { fullName: "A" } }] });
    assert.equal(out.passwordHash, undefined);
    assert.equal(out.staff[0].passwordHash, undefined);
    assert.equal(out.staff[0].profile.fullName, "A");
    assert.ok(out.when instanceof Date);
  });
  await t("học viên chỉ thấy tên bạn cùng lớp, vẫn thấy đủ thông tin của chính mình", () => {
    const cls: any = { enrollments: [
      { studentId: "me", student: { id: "me", email: "me@x", profile: { fullName: "Me", phoneNumber: "1" } } },
      { studentId: "o", student: { id: "o", username: "HV2", email: "o@x", profile: { fullName: "Other", phoneNumber: "2", dateOfBirth: "2000", address: "a" } } },
    ] };
    const r: any = redactClassmatesForStudent(cls, "me");
    assert.equal(r.enrollments[0].student.email, "me@x");
    assert.equal(r.enrollments[1].student.email, undefined);
    assert.equal(r.enrollments[1].student.profile.phoneNumber, undefined);
    assert.equal(r.enrollments[1].student.profile.fullName, "Other");
  });
  await t("dashboard: khách và học viên không nhận nhật ký hoạt động hệ thống", async () => {
    assert.equal((await asRole(null, () => getRecentActivitiesAction())).success, false);
    assert.deepEqual((await asRole(S.HS, () => getRecentActivitiesAction())).activities, []);
  });

  console.log(`\nKẾT QUẢ: ${passed} đạt, ${failed} lỗi`);
  console.log(
    "CHƯA TỰ ĐỘNG HÓA (cần DB seed: S1,S2,QN1,C1,C2,GV1,GV2,TA1,HS1,HS2,A1,F1): ca ĐƯỢC PHÉP của từng vai trò và ca chặn chéo trường/lớp, xem docs/security/AUTHZ_AUDIT_AND_FIX_PLAN.md mục 6."
  );
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
