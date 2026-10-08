import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.school.update({
    where: { id: "465e1170-5221-4601-843c-9e0a88c6801a" },
    data: {
      address: "Số 10 Phố Quan Hoa, Đống Đa, Hà Nội",
      contactName: "Cô Nguyễn Thu Hà (Hiệu phó)",
      contactPhone: "02438521199",
      managerId: "6b13c498-5251-4c86-905b-83976b3f972a",
    },
  });

  await prisma.school.update({
    where: { id: "5e4f6ab3-6cbd-403a-b596-32ee19bb744c" },
    data: {
      address: "105 Bạch Mai, Hai Bà Trưng, Hà Nội",
      contactName: "Thầy Trần Văn Bình (Ban Giám hiệu)",
      contactPhone: "02438631122",
      managerId: "2a2bf724-4680-44e0-a626-c27a0c48f4f3",
    },
  });

  console.log("Updated schools data successfully");
}

main().catch(console.error).finally(() => prisma.$disconnect());
