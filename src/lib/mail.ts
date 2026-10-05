import nodemailer from "nodemailer";

// Khởi tạo Transporter gửi email
function getTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Gửi email thông báo cấp tài khoản mới
 */
export async function sendAccountCreatedEmail(params: {
  to: string;
  fullName: string;
  username: string;
  tempPassword: string;
  roleName: string;
}) {
  const transporter = getTransporter();

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #EA580C; padding: 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">SIMPACE LMS</h1>
        <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Hệ thống Quản lý Đào tạo Ngoại ngữ & Khảo thí</p>
      </div>

      <div style="padding: 28px 24px;">
        <h2 style="font-size: 18px; color: #0F172A; margin-top: 0;">Chào mừng bạn, ${params.fullName}!</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          Tài khoản của bạn đã được khởi tạo thành công trên hệ thống <b>SIMPACE LMS</b> với vai trò <b>${params.roleName}</b>.
        </p>

        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748B; width: 140px;">Tên đăng nhập / Mã:</td>
              <td style="padding: 6px 0; font-weight: bold; color: #0F172A; font-family: monospace;">${params.username}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Email đăng ký:</td>
              <td style="padding: 6px 0; font-weight: bold; color: #0F172A;">${params.to}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Mật khẩu tạm thời:</td>
              <td style="padding: 6px 0;">
                <span style="background-color: #FEF3C7; color: #92400E; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-family: monospace;">${params.tempPassword}</span>
              </td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; color: #64748B; font-style: italic; margin-bottom: 24px;">
          * Để bảo mật tài khoản, hệ thống sẽ yêu cầu bạn xác thực mã OTP và đổi mật khẩu mới trong lần đầu đăng nhập.
        </p>

        <div style="text-align: center;">
          <a href="http://localhost:3000" style="background-color: #EA580C; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">
            Đăng nhập SIMPACE LMS ngay
          </a>
        </div>
      </div>

      <div style="background-color: #F1F5F9; padding: 16px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #E2E8F0;">
        © 2026 SIMPACE Việt Nam. Email này được gửi tự động từ hệ thống LMS.
      </div>
    </div>
  `;

  if (!transporter) {
    console.log(`[MAIL SIMULATION] Gửi thông tin tài khoản đến: ${params.to}`);
    console.log(`[MAIL SIMULATION] Username: ${params.username} | Pass: ${params.tempPassword}`);
    return {
      sent: false,
      reason: "Chưa cấu hình SMTP_USER và SMTP_PASS trong file .env",
    };
  }

  try {
    await transporter.sendMail({
      from: `"SIMPACE LMS" <${process.env.SMTP_USER}>`,
      to: params.to,
      subject: `[SIMPACE LMS] Thông tin tài khoản đăng nhập của ${params.fullName}`,
      html: htmlContent,
    });
    console.log(`[MAIL SUCCESS] Đã gửi email thực tế đến: ${params.to}`);
    return { sent: true };
  } catch (error: any) {
    console.error("[MAIL ERROR] Lỗi gửi email:", error.message);
    return { sent: false, error: error.message };
  }
}

/**
 * Gửi email mã OTP (Kích hoạt tài khoản hoặc Quên mật khẩu)
 */
export async function sendOtpEmail(params: {
  to: string;
  fullName: string;
  otp: string;
  type?: "activation" | "reset";
}) {
  const transporter = getTransporter();
  const isActivation = params.type === "activation";
  const title = isActivation
    ? "Mã OTP Kích hoạt tài khoản"
    : "Mã OTP Đặt lại mật khẩu";

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #EA580C; padding: 20px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800;">SIMPACE LMS</h1>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Xác thực bảo mật tài khoản</p>
      </div>

      <div style="padding: 26px 22px; text-align: center;">
        <h2 style="font-size: 18px; color: #0F172A; margin-top: 0;">${title}</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.5;">
          Xin chào <b>${params.fullName}</b>, mã xác thực OTP của bạn bên dưới:
        </p>

        <div style="margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 800; font-family: monospace; letter-spacing: 8px; color: #EA580C; background-color: #FFF7ED; padding: 12px 24px; border: 2px dashed #EA580C; border-radius: 12px; display: inline-block;">
            ${params.otp}
          </span>
        </div>

        <p style="font-size: 13px; color: #64748B;">
          Mã xác thực có hiệu lực trong vòng <b>15 phút</b>. Vui lòng không chia sẻ mã này cho bất kỳ ai.
        </p>
      </div>

      <div style="background-color: #F8FAFC; padding: 14px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #E2E8F0;">
        © 2026 SIMPACE Việt Nam • Bảo mật hệ thống LMS
      </div>
    </div>
  `;

  if (!transporter) {
    console.log(`[OTP SIMULATION] Mã OTP gửi tới ${params.to}: ${params.otp}`);
    return {
      sent: false,
      reason: "Chưa cấu hình SMTP_USER và SMTP_PASS trong file .env",
    };
  }

  try {
    await transporter.sendMail({
      from: `"SIMPACE LMS" <${process.env.SMTP_USER}>`,
      to: params.to,
      subject: `[SIMPACE LMS] ${title} - ${params.otp}`,
      html: htmlContent,
    });
    console.log(`[OTP SUCCESS] Đã gửi OTP thực tế đến: ${params.to}`);
    return { sent: true };
  } catch (error: any) {
    console.error("[OTP ERROR] Lỗi gửi email OTP:", error.message);
    return { sent: false, error: error.message };
  }
}
