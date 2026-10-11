import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding initial IELTS levels...");

  const levels = [
    {
      code: "BASIC",
      name: "Cơ bản",
      minScore: 0.0,
      maxScore: 4.0,
      description: "Trình độ nền tảng, làm quen với định dạng bài thi IELTS",
      targetClassCount: 1,
      sortOrder: 1,
    },
    {
      code: "INTERMEDIATE",
      name: "Trung bình",
      minScore: 4.5,
      maxScore: 6.0,
      description: "Trình độ trung cấp, củng cố kỹ năng và từ vựng học thuật",
      targetClassCount: 2,
      sortOrder: 2,
    },
    {
      code: "ADVANCED",
      name: "Nâng cao",
      minScore: 6.5,
      maxScore: 9.0,
      description: "Trình độ nâng cao, luyện đề chuyên sâu và chiến thuật đạt điểm cao",
      targetClassCount: 3,
      sortOrder: 3,
    },
  ];

  for (const lvl of levels) {
    await prisma.ieltsLevel.upsert({
      where: { code: lvl.code },
      create: lvl,
      update: {
        name: lvl.name,
        minScore: lvl.minScore,
        maxScore: lvl.maxScore,
        description: lvl.description,
        targetClassCount: lvl.targetClassCount,
        sortOrder: lvl.sortOrder,
      },
    });
  }

  console.log("Đã khởi tạo thành công 3 trình độ IELTS chuẩn!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
