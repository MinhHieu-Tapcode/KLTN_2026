/**
 * Cắt NGUYÊN VĂN bài đọc từ lớp chữ PDF theo mốc Claude trả (8 từ đầu, 8 từ cuối).
 * Claude không chép lại bài đọc nên không thể làm sai/mất chữ; server chỉ cần tìm đúng mốc.
 */

interface NormalizedText {
  norm: string;
  // vị trí ký tự trong `norm` -> vị trí trong văn bản gốc
  map: number[];
}

/** Chuẩn hoá để so khớp: ngoặc cong -> thẳng, gạch nối dài -> "-", gộp khoảng trắng, chữ thường */
function normalizeWithMap(text: string): NormalizedText {
  let norm = "";
  const map: number[] = [];
  let lastWasSpace = true;
  for (let i = 0; i < text.length; i++) {
    let ch = text[i];
    if (/[‘’ʼ`]/.test(ch)) ch = "'";
    else if (/[“”]/.test(ch)) ch = '"';
    else if (/[–—]/.test(ch)) ch = "-";
    if (/\s/.test(ch)) {
      if (lastWasSpace) continue;
      ch = " ";
      lastWasSpace = true;
    } else {
      lastWasSpace = false;
    }
    norm += ch.toLowerCase();
    map.push(i);
  }
  return { norm, map };
}

function normalizePhrase(phrase: string): string {
  return normalizeWithMap(phrase).norm.trim();
}

/** Thử cụm đầy đủ, rồi rút dần còn 5 và 4 từ (mốc dài dễ lệch một ký tự hơn) */
function phraseCandidates(phrase: string, fromStart: boolean): string[] {
  const words = normalizePhrase(phrase).split(" ").filter(Boolean);
  const out: string[] = [];
  for (const n of [words.length, 5, 4]) {
    if (n <= 0 || n > words.length) continue;
    const slice = fromStart ? words.slice(0, n) : words.slice(words.length - n);
    const candidate = slice.join(" ");
    if (candidate.length >= 12 && !out.includes(candidate)) out.push(candidate);
  }
  return out;
}

export interface CutPassageResult {
  text: string;
  method: "markers" | "fallback";
}

/**
 * @param fullText văn bản đề đã dọn (cleanAndReflowPages)
 * @param fallbackText văn bản các trang chứa bài đọc, dùng khi không tìm thấy mốc
 */
export function cutPassageByMarkers(
  fullText: string,
  firstWords: string,
  lastWords: string,
  fallbackText: string,
  searchFrom = 0
): CutPassageResult & { endIndex: number } {
  const { norm, map } = normalizeWithMap(fullText);
  const normFrom = map.findIndex((orig) => orig >= searchFrom);
  const from = normFrom < 0 ? 0 : normFrom;

  for (const start of phraseCandidates(firstWords, true)) {
    const startIdx = norm.indexOf(start, from);
    if (startIdx < 0) continue;
    for (const end of phraseCandidates(lastWords, false)) {
      const endIdx = norm.indexOf(end, startIdx + start.length);
      if (endIdx < 0) continue;
      const origStart = map[startIdx];
      const origEnd = map[endIdx + end.length - 1] + 1;
      return { text: fullText.slice(origStart, origEnd).trim(), method: "markers", endIndex: origEnd };
    }
  }
  return { text: fallbackText.trim(), method: "fallback", endIndex: searchFrom };
}
