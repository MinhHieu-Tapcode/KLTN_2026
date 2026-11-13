import { prisma, isDbAlive } from "@/lib/prisma";

/**
 * Các quy tắc nghiệp vụ (business rule) kiểm tra TRƯỚC KHI xóa mềm (isActive: false).
 * Mỗi hàm chỉ ĐỌC dữ liệu. Việc ghi (xóa mềm) vẫn do service của từng module thực hiện.
 *
 * Có 2 loại ràng buộc:
 *  - CHẶN CỨNG (blockers): không bao giờ xóa được (không tồn tại, đã xóa, Admin cuối cùng).
 *  - CẢNH BÁO (warnings): vẫn xóa được nhưng phải được người dùng XÁC NHẬN (confirmed = true)
 *    sau khi đọc mô tả hậu quả kèm số lượng cụ thể.
 */
export type DeleteKind = "SCHOOL" | "CLASS" | "USER" | "MATERIAL" | "MATERIAL_FOLDER" | "ASSIGNMENT";

export type DeleteCheck =
  | { ok: true }
  | { ok: false; error: string; requiresConfirm?: boolean; warnings?: string[] };

export interface DeleteImpact {
  label: string;
  blockers: string[];
  warnings: string[];
}

export interface DeleteOptions {
  /** Người dùng đã đọc cảnh báo và đồng ý xóa */
  confirmed?: boolean;
  /** Chỉ dùng cho bài tập: gỡ bài khỏi một lớp cụ thể */
  classId?: string;
}

const OK: DeleteCheck = { ok: true };
const deny = (error: string): DeleteCheck => ({ ok: false, error });

const empty = (label = ""): DeleteImpact => ({ label, blockers: [], warnings: [] });
const blocked = (msg: string): DeleteImpact => ({ label: "", blockers: [msg], warnings: [] });

async function schoolImpact(schoolId: string): Promise<DeleteImpact> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { isActive: true, name: true },
  });
  if (!school) return blocked("Trường học không tồn tại!");
  if (!school.isActive) return blocked("Trường học này đã bị xóa trước đó!");

  const out = empty(school.name);
  const classes = await prisma.class.findMany({
    where: { schoolId, isActive: true },
    select: { id: true },
  });
  if (classes.length > 0) {
    const students = await prisma.classEnrollment.count({
      where: { classId: { in: classes.map((c) => c.id) }, status: "STUDYING" },
    });
    const studentNote = students > 0 ? ` (tổng ${students} học viên đang học)` : "";
    out.warnings.push(
      `Trường còn ${classes.length} lớp học đang hoạt động${studentNote}. Các lớp này sẽ không còn trường quản lý.`
    );
  }
  return out;
}

async function classImpact(classId: string): Promise<DeleteImpact> {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { isActive: true, name: true },
  });
  if (!cls) return blocked("Lớp học không tồn tại!");
  if (!cls.isActive) return blocked("Lớp học này đã bị xóa trước đó!");

  const out = empty(cls.name);
  const studying = await prisma.classEnrollment.count({ where: { classId, status: "STUDYING" } });
  if (studying > 0) {
    out.warnings.push(
      `Lớp còn ${studying} học viên đang học. Sau khi xóa, các học viên này không còn thấy lớp (lịch sử đăng ký và bài nộp vẫn được giữ).`
    );
  }
  const openAssignments = await prisma.assignmentClass.count({
    where: { classId, isActive: true, dueDate: { gt: new Date() }, assignment: { isActive: true } },
  });
  if (openAssignments > 0) {
    out.warnings.push(`Lớp còn ${openAssignments} bài tập chưa đến hạn nộp, học viên sẽ không làm được các bài này nữa.`);
  }
  const pending = await prisma.assignmentSubmission.count({
    where: { status: "SUBMITTED", OR: [{ classId }, { assignmentClass: { classId } }] },
  });
  if (pending > 0) {
    out.warnings.push(`Lớp còn ${pending} bài nộp đang chờ chấm.`);
  }
  return out;
}

