import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export interface ExtractedDocument {
  cleanedText: string;
  pageCount: number;
  parts: Array<{
    title: string;
    detectedSkill?: "READING" | "LISTENING" | "WRITING" | "SPEAKING";
    content: string;
  }>;
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

/**
 * Chuyển HTML từ mammoth.convertToHtml sang văn bản có cấu trúc (giữ nguyên bảng biểu Table Completion, danh sách, đoạn văn)
 */
function htmlToStructuredText(html: string): string {
  let text = html;

  // Chuyển bảng <table> sang định dạng bảng rõ ràng cho Ebook Cột 1
  text = text.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableInner: string) => {
    const rows: string[] = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;
    while ((rowMatch = rowRegex.exec(tableInner)) !== null) {
      const cells: string[] = [];
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch: RegExpExecArray | null;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        const cellContent = cellMatch[1]
          .replace(/<\/p>|<br\s*\/?>/gi, " ")
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim();
        cells.push(cellContent);
      }
      if (cells.length > 0) {
        rows.push(`| ${cells.join(" | ")} |`);
      }
    }
    return rows.length > 0 ? `\n\n${rows.join("\n")}\n\n` : "";
  });

  // Bảo toàn định dạng in đậm (<strong>, <b>) và in nghiêng (<em>, <i>) sang cú pháp Markdown
  text = text
    .replace(/<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, (_, inner: string) => {
      const cleanInner = inner.replace(/<[^>]+>/g, "").trim();
      return cleanInner ? `**${cleanInner}**` : "";
    })
    .replace(/<(?:em|i)\b[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, (_, inner: string) => {
      const cleanInner = inner.replace(/<[^>]+>/g, "").trim();
      return cleanInner ? `*${cleanInner}*` : "";
    });

  // Giữ ngắt dòng cho các thẻ khối
  text = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "");

  // Giải mã HTML entities phổ biến
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");

  return text;
}

/**
 * Bước 2 & 3: Đọc file (.pdf / .docx), kiểm tra PDF scan, dọn rác và nối mạch văn bản
 */
export async function extractAndCleanDocument(
  file: File
): Promise<
  | { ok: true; data: ExtractedDocument }
  | { ok: false; error: string; isScannedPdf?: boolean }
> {
  if (!file || file.size === 0) {
    return { ok: false, error: "Tệp tải lên đang trống. Vui lòng chọn tệp hợp lệ!" };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: "Dung lượng tệp vượt quá giới hạn 25MB. Vui lòng chọn tệp nhỏ hơn!",
    };
  }

  const fileName = file.name.toLowerCase();
  const isPdf = fileName.endsWith(".pdf") || file.type === "application/pdf";
  const isDocx =
    fileName.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (!isPdf && !isDocx) {
    return {
      ok: false,
      error: "Định dạng tệp chưa hỗ trợ. Vui lòng tải lên tệp PDF (.pdf) hoặc Word (.docx)!",
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    let pageTexts: string[] = [];
    let pageCount = 1;

    if (isDocx) {
      const buffer = Buffer.from(arrayBuffer);
      let structuredText = "";
      try {
        const htmlRes = await mammoth.convertToHtml({ buffer });
        if (htmlRes.value) {
          structuredText = htmlToStructuredText(htmlRes.value).trim();
        }
      } catch {
        // Fallback xuống extractRawText nếu convertToHtml gặp lỗi
      }

      if (!structuredText || structuredText.length < 20) {
        const rawRes = await mammoth.extractRawText({ buffer });
        structuredText = (rawRes.value || "").trim();
      }

      if (structuredText.length < 20) {
        return {
          ok: false,
          error:
            "Tệp Word (.docx) không chứa đủ nội dung văn bản (có thể chỉ chứa hình ảnh). Vui lòng kiểm tra lại tệp!",
        };
      }
      pageTexts = [structuredText];
      pageCount = 1;
    } else {
      const uint8 = new Uint8Array(arrayBuffer);
      const pdf = await getDocumentProxy(uint8);
      pageCount = pdf.numPages || 1;
      const extracted = await extractText(pdf, { mergePages: false });
      pageTexts = Array.isArray(extracted.text) ? extracted.text : [String(extracted.text || "")];

      const totalChars = pageTexts.join("").replace(/\s+/g, "").length;
      if (totalChars < 40) {
        return {
          ok: false,
          isScannedPdf: true,
          error:
            "Tệp PDF này là bản quét hình ảnh (file scan), đang chuyển sang chế độ quét OCR...",
        };
      }
    }

    const cleanedText = cleanAndReflowPages(pageTexts);
    const parts = splitIntoExamParts(cleanedText);

    return {
      ok: true,
      data: {
        cleanedText,
        pageCount,
        parts,
      },
    };
  } catch (err: any) {
    console.error("[extractAndCleanDocument] Lỗi đọc file:", err);
    return {
      ok: false,
      error: "Không thể đọc nội dung tệp. Tệp có thể bị hỏng hoặc đặt mật khẩu bảo vệ!",
    };
  }
}

