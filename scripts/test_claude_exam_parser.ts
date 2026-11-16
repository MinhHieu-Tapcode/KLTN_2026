/**
 * Chạy thử pipeline bóc tách đề bằng Claude trên một tệp PDF/DOCX (không ghi CSDL).
 * MỖI LẦN CHẠY TỐN TIỀN THẬT (khoảng 0,006 USD cho đề 6 trang với Haiku 5.5), nên bắt buộc cờ --confirm-spend.
 *
 * Cách chạy:
 *   npx tsx scripts/test_claude_exam_parser.ts "<đường dẫn đề.pdf>" --skill READING --confirm-spend [--json out.json]
 */
import fs from "fs";
import path from "path";

function loadEnv(file: string) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*["']?(.*?)["']?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// Giá tham khảo USD / 1 triệu token (vào, ra) để ước lượng chi phí lần chạy
const PRICES: Record<string, [number, number]> = {
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-sonnet-5-5": [2, 10],
  "claude-opus-5-5": [4, 20],
};

async function main() {
  const args = process.argv.slice(2);
  const filePath = args.find((a) => !a.startsWith("--"));
  const skill = args[args.indexOf("--skill") + 1] && args.includes("--skill") ? args[args.indexOf("--skill") + 1] : "READING";
  const jsonOut = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;

  if (!filePath || !fs.existsSync(filePath)) {
    console.error("Thiếu hoặc sai đường dẫn tệp đề.");
    process.exit(1);
  }
  if (!args.includes("--confirm-spend")) {
    console.error("Lần chạy này gọi Claude API và tốn tiền thật. Thêm cờ --confirm-spend để xác nhận.");
    process.exit(1);
  }

  loadEnv(path.resolve(process.cwd(), ".env"));
  const { parseExamWithClaude } = await import("../src/services/claude-exam-pipeline.service");

  const buf = fs.readFileSync(filePath);
  const name = path.basename(filePath);
  const file = new File([buf], name, { type: name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "" });

  const t0 = Date.now();
  const res = await parseExamWithClaude({
    title: name.replace(/\.[^.]+$/, ""),
    skill,
    durationMinutes: 60,
    audioUrl: null,
    excelAnswersRaw: "",
    pdfTextRaw: "",
    file,
  });
  console.log(`\n=== ${name} (${skill}) – ${Date.now() - t0} ms`);
  if (!res.ok) {
    console.log("THẤT BẠI:", res.reason);
    process.exit(2);
  }

  const d = res.data;
  const info = d.engineInfo!;
  const price = PRICES[info.model || ""] || [0, 0];
  const cost = ((info.inputTokens || 0) * price[0] + (info.outputTokens || 0) * price[1]) / 1e6;
  console.log(`Model: ${info.model}${info.escalated ? " (đã leo thang)" : ""} | token vào ${info.inputTokens}, ra ${info.outputTokens} | ~${cost.toFixed(4)} USD`);

  const sections = d.sections || [{ id: "main", title: d.title, skill: d.skill, passageText: d.passageText, questions: d.questions }];
  for (const s of sections) {
    const nums = s.questions.map((q) => q.questionNumber);
    const image = s.questions.filter((q) => q.renderMode === "IMAGE").map((q) => q.questionNumber);
    console.log(`\n[${s.id}] ${s.title}`);
    console.log(`  Câu: ${nums.length} (${Math.min(...nums)}-${Math.max(...nums)})${image.length ? ` | dạng ảnh: ${image.join(",")}` : ""}`);
    console.log(`  Bài đọc: ${s.passageText.length} ký tự | đầu: "${s.passageText.slice(0, 60)}" | cuối: "${s.passageText.slice(-60)}"`);
    const types = new Map<string, number[]>();
    s.questions.forEach((q) => types.set(q.ieltsQuestionType || q.type, [...(types.get(q.ieltsQuestionType || q.type) || []), q.questionNumber]));
    types.forEach((v, k) => console.log(`  ${k}: ${v.join(",")}`));
  }
  console.log(`\nBảng: ${d.tables?.length || 0} | Flowchart: ${d.flowcharts?.length || 0} | Tóm tắt: ${d.summaries?.length || 0} | Nối tiêu đề: ${d.matchingHeadings?.length || 0}`);
  d.tables?.forEach((t) => console.log(`  Bảng câu ${t.questionNumbers.join(",")}: ${t.headers.join(" | ")}`));
  d.flowcharts?.forEach((f) => console.log(`  Flowchart "${f.title}": ${f.boxes.length} hộp, câu ${f.questionNumbers.join(",")}`));
  console.log("\nVí dụ prompt:");
  d.questions.filter((_, i) => i % 5 === 0).forEach((q) => console.log(`  ${q.questionNumber}. [${q.type}] ${q.prompt.slice(0, 110)}`));
  console.log("\nCảnh báo:");
  (d.invariantsReport?.warnings || []).forEach((w: string) => console.log("  -", w));
  (d.invariantsReport?.errors || []).forEach((e: string) => console.log("  ! LỖI:", e));
  if (d.unassigned?.length) console.log("\nKhông thuộc phần thi:", d.unassigned.map((u) => `${u.kind} (trang ${u.page})`).join("; "));

  if (jsonOut) {
    fs.writeFileSync(jsonOut, JSON.stringify(d, null, 1));
    console.log(`\nĐã ghi kết quả đầy đủ vào ${jsonOut}`);
  }
}

main().catch((err) => {
  console.error("Lỗi:", err instanceof Error ? err.message : err);
  process.exit(1);
});
