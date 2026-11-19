/**
 * Xếp nhận xét báo cáo cũ vào đúng khung sau khi thêm cột report_comments.authorType.
 *
 * Trước khi có cột này, Giáo viên và Quản nhiệm dùng chung một ô nên mọi bản ghi cũ
 * đều nhận giá trị mặc định TEACHER. Script này chuyển các bản ghi do tài khoản
 * Quản nhiệm (SCHOOL_MANAGER) viết sang khung MANAGER. Bản ghi do Admin hoặc Giáo viên
 * viết giữ nguyên ở khung TEACHER.
 *
 * Cách dùng:
 *   node scripts/backfill-report-comment-author-type.js --dry-run   (chỉ in, không ghi)
 *   node scripts/backfill-report-comment-author-type.js             (ghi thật, lưu danh sách id đã đổi)
 *   node scripts/backfill-report-comment-author-type.js --cleanup   (trả các id đã đổi về TEACHER)
 *
 * Bảng bị ghi: report_comments (chỉ cột authorType). Không đụng bảng nào khác.
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const LOG_FILE = path.join(__dirname, ".backfill-report-comment-author-type.ids.json");

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isCleanup = args.includes("--cleanup");

async function findTargets() {
  return prisma.reportComment.findMany({
    where: {
      authorType: "TEACHER",
      author: { role: { code: "SCHOOL_MANAGER" } },
    },
    select: {
      id: true,
      scope: true,
      periodKey: true,
      isActive: true,
      class: { select: { code: true } },
      author: { select: { username: true } },
    },
  });
}

async function runBackfill() {
  const total = await prisma.reportComment.count();
  const targets = await findTargets();

  console.log(`Bảng report_comments: tổng ${total} dòng.`);
  console.log(`Số dòng sẽ đổi authorType TEACHER -> MANAGER: ${targets.length}`);
  for (const t of targets) {
    console.log(
      `  - ${t.id} | lớp ${t.class?.code ?? "?"} | ${t.scope} | kỳ ${t.periodKey} | người viết ${t.author.username}${t.isActive ? "" : " | đã xóa mềm"}`
    );
  }

  if (isDryRun) {
    console.log("\n[--dry-run] Không ghi gì vào CSDL.");
    return;
  }
  if (targets.length === 0) {
    console.log("Không có dòng nào cần đổi.");
    return;
  }

  const ids = targets.map((t) => t.id);
  const res = await prisma.reportComment.updateMany({
    where: { id: { in: ids } },
    data: { authorType: "MANAGER" },
  });

  const previous = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, "utf8")) : [];
  fs.writeFileSync(LOG_FILE, JSON.stringify([...new Set([...previous, ...ids])], null, 2));
  console.log(`Đã đổi ${res.count} dòng. Danh sách id lưu tại ${LOG_FILE} để dùng cho --cleanup.`);
}

async function runCleanup() {
  if (!fs.existsSync(LOG_FILE)) {
    console.log("Không tìm thấy file danh sách id đã đổi, không có gì để hoàn tác.");
    return;
  }
  const ids = JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
  console.log(`Sẽ trả ${ids.length} dòng report_comments về authorType = TEACHER.`);
  const res = await prisma.reportComment.updateMany({
    where: { id: { in: ids }, authorType: "MANAGER" },
    data: { authorType: "TEACHER" },
  });
  fs.unlinkSync(LOG_FILE);
  console.log(`Đã hoàn tác ${res.count} dòng.`);
}

(isCleanup ? runCleanup() : runBackfill())
  .catch((err) => {
    console.error("Lỗi:", err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
