/**
 * Lọc các lớp học mà người dùng hiện tại được phép thấy / thao tác bài tập:
 * - ADMIN: tất cả lớp đang hoạt động
 * - SCHOOL_MANAGER: lớp thuộc trường mình quản nhiệm
 * - TEACHER: lớp mình được phân công giảng dạy
 * - STUDENT: lớp mình đang theo học
 */
export function filterAccessibleClasses(classes: any[], currentUser: any): any[] {
  const currentUid = currentUser?.id || currentUser?.userId;

  return classes.filter((c) => {
    if (!c.isActive) return false;
    if (!currentUser) return false;
    if (currentUser.role === "ADMIN") return true;

    if (currentUser.role === "SCHOOL_MANAGER") {
      return (
        c.school?.managerId === currentUid ||
        c.school?.manager?.id === currentUid ||
        c.school?.manager?.username === currentUser.username ||
        currentUser.managedSchools?.some((ms: any) => ms.id === c.schoolId)
      );
    }

    if (currentUser.role === "TEACHER") {
      return c.assignments?.some(
        (a: any) =>
          a.userId === currentUid ||
          a.staff?.id === currentUid ||
          (currentUser.username && a.staff?.username === currentUser.username) ||
          (currentUser.email && a.staff?.email === currentUser.email)
      );
    }

    if (currentUser.role === "STUDENT") {
      return c.enrollments?.some(
        (e: any) =>
          e.status !== "DROPPED" &&
          e.status !== "TRANSFERRED" &&
          e.isActive !== false &&
          (e.studentId === currentUid ||
            e.student?.id === currentUid ||
            (currentUser.username && e.student?.username === currentUser.username) ||
            (currentUser.email && e.student?.email === currentUser.email))
      );
    }

    return false;
  });
}
