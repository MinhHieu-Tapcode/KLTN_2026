/**
 * Ghép danh sách cảnh báo ràng buộc (do server trả về khi xóa) thành đoạn chữ hiển thị
 * trong hộp thoại xác nhận. Mỗi cảnh báo nằm trên một dòng.
 */
export function formatDeleteWarnings(warnings?: string[]): string {
  const lines = (warnings && warnings.length > 0 ? warnings : ["Đối tượng này còn dữ liệu liên quan."])
    .map((w) => `• ${w}`)
    .join("\n");
  return `${lines}\n\nBạn có xác nhận vẫn xóa không?`;
}