/**
 * Dọn rác văn bản theo kỹ thuật từ pdf-2-epub-docx:
 * 1. Xóa dòng Header / Footer lặp lại giữa các trang và số trang ("Page 1 of 4", "- 2 -")
 * 2. Nối từ bị gạch ngang ở cuối dòng (De-hyphenation: "infor-\nmation" -> "information")
 * 3. Nối các dòng bị ngắt cứng trong cùng một đoạn văn nhưng giữ nguyên cấu trúc đề thi
 */
export function cleanAndReflowPages(pages: string[]): string {
  const lineFreq = new Map<string, number>();
  if (pages.length >= 2) {
    for (const page of pages) {
      const uniqueLinesInPage = new Set(
        page
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0 && l.length <= 80)
      );
      for (const l of Array.from(uniqueLinesInPage)) {
        lineFreq.set(l, (lineFreq.get(l) || 0) + 1);
      }
    }
  }

  const minRepeatCount = Math.max(2, Math.ceil(pages.length * 0.5));

  const cleanedPages = pages.map((page) => {
    const lines = page.split(/\r?\n/);
    const filtered = lines.filter((rawLine) => {
      const line = rawLine.trim();
      if (!line) return true;

      // Bỏ số trang phổ biến: "Page 1 of 4", "Page 2", "- 3 -", "1 / 4"
      if (
        /^(page\s+\d+(\s+of\s+\d+)?|trang\s+\d+(\/\d+)?|-\s*\d+\s*-|\d+\s*\/\s*\d+)$/i.test(
          line
        )
      ) {
        return false;
      }

      // Bỏ dòng chân trang chứa link website, watermark, bản quyền tải đề (ví dụ: "http: //ieltscuecard.trendinggyan.com/ Page 3")
      if (
        /^(https?:\s*\/|\/\/[a-z0-9\-\.]+\.[a-z]{2,}|www\.[a-z0-9\-]+|[a-z0-9\-\.]+\.(?:com|org|net|edu|vn|in)\/)/i.test(
          line
        ) ||
        /(?:https?:\s*\/|\/\/[a-z0-9\-\.]+\.[a-z]{2,}).*page\s*\d+/i.test(line) ||
        /^(copyright|all\s+rights\s+reserved|downloaded\s+from)\b/i.test(line)
      ) {
        return false;
      }

      // Bỏ dòng Header/Footer lặp ở nhiều trang (nhưng không bỏ các tiêu đề câu hỏi/kỹ năng)
      if (
        pages.length >= 2 &&
        (lineFreq.get(line) || 0) >= minRepeatCount &&
        !/^(part|section|reading|listening|writing|speaking|questions?|task|passage)\b/i.test(
          line
        )
      ) {
        return false;
      }

      return true;
    });

    return filtered.join("\n");
  });

  let merged = "";
  for (let i = 0; i < cleanedPages.length; i++) {
    const page = cleanedPages[i].trim();
    if (!page) continue;
    if (!merged) {
      merged = page;
    } else {
      const lastLineOfPrev = merged.split(/\r?\n/).pop()?.trim() || "";
      const firstLineOfNext = page.split(/\r?\n/)[0]?.trim() || "";

      // Nếu dòng cuối trang trước chưa hết câu và dòng đầu trang sau bắt đầu bằng chữ thường
      // thì nối mềm bằng \n thay vì \n\n để không bị ngắt đoạn giữa chừng câu văn
      const prevEndsSentence = /[.?!:]$/.test(lastLineOfPrev);
      const nextStartsWithLower = /^[a-z]/.test(firstLineOfNext);

      if (!prevEndsSentence || nextStartsWithLower) {
        merged += "\n" + page;
      } else {
        merged += "\n\n" + page;
      }
    }
  }

  // 1. De-hyphenation: nối từ bị gạch nối ở cuối dòng (ví dụ: "organi-\nsation" -> "organisation")
  merged = merged.replace(/([a-zA-Z]{2,})-\s*\r?\n\s*([a-z]{2,})/g, "$1$2");

  // 2. Chuẩn hóa dấu ngoặc kép và khoảng trắng thừa
  merged = merged
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[ \t]+/g, " ");

  // 3. Reflow các dòng văn xuôi bị ngắt cứng, bảo toàn tiêu đề, câu hỏi, phương án và biểu mẫu
  const rawLines = merged.split(/\r?\n/);
  const reflowedLines: string[] = [];

  const isStructuralLine = (line: string): boolean => {
    const t = line.trim();
    if (!t) return true;
    // Bảng biểu Markdown | ... |
    if (t.startsWith("|") && t.endsWith("|")) return true;
    // Tiêu đề phần / kỹ năng / câu hỏi / đoạn văn
    if (
      /^(reading\s+passage|passage\s+(?:\d+|one|two|three|i|ii|iii|[a-d])|listening|writing\s+task|speaking|part\s+(?:\d+|one|two|three|four|i|ii|iii|iv|[a-d])|section\s+(?:\d+|one|two|three|four|i|ii|iii|iv|[a-d])|questions?\s+\d+|task\s+(?:\d+|one|two)|paragraph\s+[a-z])\b/i.test(
        t
      )
    ) {
      return true;
    }

    // Nếu dòng bắt đầu bằng gạch ngang/em-dash nhưng theo sau là chữ thường (ví dụ: "— as animals in a sociological experiment...")
    // Đây là mệnh đề chêm xen trong câu văn xuôi, KHÔNG phải bullet point hay câu hỏi độc lập!
    if (/^[-–—]\s*[a-z]/.test(t)) {
      return false;
    }

    // Câu hỏi đánh số (1-999), nhãn câu hỏi [Question 1], (1), phương án A., B., C., D., nhãn đoạn văn (A Once..., B The...) hoặc bullet point thực sự
    if (
      /^(\d{1,3}[\.\)\s]|\[?question\s*\d+\]?|\(\d{1,3}\)|[A-H][\.\)]\s|•|\*|[-–—]\s+[A-Z0-9])/i.test(
        t
      ) ||
      /^[A-Z]\s+[A-Z]/.test(t)
    ) {
      return true;
    }
    // Matching Headings số La Mã (i. ii. iii. iv. v. vi. vii. viii. ix. x.)
    if (/^(?:[ivxlc]+)[\.\)]\s/i.test(t)) {
      return true;
    }
    // Dòng Tiêu đề bài đọc ngắn (Passage Title: dưới 70 ký tự, không kết thúc bằng dấu chấm/phẩy)
    if (
      t.length <= 70 &&
      t.length >= 3 &&
      !/[.,:;]$/.test(t) &&
      (/^[A-Z][A-Za-z0-9\s,'"-]+$/.test(t) || t === t.toUpperCase()) &&
      !/^(the|a|an|in|on|at|by|for|with|and|but|or)\b/i.test(t)
    ) {
      return true;
    }
    // Dòng chứa biểu mẫu điền từ (có chỗ trống ___ hoặc ...) hoặc nhãn ngắn có dấu hai chấm (Name: ...)
    if (
      /(___+|\.{3,}|\[question\s*\d+\]|\[\d+\])/i.test(t) ||
      /^[A-Za-z\s]{2,30}:\s*/.test(t)
    ) {
      return true;
    }
    // Dòng in hoa toàn bộ (Heading)
    if (t.length <= 90 && t === t.toUpperCase() && /[A-Z]/.test(t)) {
      return true;
    }
    return false;
  };

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      if (reflowedLines.length > 0 && reflowedLines[reflowedLines.length - 1] !== "") {
        reflowedLines.push("");
      }
      continue;
    }

    const prev = reflowedLines.length > 0 ? reflowedLines[reflowedLines.length - 1] : "";
    if (
      prev &&
      prev !== "" &&
      !isStructuralLine(prev) &&
      !isStructuralLine(trimmed) &&
      !/[.!?:"]$/.test(prev)
    ) {
      reflowedLines[reflowedLines.length - 1] = `${prev} ${trimmed}`;
    } else {
      reflowedLines.push(trimmed);
    }
  }

  return reflowedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Tách văn bản đề thi thành các Phần (Part / Passage / Section / Task)
 * Hỗ trợ số thường (1, 2, 3), chữ tiếng Anh (ONE, TWO, THREE, FOUR) và số La Mã (I, II, III, IV)
 */
