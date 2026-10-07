import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Updating VIEW_CLASSES permission in DB...");
  await prisma.systemPermission.update({
    where: { featureKey: "VIEW_CLASSES" },
    data: {
      allowedRoles: ["ADMIN", "SCHOOL_MANAGER", "TEACHER", "TEACHING_ASSISTANT"],
    },
  });
  console.log("Updated VIEW_CLASSES successfully!");

  const perms = await prisma.systemPermission.findMany({
    orderBy: { featureKey: "asc" },
  });
  for (const p of perms) {
    console.log(`- ${p.featureKey}: [${p.allowedRoles.join(", ")}]`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
