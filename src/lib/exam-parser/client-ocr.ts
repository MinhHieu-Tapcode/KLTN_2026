"use client";

// Ưu tiên nạp từ vendor cục bộ trong public/vendor/ để chạy offline/mạng nội bộ không sợ chết CDN
const LOCAL_PDFJS = "/vendor/pdfjs/pdf.min.js";
const LOCAL_PDFJS_WORKER = "/vendor/pdfjs/pdf.worker.min.js";
const LOCAL_TESSERACT = "/vendor/tesseract/tesseract.min.js";

// Dự phòng CDN nếu môi trường không phục vụ được file tĩnh cục bộ
const CDN_PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const CDN_PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const CDN_TESSERACT = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

function loadScriptOnce(src: string, globalKey: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Chỉ chạy trên trình duyệt"));
      return;
    }
    if ((window as any)[globalKey]) {
      resolve((window as any)[globalKey]);
      return;
    }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any)[globalKey]));
      existing.addEventListener("error", () =>
        reject(new Error(`Không thể tải thư viện từ ${src}`))
      );
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve((window as any)[globalKey]);
    script.onerror = () => reject(new Error(`Không thể tải thư viện từ ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Nạp thư viện với cơ chế Fallback: Thử tải local trước, nếu lỗi tự động tải từ CDN
 */
async function loadScriptWithFallback(
  primarySrc: string,
  fallbackSrc: string,
  globalKey: string
): Promise<any> {
  if (typeof window !== "undefined" && (window as any)[globalKey]) {
    return (window as any)[globalKey];
  }
  try {
    return await loadScriptOnce(primarySrc, globalKey);
  } catch (err) {
    console.warn(
      `[ClientOCR] Không thể nạp script cục bộ từ ${primarySrc}. Đang chuyển sang CDN: ${fallbackSrc}...`
    );
    return await loadScriptOnce(fallbackSrc, globalKey);
  }
}

/**
 * Quét OCR trực tiếp cho file PDF Scan (không có lớp văn bản) trên trình duyệt:
 * Render từng trang PDF ra Canvas -> nhận diện chữ bằng Tesseract OCR
 */
export async function extractTextFromScannedPdfClient(
  file: File,
  onProgress?: (statusText: string) => void
): Promise<string> {
  onProgress?.("Đang khởi tạo công cụ đọc PDF Scan & AI OCR...");

  const [pdfjsLib, Tesseract] = await Promise.all([
    loadScriptWithFallback(LOCAL_PDFJS, CDN_PDFJS, "pdfjsLib"),
    loadScriptWithFallback(LOCAL_TESSERACT, CDN_TESSERACT, "Tesseract"),
  ]);

  // Cấu hình đường dẫn worker cho pdfjs (ưu tiên local, fallback cdn)
  pdfjsLib.GlobalWorkerOptions.workerSrc = LOCAL_PDFJS_WORKER;

  const arrayBuffer = await file.arrayBuffer();
  let pdf: any;
  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    pdf = await loadingTask.promise;
  } catch (pdfErr) {
    // Nếu nạp worker local lỗi, thử gán lại sang worker CDN
    console.warn("[ClientOCR] Worker local gặp sự cố, chuyển sang CDN Worker...");
    pdfjsLib.GlobalWorkerOptions.workerSrc = CDN_PDFJS_WORKER;
    const fallbackTask = pdfjsLib.getDocument({ data: arrayBuffer });
    pdf = await fallbackTask.promise;
  }

  const maxPages = Math.min(pdf.numPages || 1, 20);
  const pageTexts: string[] = [];

  const worker = await Tesseract.createWorker("eng");

  try {
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      onProgress?.(
        `Đang quét OCR trang ${pageNum}/${maxPages} từ tệp PDF Scan...`
      );
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;

      const {
        data: { text },
      } = await worker.recognize(canvas);

      if (text && text.trim()) {
        pageTexts.push(text.trim());
      }
    }
  } finally {
    await worker.terminate();
  }

  const combined = pageTexts.join("\n\n").trim();
  if (combined.length < 20) {
    throw new Error(
      "Không nhận diện được chữ rõ ràng từ tệp PDF Scan này. Vui lòng kiểm tra độ nét của ảnh trong tệp!"
    );
  }

  return combined;
}
