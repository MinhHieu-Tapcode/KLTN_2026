"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { checkRole, ROLE_GROUPS } from "@/lib/permissions";
import { stripSensitive } from "@/lib/sanitize";
import { verifyAssignmentOwnership } from "@/services/assignment.service";
import { assertClassAccess } from "@/services/access-scope.service";
import { searchAssignmentsService } from "@/services/assignment-search.service";
import {
  getAssignmentForEditService,
  updateAssignmentSafeService,
} from "@/services/assignment-edit.service";
import { regradeAssignmentSubmissionsService } from "@/services/assignment.service";
import {
  assignmentEditSchema,
  assignmentSearchSchema,
} from "@/lib/validations/assignment-edit";

function safeRevalidate() {
  try {
    revalidatePath("/");
  } catch {}
}

/** Tìm kiếm bài tập xuyên lớp (Admin, Quản nhiệm, Giáo viên; học viên không có quyền). */
export async function searchAssignmentsAction(input: unknown) {
  try {
    const auth = checkRole(
      await getSession(),
      ROLE_GROUPS.STAFF_AND_ADMIN,
      "Bạn không có quyền tìm kiếm bài tập!",
      "Vui lòng đăng nhập!"
    );
    if (!auth.ok) return { success: false, items: [], total: 0, page: 1, pageSize: 20, error: auth.error };

    const parsed = assignmentSearchSchema.safeParse(input ?? {});
    if (!parsed.success) {
      return {
        success: false,
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        error: parsed.error.issues[0]?.message || "Bộ lọc không hợp lệ!",
      };
    }

    if (parsed.data.classId) {
      const scope = await assertClassAccess(auth.session, parsed.data.classId, "VIEW");
      if (!scope.ok) return { success: false, items: [], total: 0, page: 1, pageSize: 20, error: scope.error };
    }

    return await searchAssignmentsService(
      { role: String(auth.session.role), userId: auth.session.userId },
      parsed.data
    );
  } catch (err: any) {
    console.error("[searchAssignmentsAction] Lỗi:", err);
    return { success: false, items: [], total: 0, page: 1, pageSize: 20, error: "Không thể tìm kiếm bài tập!" };
  }
}

/** Nạp dữ liệu bài tập vào form sửa (kèm đáp án, chỉ Admin/GV có quyền với bài). */
export async function getAssignmentForEditAction(assignmentId: string) {
  try {
    const auth = checkRole(
      await getSession(),
      ROLE_GROUPS.EXAM_CREATORS,
      "Chỉ Giáo viên và Quản trị viên mới có quyền sửa bài tập!",
      "Vui lòng đăng nhập!"
    );
    if (!auth.ok) return { success: false, error: auth.error };

    const ownership = await verifyAssignmentOwnership(assignmentId, auth.session.userId, auth.session.role);
    if (!ownership.ok) return { success: false, error: ownership.error };

    return stripSensitive(await getAssignmentForEditService(assignmentId));
  } catch (err: any) {
    console.error("[getAssignmentForEditAction] Lỗi:", err);
    return { success: false, error: "Không thể tải dữ liệu bài tập!" };
  }
}

/** Lưu chỉnh sửa bài tập (validate zod, giữ nguyên bài làm của học viên). */
export async function editAssignmentAction(input: unknown) {
  try {
    const auth = checkRole(
      await getSession(),
      ROLE_GROUPS.EXAM_CREATORS,
      "Chỉ Giáo viên và Quản trị viên mới có quyền sửa bài tập!",
      "Vui lòng đăng nhập!"
    );
    if (!auth.ok) return { success: false, error: auth.error };

    const parsed = assignmentEditSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ!" };
    }

    const ownership = await verifyAssignmentOwnership(
      parsed.data.assignmentId,
      auth.session.userId,
      auth.session.role
    );
    if (!ownership.ok) return { success: false, error: ownership.error };

    // GV (không phải Admin) chỉ được đổi hạn nộp của lớp mình dạy
    if (auth.session.role !== "ADMIN") {
      for (const c of parsed.data.classSchedules || []) {
        const scope = await assertClassAccess(auth.session, c.classId, "TEACH");
        if (!scope.ok) return { success: false, error: scope.error };
      }
    }

    const res = await updateAssignmentSafeService(parsed.data);
    if (res.success) safeRevalidate();
    return res;
  } catch (err: any) {
    console.error("[editAssignmentAction] Lỗi:", err);
    return { success: false, error: "Không thể lưu thay đổi bài tập!" };
  }
}

/** Chấm lại toàn bộ bài nộp trắc nghiệm sau khi sửa đáp án (dùng service chấm lại có sẵn). */
export async function regradeAfterEditAction(assignmentId: string) {
  try {
    const auth = checkRole(
      await getSession(),
      ROLE_GROUPS.EXAM_CREATORS,
      "Chỉ Giáo viên và Quản trị viên mới có quyền chấm lại bài tập!",
      "Vui lòng đăng nhập!"
    );
    if (!auth.ok) return { success: false, regradedCount: 0, error: auth.error };

    const ownership = await verifyAssignmentOwnership(assignmentId, auth.session.userId, auth.session.role);
    if (!ownership.ok) return { success: false, regradedCount: 0, error: ownership.error };

    const res = await regradeAssignmentSubmissionsService(assignmentId);
    safeRevalidate();
    return res;
  } catch (err: any) {
    console.error("[regradeAfterEditAction] Lỗi:", err);
    return { success: false, regradedCount: 0, error: "Chấm lại bài tập thất bại!" };
  }
}
