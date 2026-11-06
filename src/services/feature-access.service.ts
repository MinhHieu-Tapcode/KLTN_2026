import type { SessionPayload } from "@/lib/auth";
import { hasFeatureAccess, type AuthCheckResult } from "@/lib/permissions";
import { getPermissionAllowedRolesService } from "@/services/permission.service";

/**
 * AUTHZ-35: áp ma trận phân quyền động (bảng SystemPermission) ở phía server.
 * Chạy SAU kiểm tra nhóm vai trò cố định, nên ma trận chỉ có thể THU HẸP quyền (Admin tắt quyền của một vai trò),
 * không thể mở rộng quyền vượt nhóm vai trò cố định của từng action.
 */
export async function requireFeature(
  session: SessionPayload,
  featureKey: string,
  forbiddenMsg: string = "Tính năng này đã bị tắt đối với vai trò của bạn!"
): Promise<AuthCheckResult> {
  const allowed = await getPermissionAllowedRolesService(featureKey);
  if (!hasFeatureAccess(session, featureKey, allowed)) {
    return { ok: false, error: forbiddenMsg };
  }
  return { ok: true, session };
}
