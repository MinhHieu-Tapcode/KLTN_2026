import { prisma } from "../src/lib/prisma";

async function main() {
  const perms = await prisma.systemPermission.findMany({
    orderBy: { featureKey: "asc" },
  });
  console.log("System Permissions count:", perms.length);
  for (const p of perms) {
    console.log(`- ${p.featureKey}: [${p.allowedRoles.join(", ")}]`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
