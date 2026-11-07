import { prisma } from "../src/lib/prisma";

async function main() {
  const teacher = await prisma.user.findFirst({
    where: { email: "teacher@simpace.vn" },
    include: { classAssignments: { include: { class: true } } },
  });
  const student = await prisma.user.findFirst({
    where: { email: "student@simpace.vn" },
    include: { classEnrollments: { include: { class: true } } },
  });

  console.log("Teacher classes:", teacher?.classAssignments.map(c => ({ id: c.class.id, code: c.class.code, name: c.class.name })));
  console.log("Student classes:", student?.classEnrollments.map(e => ({ id: e.class.id, code: e.class.code, name: e.class.name })));
}

main().finally(() => prisma.$disconnect());