async function userImpact(userId: string): Promise<DeleteImpact> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, username: true, role: { select: { code: true } } },
  });
  if (!user) return blocked("Tài khoản không tồn tại!");
  if (!user.isActive) return blocked("Tài khoản này đã bị xóa trước đó!");

  const out = empty(user.username);
  if (user.role?.code === "ADMIN") {
    const otherAdmins = await prisma.user.count({
      where: { id: { not: userId }, isActive: true, role: { code: "ADMIN" } },
    });
    if (otherAdmins === 0) out.blockers.push("Không thể xóa Quản trị viên cuối cùng của hệ thống!");
  }

  const staffClasses = await prisma.classAssignment.count({
    where: { userId, class: { isActive: true, status: { in: ["UPCOMING", "ACTIVE"] } } },
  });
  if (staffClasses > 0) {
    out.warnings.push(
      `Tài khoản đang phụ trách ${staffClasses} lớp chưa kết thúc. Các lớp này có thể bị thiếu giáo viên.`
    );
  }
  const studying = await prisma.classEnrollment.count({
    where: { studentId: userId, status: "STUDYING", class: { isActive: true } },
  });
  if (studying > 0) {
    out.warnings.push(`Tài khoản đang theo học ${studying} lớp. Học viên sẽ không đăng nhập được nữa.`);
  }
  return out;
}

async function materialImpact(materialId: string): Promise<DeleteImpact> {
  const m = await prisma.learningMaterial.findUnique({
    where: { id: materialId },
    select: { isActive: true, fileUrl: true, title: true },
  });
  if (!m) return blocked("Tài liệu không tồn tại!");
  if (!m.isActive) return blocked("Tài liệu này đã bị xóa trước đó!");

  const out = empty(m.title);
  const usedAsAudio = await prisma.assignment.count({ where: { isActive: true, audioUrl: m.fileUrl } });
  if (usedAsAudio > 0) {
    out.warnings.push(`Tài liệu đang là file nghe của ${usedAsAudio} bài tập, các bài này sẽ mất âm thanh.`);
  }
  return out;
}

async function materialFolderImpact(folderId: string): Promise<DeleteImpact> {
  const f = await prisma.materialFolder.findUnique({
    where: { id: folderId },
    select: { isActive: true, name: true },
  });
  if (!f) return blocked("Thư mục không tồn tại!");
  if (!f.isActive) return blocked("Thư mục này đã bị xóa trước đó!");

  const out = empty(f.name);
  const [mats, subFoldersCount] = await Promise.all([
    prisma.learningMaterial.findMany({
      where: { folderId, isActive: true },
      select: { fileUrl: true },
    }),
    prisma.materialFolder.count({
      where: { parentId: folderId, isActive: true },
    }),
  ]);

  const parts: string[] = [];
  if (mats.length > 0) parts.push(`${mats.length} tài liệu`);
  if (subFoldersCount > 0) parts.push(`${subFoldersCount} thư mục con`);
  if (parts.length > 0) {
    out.warnings.push(`Thư mục này còn chứa ${parts.join(" và ")} đang hoạt động.`);
  }

  const urls = mats.map((m) => m.fileUrl).filter(Boolean);
  if (urls.length > 0) {
    const usedAsAudio = await prisma.assignment.count({
      where: { isActive: true, audioUrl: { in: urls } },
    });
    if (usedAsAudio > 0) {
      out.warnings.push(
        `Có tài liệu trong thư mục đang là file nghe của ${usedAsAudio} bài tập, các bài này sẽ mất âm thanh.`
      );
    }
  }
  return out;
}

async function assignmentImpact(assignmentId: string, classId?: string): Promise<DeleteImpact> {
  const a = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { isActive: true, title: true },
  });
  if (!a) return blocked("Bài tập không tồn tại!");
  if (!a.isActive) return blocked("Bài tập này đã bị xóa trước đó!");

  const out = empty(a.title);
  const scope = classId ? { OR: [{ classId }, { assignmentClass: { classId } }] } : {};
  const [total, pending] = await Promise.all([
    prisma.assignmentSubmission.count({ where: { assignmentId, ...scope } }),
    prisma.assignmentSubmission.count({ where: { assignmentId, status: "SUBMITTED", ...scope } }),
  ]);
  if (pending > 0) {
    out.warnings.push(`Còn ${pending} bài nộp đang chờ chấm. Sau khi xóa, giáo viên sẽ không chấm các bài này được nữa.`);
  }
  if (total > 0) {
    out.warnings.push(`Bài tập đã có ${total} bài nộp của học viên (lịch sử vẫn được giữ, chỉ ẩn khỏi danh sách).`);
  }
  return out;
}

