/**
 * Quản lý Pool API Key của Groq Cloud
 * Hỗ trợ xoay vòng Round-Robin và tự động chuyển đổi Fallback khi chạm giới hạn Rate Limit (HTTP 429)
 */

let currentKeyIndex = 0;

/**
 * Lấy danh sách toàn bộ các Groq API Keys hợp lệ từ biến môi trường
 */
export function getGroqKeyPool(): string[] {
  const keys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ]
    .map((k) => (k || "").trim())
    .filter((k) => k.length > 10 && !k.includes("xxxx"));

  return keys;
}

/**
 * Lấy API Key tiếp theo theo cơ chế xoay vòng (Round-Robin)
 */
export function getNextGroqApiKey(): string {
  const pool = getGroqKeyPool();
  if (pool.length === 0) {
    return (process.env.GROQ_API_KEY || "").trim();
  }
  const key = pool[currentKeyIndex % pool.length];
  currentKeyIndex = (currentKeyIndex + 1) % pool.length;
  return key;
}

/**
 * Thực thi một tác vụ gọi Groq với cơ chế tự động Failover qua các keys trong pool
 * Nếu một key bị Rate Limit (429), lỗi xác thực (401/403) hoặc lỗi kết nối,
 * hàm sẽ tự động thử sang key tiếp theo trong pool trước khi báo lỗi.
 */
export async function executeWithGroqKeyPool<T>(
  operation: (apiKey: string, keyIdx: number) => Promise<T>,
  preferredKeyIdx?: number
): Promise<T> {
  const pool = getGroqKeyPool();

  if (pool.length === 0) {
    throw new Error(
      "Chưa cấu hình GROQ_API_KEY trong hệ thống! Vui lòng kiểm tra file cấu hình môi trường (.env)."
    );
  }

  const startIndex =
    typeof preferredKeyIdx === "number" && preferredKeyIdx >= 0
      ? preferredKeyIdx % pool.length
      : currentKeyIndex % pool.length;

  let lastError: any = null;

  for (let attempt = 0; attempt < pool.length; attempt++) {
    const activeIdx = (startIndex + attempt) % pool.length;
    const apiKey = pool[activeIdx];
    const maskedKey = `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}`;

    try {
      const result = await operation(apiKey, activeIdx);
      // Cập nhật lại chỉ số key hiện tại cho lần sau
      currentKeyIndex = (activeIdx + 1) % pool.length;
      return result;
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || err || "");
      const isRateLimited =
        errMsg.includes("429") ||
        errMsg.toLowerCase().includes("rate limit") ||
        errMsg.toLowerCase().includes("tokens per minute");
      const isKeyInvalid =
        errMsg.includes("401") ||
        errMsg.includes("403") ||
        errMsg.toLowerCase().includes("invalid_api_key");

      console.warn(
        `[GroqKeyPool] Key [${activeIdx + 1}/${pool.length}] (${maskedKey}) gặp sự cố: ${errMsg}. ` +
          (attempt < pool.length - 1 ? "Đang tự động chuyển sang Key tiếp theo..." : "Đã thử hết toàn bộ Keys.")
      );

      // Nếu còn key khác và gặp lỗi do rate limit hoặc key hỏng, tiếp tục vòng lặp
      if (attempt < pool.length - 1 && (isRateLimited || isKeyInvalid || errMsg.includes("fetch failed"))) {
        // Nghỉ nhẹ 300ms trước khi đổi key
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }

      // Nếu là lỗi khác mà không phải do network/quota, ném lỗi luôn nếu không muốn thử vô ích
      if (!isRateLimited && !isKeyInvalid && attempt < pool.length - 1) {
        continue;
      }
    }
  }

  throw lastError || new Error("Không thể thực hiện yêu cầu qua Groq Key Pool");
}
