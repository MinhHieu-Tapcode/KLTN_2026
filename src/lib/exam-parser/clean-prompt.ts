/**
 * Bộ tiền xử lý và chuẩn hóa prompt câu hỏi thi IELTS
 * Khử sạch các số thứ tự câu hỏi thừa bị kẹp cạnh chỗ trống điền từ hoặc ở đầu dòng
 */

/**
 * Xóa số thứ tự câu hỏi thừa bị in liền kề chỗ trống điền từ hoặc đầu câu
 * Ví dụ:
 *  - "want 23 _______ payback" (qNum=23) => "want _______ payback"
 *  - "- can cause lack of 22 _______" (qNum=22) => "- can cause lack of _______"
 *  - "20 _______ set of words" (qNum=20) => "_______ set of words"
 *  - "(9) ..........." (qNum=9) => "_______"
 *  - "Red wines use (5) ........... in fermentation." (qNum=5) => "Red wines use _______ in fermentation."
 */
export function cleanPromptRedundantNumbers(
  rawPrompt: string,
  qNum?: number | string
): string {
  if (!rawPrompt) return "";

  let cleaned = rawPrompt;

  // 1. Chuẩn hóa tất cả chuỗi dấu chấm lửng liên tiếp (từ 3 dấu trở lên) thành gạch dưới _______
  cleaned = cleaned.replace(/\.{3,}/g, "_______");

  // 2. Nếu biết chính xác questionNumber
  if (qNum !== undefined && qNum !== null) {
    const numStr = String(qNum).trim();
    if (numStr) {
      // a. Xóa số câu kèm ngoặc đứng sát chỗ trống: (23) _______ hoặc _______ (23)
      cleaned = cleaned.replace(
        new RegExp(`\\(\\s*${numStr}\\s*\\)\\s*_{2,}`, "gi"),
        "_______"
      );
      cleaned = cleaned.replace(
        new RegExp(`_{2,}\\s*\\(\\s*${numStr}\\s*\\)`, "gi"),
        "_______"
      );

      // b. Xóa số câu kèm ngoặc vuông: [23] _______ hoặc _______ [23]
      cleaned = cleaned.replace(
        new RegExp(`\\[\\s*${numStr}\\s*\\]\\s*_{2,}`, "gi"),
        "_______"
      );
      cleaned = cleaned.replace(
        new RegExp(`_{2,}\\s*\\[\\s*${numStr}\\s*\\]`, "gi"),
        "_______"
      );

      // c. Xóa số câu đứng rời sát chỗ trống: "23 _______" hoặc "_______ 23"
      cleaned = cleaned.replace(
        new RegExp(`\\b${numStr}\\b\\s*_{2,}`, "gi"),
        "_______"
      );
      cleaned = cleaned.replace(
        new RegExp(`_{2,}\\s*\\b${numStr}\\b`, "gi"),
        "_______"
      );

      // d. Xóa số câu ở đầu dòng: "23. ", "23) ", "Question 23: ", "Câu 23: "
      cleaned = cleaned.replace(
        new RegExp(`^\\s*(?:question|câu)?\\s*${numStr}[\\.\\:\\)\\-\\s]+`, "i"),
        ""
      );

      // e. Xóa số câu đứng đơn độc trong ngoặc ở cuối câu: "something (23)"
      cleaned = cleaned.replace(
        new RegExp(`\\s*[\\(\\[]${numStr}[\\)\\]]\\s*$`, "i"),
        ""
      );
    }
  }

  // 3. Khử tổng quát cho trường hợp số thứ tự bất kỳ đứng dính sát chỗ trống điền từ (kể cả khi không có qNum)
  // Ví dụ: "want (5) _______" hoặc "use 5 _______"
  cleaned = cleaned.replace(/\(\s*\d{1,3}\s*\)\s*_{2,}/g, "_______");
  cleaned = cleaned.replace(/_{2,}\s*\(\s*\d{1,3}\s*\)/g, "_______");
  cleaned = cleaned.replace(/\[\s*\d{1,3}\s*\]\s*_{2,}/g, "_______");
  cleaned = cleaned.replace(/_{2,}\s*\[\s*\d{1,3}\s*\]/g, "_______");
  cleaned = cleaned.replace(/\b\d{1,3}\b\s*_{2,}/g, "_______");
  cleaned = cleaned.replace(/_{2,}\s*\b\d{1,3}\b/g, "_______");

  // 4. Chuẩn hóa chiều dài chỗ trống thành đồng nhất 7 ký tự _______
  cleaned = cleaned.replace(/_{2,}/g, "_______");

  // 5. Dọn dẹp khoảng trắng kép và trim
  cleaned = cleaned.replace(/[ \t]+/g, " ").trim();

  // 6. Nếu dòng bắt đầu bằng dấu gạch ngang bị lẻ (ví dụ "- - can cause") -> gộp lại
  cleaned = cleaned.replace(/^[\-\–\—]\s*[\-\–\—]\s*/, "- ");

  return cleaned;
}
