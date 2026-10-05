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

  const session = await getSession();

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