export function splitIntoExamParts(cleanedText: string): Array<{
  title: string;
  detectedSkill?: "READING" | "LISTENING" | "WRITING" | "SPEAKING";
  content: string;
}> {
  const numToken = "(?:\\d+|ONE|TWO|THREE|FOUR|I|II|III|IV|[A-D])";
  // CHỈ chia Phần thi khi gặp tiêu đề Phần thi / Bài đọc lớn (Passage 1, 2, 3 hoặc Section 1, 2, 3, 4 hoặc Writing Task 1, 2)
  // TUYỆT ĐỐI KHÔNG chia theo nhóm câu hỏi con (như Questions 1-4, Questions 5-10) vì chúng thuộc chung 1 bài đọc
  const headingRegex = new RegExp(
    `(?:^|\\n)(?=(?:PART\\s*${numToken}\\s*[-–:]?\\s*(?:READING|LISTENING|WRITING|SPEAKING)?|READING\\s+PASSAGE\\s*${numToken}\\b|PASSAGE\\s*${numToken}\\b|LISTENING\\s+(?:SECTION|PART)\\s*${numToken}\\b|SECTION\\s*${numToken}\\b|WRITING\\s+TASK\\s*${numToken}\\b|SPEAKING\\s+PART\\s*${numToken}\\b)\\b)`,
    "gi"
  );

  const indices: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(cleanedText)) !== null) {
    const pos = match.index + (cleanedText[match.index] === "\n" ? 1 : 0);
    if (indices.length === 0 || pos - indices[indices.length - 1] > 350) {
      indices.push(pos);
    }
  }

  let parts: Array<{
    title: string;
    detectedSkill?: "READING" | "LISTENING" | "WRITING" | "SPEAKING";
    content: string;
  }> = [];

  if (indices.length <= 1) {
    parts = [
      {
        title: cleanedText.split("\n")[0]?.trim().slice(0, 100) || "Phần 1",
        detectedSkill: detectSkillFromText(cleanedText),
        content: cleanedText,
      },
    ];
  } else {
    for (let i = 0; i < indices.length; i++) {
      const start = indices[i];
      const end = i + 1 < indices.length ? indices[i + 1] : cleanedText.length;
      const chunk = cleanedText.slice(start, end).trim();
      if (chunk.length < 30) continue;

      const firstLine = chunk.split("\n")[0]?.trim() || `Phần ${parts.length + 1}`;
      parts.push({
        title: firstLine.slice(0, 100),
        detectedSkill: detectSkillFromText(chunk),
        content: chunk,
      });
    }
  }

  // Nếu một phần vẫn quá dài (> 14000 ký tự), tách theo đoạn văn an toàn
  const finalParts: typeof parts = [];
  for (const part of parts) {
    if (part.content.length <= 14000) {
      finalParts.push(part);
    } else {
      const mid = Math.floor(part.content.length / 2);
      const breakIdx = part.content.indexOf("\n\n", mid);
      if (breakIdx !== -1 && breakIdx < part.content.length - 200) {
        finalParts.push({
          title: `${part.title} (Phần A)`,
          detectedSkill: part.detectedSkill,
          content: part.content.slice(0, breakIdx).trim(),
        });
        finalParts.push({
          title: `${part.title} (Phần B)`,
          detectedSkill: part.detectedSkill,
          content: part.content.slice(breakIdx).trim(),
        });
      } else {
        finalParts.push(part);
      }
    }
  }

  return finalParts.length > 0
    ? finalParts
    : [{ title: "Phần 1", detectedSkill: detectSkillFromText(cleanedText), content: cleanedText }];
}

