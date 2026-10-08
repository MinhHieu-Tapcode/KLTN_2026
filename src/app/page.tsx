import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureDefaultAdminAction } from "@/actions/auth";
import { getSchoolsAction, getSchoolManagersAction } from "@/actions/schools";
import { getClassesAction } from "@/actions/classes";
import { getUsersAction, getTeachersAction, getTAsAction } from "@/actions/users";
import { getSystemPermissionsAction } from "@/actions/permissions";
import { SimpaceApp } from "@/components/simpace-app";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureDefaultAdminAction();

  let session = await getSession();
  if (session?.userId) {
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
  }

  const [schools, classes, users, managers, teachers, tas, permissions] = await Promise.all([
    getSchoolsAction(),
    getClassesAction(),
    getUsersAction(),
    getSchoolManagersAction(),
    getTeachersAction(),
    getTAsAction(),
    getSystemPermissionsAction(),
  ]);

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
    />
  );
}
