import { prisma, isDbAlive } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureDefaultAdminAction } from "@/actions/auth";
import { getSchoolsAction, getSchoolManagersAction } from "@/actions/schools";
import { getClassesAction } from "@/actions/classes";
import { getUsersAction, getTeachersAction, getTAsAction } from "@/actions/users";
import { getSystemPermissionsAction } from "@/actions/permissions";
import { getIeltsLevelsAction } from "@/actions/ielts-levels";
import { SimpaceApp } from "@/components/simpace-app";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const dbOnline = await isDbAlive();

  if (dbOnline) {
    try {
      await ensureDefaultAdminAction();
    } catch (err) {
      console.warn("[HomePage] DB notice (ensureDefaultAdminAction):", (err as any)?.message);
    }
  }

  let session = await getSession();
  if (session?.userId && dbOnline) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          username: true,
          email: true,
          role: { select: { code: true } },
          profile: true,
        },
      });
      if (dbUser) {
        session = {
          ...session,
          id: dbUser.id,
          userId: dbUser.id,
          username: dbUser.username,
          email: dbUser.email,
          role: dbUser.role.code,
          fullName: dbUser.profile?.fullName || dbUser.username,
          phoneNumber: dbUser.profile?.phoneNumber || "",
          address: dbUser.profile?.address || "",
          dateOfBirth: dbUser.profile?.dateOfBirth
            ? dbUser.profile.dateOfBirth.toISOString().split("T")[0]
            : "",
          gender: dbUser.profile?.gender || null,
          profile: dbUser.profile,
        } as any;
      }
    } catch (err) {
      console.warn("[HomePage] DB notice (findUnique user):", (err as any)?.message);
    }
  }

  let schools: any[] = [];
  let classes: any[] = [];
  let users: any[] = [];
  let managers: any[] = [];
  let teachers: any[] = [];
  let tas: any[] = [];
  let permissions: any[] = [];
  let ieltsLevelsRes: any = { levels: [] };

  try {
    const results = await Promise.all([
      getSchoolsAction().catch(() => []),
      getClassesAction().catch(() => []),
      getUsersAction().catch(() => []),
      getSchoolManagersAction().catch(() => []),
      getTeachersAction().catch(() => []),
      getTAsAction().catch(() => []),
      getSystemPermissionsAction().catch(() => []),
      getIeltsLevelsAction().catch(() => ({ levels: [] })),
    ]);

    schools = results[0] || [];
    classes = results[1] || [];
    users = results[2] || [];
    managers = results[3] || [];
    teachers = results[4] || [];
    tas = results[5] || [];
    permissions = results[6] || [];
    ieltsLevelsRes = results[7] || { levels: [] };
  } catch (err) {
    console.warn("[HomePage] DB notice (fetch initial data):", (err as any)?.message);
  }

  // Cung cấp dữ liệu mẫu dự phòng khi cơ sở dữ liệu chưa sẵn sàng
  if (!classes || classes.length === 0) {
    classes = [
      {
        id: "demo-class-1",
        code: "IELTS_TD_01",
        name: "IELTS Bứt Phá - 10A1",
        program: "IELTS",
        level: "5.5 - 6.5",
        capacity: 30,
        status: "ACTIVE",
        description: "Thứ 2, 4, 6 (18:00 - 20:00)",
        school: { name: "THPT Trương Định" },
        schoolId: "demo-school-1",
        isActive: true,
        assignments: [
          {
            id: "as-1",
            userId: "teacher-1",
            roleInClass: "TEACHER",
            staff: { username: "teacher1", email: "gv.nguyenvan@simpace.vn", profile: { fullName: "ThS. Nguyễn Văn A" } },
          },
        ],
        enrollments: [
          {
            id: "en-1",
            studentId: "st-1",
            status: "STUDYING",
            student: { username: "HV001", email: "hv001@simpace.vn", profile: { fullName: "Trần Thị Lan", entryIeltsScore: 5.5 } },
          },
          {
            id: "en-2",
            studentId: "st-2",
            status: "STUDYING",
            student: { username: "HV002", email: "hv002@simpace.vn", profile: { fullName: "Lê Hoàng Long", entryIeltsScore: 6.0 } },
          },
        ],
      },
      {
        id: "demo-class-2",
        code: "IELTS_KL_02",
        name: "IELTS Nền Tảng - 11B2",
        program: "IELTS",
        level: "4.0 - 5.0",
        capacity: 25,
        status: "UPCOMING",
        description: "Thứ 3, 5, 7 (19:30 - 21:30)",
        school: { name: "THPT Kim Liên" },
        schoolId: "demo-school-2",
        isActive: true,
        assignments: [],
        enrollments: [],
      },
    ];
  }

  if (!schools || schools.length === 0) {
    schools = [
      { id: "demo-school-1", code: "SCH_TD", name: "THPT Trương Định", type: "THPT", address: "Hoàng Mai, Hà Nội", isActive: true },
      { id: "demo-school-2", code: "SCH_KL", name: "THPT Kim Liên", type: "THPT", address: "Đống Đa, Hà Nội", isActive: true },
    ];
  }

  return (
    <SimpaceApp
      initialSession={session}
      initialSchools={schools}
      initialClasses={classes}
      initialUsers={users}
      initialManagers={managers}
      initialTeachers={teachers}
      initialTAs={tas}
      initialPermissions={permissions}
      initialIeltsLevels={ieltsLevelsRes?.levels || []}
    />
  );
}