/** Lấy toàn bộ ràng buộc (chặn cứng + cảnh báo) của một đối tượng sắp xóa. */
export async function getDeleteImpact(
  kind: DeleteKind,
  id: string,
  opts?: { classId?: string }
): Promise<DeleteImpact> {
  switch (kind) {
    case "SCHOOL":
      return schoolImpact(id);
    case "CLASS":
      return classImpact(id);
    case "USER":
      return userImpact(id);
    case "MATERIAL":
      return materialImpact(id);
    case "MATERIAL_FOLDER":
      return materialFolderImpact(id);
    case "ASSIGNMENT":
      return assignmentImpact(id, opts?.classId);
  }
}

function toCheck(impact: DeleteImpact, confirmed?: boolean): DeleteCheck {
  if (impact.blockers.length > 0) return deny(impact.blockers[0]);
  if (impact.warnings.length > 0 && !confirmed) {
    return {
      ok: false,
      error: `Cần xác nhận: ${impact.warnings.join(" ")}`,
      requiresConfirm: true,
      warnings: impact.warnings,
    };
  }
  return OK;
}

export async function checkSchoolDeletable(schoolId: string, opts?: DeleteOptions): Promise<DeleteCheck> {
  return toCheck(await schoolImpact(schoolId), opts?.confirmed);
}

export async function checkClassDeletable(classId: string, opts?: DeleteOptions): Promise<DeleteCheck> {
  return toCheck(await classImpact(classId), opts?.confirmed);
}

export async function checkUserDeletable(userId: string, opts?: DeleteOptions): Promise<DeleteCheck> {
  return toCheck(await userImpact(userId), opts?.confirmed);
}

export async function checkMaterialDeletable(materialId: string, opts?: DeleteOptions): Promise<DeleteCheck> {
  return toCheck(await materialImpact(materialId), opts?.confirmed);
}

export async function checkMaterialFolderDeletable(folderId: string, opts?: DeleteOptions): Promise<DeleteCheck> {
  return toCheck(await materialFolderImpact(folderId), opts?.confirmed);
}

export async function checkAssignmentDeletable(
  assignmentId: string,
  classId?: string,
  opts?: DeleteOptions
): Promise<DeleteCheck> {
  return toCheck(await assignmentImpact(assignmentId, classId), opts?.confirmed);
}

/**
 * Lấy tác động gộp cho 1 hoặc nhiều đối tượng (dùng cho pre-check UI và checkAllDeletable).
 * Nếu chỉ có 1 id thì giữ nguyên câu cảnh báo gọn, nhiều id thì gắn tiền tố `[Tên]`.
 */
export async function getBatchDeleteImpact(
  kind: DeleteKind,
  ids: string[],
  opts?: { classId?: string }
): Promise<DeleteImpact> {
  if (ids.length === 0) return empty();
  if (!(await isDbAlive())) return empty();

  if (ids.length === 1) {
    return getDeleteImpact(kind, ids[0], opts);
  }

  const out = empty();
  for (const id of ids) {
    const impact = await getDeleteImpact(kind, id, opts);
    if (impact.blockers.length > 0) {
      out.blockers.push(...impact.blockers);
      return out;
    }
    for (const w of impact.warnings) {
      out.warnings.push(impact.label ? `[${impact.label}] ${w}` : w);
    }
  }
  return out;
}

/**
 * Kiểm tra nhiều đối tượng (xóa hàng loạt): dừng ở chặn cứng đầu tiên; các cảnh báo được GỘP
 * kèm tên từng đối tượng để người dùng xác nhận một lần.
 */
export async function checkAllDeletable(
  ids: string[],
  kind: DeleteKind,
  opts?: DeleteOptions
): Promise<DeleteCheck> {
  return toCheck(await getBatchDeleteImpact(kind, ids, opts), opts?.confirmed);
}