function detectSkillFromText(
  text: string
): "READING" | "LISTENING" | "WRITING" | "SPEAKING" | undefined {
  const upper = text.toUpperCase();
  const head = upper.slice(0, 1500);

  // 1. Kiểm tra tiêu đề tường minh (Explicit Headers) - Bắt trúng Part1-Reading Passage 1
  if (
    /READING\s+PASSAGE|PASSAGE\s+\d+|PART\s*\d*[\s\-–:]*READING|READING\s+TEST/i.test(head) ||
    /TRUE\s*,\s*FALSE\s*,\s*NOT\s+GIVEN|YES\s*,\s*NO\s*,\s*NOT\s+GIVEN/i.test(head)
  ) {
    return "READING";
  }

  if (
    /LISTENING\s+(?:SECTION|PART)|SECTION\s+\d+\s+QUESTIONS|AUDIO\s+TRACK|RECORDING\s+\d+/i.test(head) ||
    /PLAY\s+AUDIO|LISTEN\s+TO\s+(?:THE\s+)?CONVERSATION/i.test(head)
  ) {
    return "LISTENING";
  }

  if (/WRITING\s+TASK\s+[12]|TASK\s+[12]\s*:\s*WRITE/i.test(head)) {
    return "WRITING";
  }

  if (/SPEAKING\s+PART\s+[123]|CUE\s+CARD/i.test(head)) {
    return "SPEAKING";
  }

  // 2. Nếu không có tiêu đề rõ ràng, tính điểm trọng số đặc trưng trên văn bản
  const readingScore =
    (upper.match(/\bPASSAGE\b/g)?.length || 0) * 3 +
    (upper.match(/\bREADING\b/g)?.length || 0) * 2 +
    (upper.match(/\bPARAGRAPH\b/g)?.length || 0) * 2 +
    (upper.match(/TRUE|FALSE|NOT GIVEN/g)?.length || 0);

  const listeningScore =
    (upper.match(/\bSECTION\b/g)?.length || 0) * 3 +
    (upper.match(/\bLISTENING\b/g)?.length || 0) * 2 +
    (upper.match(/\bAUDIO|RECORDING|TRACK\b/g)?.length || 0) * 3;

  const writingScore =
    (upper.match(/WRITING\s+TASK/g)?.length || 0) * 4 +
    (upper.match(/WRITE\s+AT\s+LEAST/g)?.length || 0) * 3;

  const speakingScore =
    (upper.match(/SPEAKING\s+PART/g)?.length || 0) * 4 +
    (upper.match(/CUE\s+CARD/g)?.length || 0) * 3;

  const maxScore = Math.max(readingScore, listeningScore, writingScore, speakingScore);
  if (maxScore > 0) {
    if (maxScore === readingScore) return "READING";
    if (maxScore === listeningScore) return "LISTENING";
    if (maxScore === writingScore) return "WRITING";
    if (maxScore === speakingScore) return "SPEAKING";
  }

  return undefined;
}
