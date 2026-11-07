import { prisma } from "../src/lib/prisma";

async function main() {
  const schools = await prisma.school.findMany({
    select: { id: true, code: true, name: true, _count: { select: { classes: true } } },
  });
  console.log("=== DANH SÁCH TRƯỜNG HỌC HIỆN CÓ ===");
  console.table(schools);

  const classes = await prisma.class.findMany({
    select: { id: true, code: true, name: true, schoolId: true, school: { select: { name: true, code: true } } },
  });
  console.log("=== DANH SÁCH LỚP HỌC HIỆN CÓ ===");
  console.table(classes.map(c => ({
    id: c.id,
    code: c.code,
    name: c.name,
    schoolId: c.schoolId,
    schoolName: c.school?.name,
    schoolCode: c.school?.code,
  })));
}

main().finally(() => prisma.$disconnect());
