"use server";

import { z } from "zod";
import { getSession, type SessionPayload } from "@/lib/auth";
import { checkAuth, checkRole, ROLE_GROUPS } from "@/lib/permissions";
import { requireFeature } from "@/services/feature-access.service";
import {
  assertClassAccess,
  assertFolderAccess,
  assertMaterialAccess,
  assertUserInManagerScope,
} from "@/services/access-scope.service";
import { verifyAssignmentDeletionPermission } from "@/services/assignment.service";
import {
  getBatchDeleteImpact,
  type DeleteImpact,
  type DeleteKind,
} from "@/services/delete-rules.service";

const impactInputSchema = z.object({
  kind: z.enum(["SCHOOL", "CLASS", "USER", "MATERIAL", "MATERIAL_FOLDER", "ASSIGNMENT"]),
  ids: z.array(z.string().min(1)).min(1, "Thiếu đối tượng cần kiểm tra!").max(200),
  classId: z.string().optional(),
});

const MATERIAL_EDITOR_ROLES = ["ADMIN", "SCHOOL_MANAGER", "TEACHER"] as const;

/**
 * Kiểm tra quyền thao tác xóa theo đúng phạm vi từng loại đối tượng
 * trước khi gọi service đọc thống kê ràng buộc.
 */
async function authorizeDeleteScope(
  session: SessionPayload,
  kind: DeleteKind,
  ids: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (kind === "SCHOOL") {
    const auth = checkRole(session, ROLE_GROUPS.ADMIN_ONLY, "Bạn không có quyền xóa trường học!");
    return auth.ok ? { ok: true } : { ok: false, error: auth.error };
  }

  if (kind === "CLASS") {
    const auth = checkRole(
      session,
      ROLE_GROUPS.ADMIN_AND_MANAGER,
      "Chỉ Quản trị viên hoặc Quản nhiệm trường mới có quyền xóa lớp học!"
    );
    if (!auth.ok) return { ok: false, error: auth.error };
    const feature = await requireFeature(
      session,
      "VIEW_CLASSES",
      "Quyền quản lý lớp học đã bị tắt đối với vai trò của bạn!"
    );
    if (!feature.ok) return { ok: false, error: feature.error };
    for (const cid of ids) {
      const scope = await assertClassAccess(session, cid, "MANAGE");
      if (!scope.ok) return scope;
    }
    return { ok: true };
  }

  if (kind === "USER") {
    const auth = checkRole(
      session,
      ROLE_GROUPS.ADMIN_AND_MANAGER,
      "Bạn không có quyền xóa tài khoản người dùng!"
    );
    if (!auth.ok) return { ok: false, error: auth.error };
    const feature = await requireFeature(
      session,
      "VIEW_USERS",
      "Chỉ Quản trị viên hoặc Quản nhiệm trường mới có quyền quản lý người dùng!"
    );
    if (!feature.ok) return { ok: false, error: feature.error };
    if (ids.length === 1 && ids[0] === session.userId) {
      return { ok: false, error: "Bạn không thể tự xóa tài khoản của chính mình!" };
    }
    for (const uid of ids) {
      const scope = await assertUserInManagerScope(session, uid);
      if (!scope.ok) return scope;
    }
    return { ok: true };
  }

  if (kind === "MATERIAL" || kind === "MATERIAL_FOLDER") {
    const auth = checkRole(session, MATERIAL_EDITOR_ROLES, "Bạn không có quyền chỉnh sửa học liệu!");
    if (!auth.ok) return { ok: false, error: auth.error };
    for (const id of ids) {
      const scope =
        kind === "MATERIAL"
          ? await assertMaterialAccess(session, id, "EDIT")
          : await assertFolderAccess(session, id, "EDIT");
      if (!scope.ok) return scope;
    }
    return { ok: true };
  }

  // ASSIGNMENT
  const auth = checkRole(session, ROLE_GROUPS.EXAM_CREATORS, "Bạn không có quyền xóa bài tập!");
  if (!auth.ok) return { ok: false, error: auth.error };
  for (const id of ids) {
    const perm = await verifyAssignmentDeletionPermission(id, session.userId, session.role);
    if (!perm.ok) return { ok: false, error: perm.error || "Bạn không có quyền xóa bài tập này!" };
  }
  return { ok: true };
}

/**
 * Lấy trước toàn bộ cảnh báo / ràng buộc (số học viên, số lớp, số tài liệu, bài nộp...)
 * ngay khi người dùng bấm nút Xóa để hiển thị trên 1 popup UI duy nhất.
 */
export async function getDeleteImpactAction(input: {
  kind: DeleteKind;
  ids: string[];
  classId?: string;
}): Promise<{ success: boolean; impact?: DeleteImpact; error?: string }> {
  try {
    const auth = checkAuth(await getSession(), "Vui lòng đăng nhập để thực hiện thao tác này!");
    if (!auth.ok) return { success: false, error: auth.error };

    const parsed = impactInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Dữ liệu kiểm tra không hợp lệ!" };
    }

    const { kind, ids, classId } = parsed.data;
    const scope = await authorizeDeleteScope(auth.session, kind, ids);
    if (!scope.ok) return { success: false, error: scope.error };

    const targetIds = kind === "USER" ? ids.filter((id) => id !== auth.session.userId) : ids;
    const impact = await getBatchDeleteImpact(kind, targetIds, { classId });
    return { success: true, impact };
  } catch (err: any) {
    console.error("[getDeleteImpactAction] Lỗi:", err);
    return { success: false, error: err?.message || "Không thể kiểm tra dữ liệu liên quan!" };
  }
}
