"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  CircleCheck,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  loginAction,
  requestPasswordResetOtpAction,
  resetPasswordWithOtpAction,
} from "@/actions/auth";
import { ActivateView } from "@/components/auth/activate-view";
import { SimpaceLogo } from "@/components/logo";

type LoginPhase = "INTRO" | "TRANSITION" | "LOGIN";

interface SampleAccount {
  role: "ADMIN" | "SCHOOL_MANAGER" | "TEACHER" | "STUDENT";
  roleLabel: string;
  name: string;
  identifier: string;
  password: string;
  badgeClass: string;
}

const SAMPLE_ACCOUNTS: SampleAccount[] = [
  {
    role: "ADMIN",
    roleLabel: "Quản trị viên",
    name: "Admin Hệ thống",
    identifier: "admin@simpace.vn",
    password: "simpace2026",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  },
  {
    role: "SCHOOL_MANAGER",
    roleLabel: "Quản nhiệm",
    name: "ThS. Hoàng Văn Quản",
    identifier: "manager@simpace.vn",
    password: "simpace2026",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    role: "TEACHER",
    roleLabel: "Giáo viên",
    name: "Cô Nguyễn Thu Hường",
    identifier: "teacher@simpace.vn",
    password: "simpace2026",
    badgeClass: "bg-orange-50 text-[#EA580C] border-orange-200",
  },
  {
    role: "STUDENT",
    roleLabel: "Học viên",
    name: "Nguyễn Văn An",
    identifier: "student@simpace.vn",
    password: "simpace2026",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
  },
];

/**
 * Hiệu ứng Canvas sóng nước hồ tương tác theo chuột (Interactive Lake Water Ripples)
 * Khi rê chuột hover qua vùng nền quanh form, các vòng sóng nước lan tỏa tự nhiên.
 */
function WaterRippleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    interface Ripple {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      speed: number;
      alpha: number;
      color: string;
      width: number;
    }

    const ripples: Ripple[] = [];
    const colors = [
      "rgba(234, 88, 12, ",   // Cam SIMPACE (#EA580C)
      "rgba(251, 146, 60, ",  // Cam pastel (#FBA73C)
      "rgba(56, 189, 248, ",  // Xanh hồ nước biếc (#38BDF8)
      "rgba(14, 165, 233, ",  // Xanh dương sâu (#0EA5E9)
      "rgba(254, 215, 170, ", // Kem ấm nắng (#FED7AA)
    ];

    let lastTime = 0;
    const addRipple = (x: number, y: number, isStrong = false) => {
      const now = Date.now();
      if (now - lastTime < 35 && !isStrong) return;
      lastTime = now;

      const color = colors[Math.floor(Math.random() * colors.length)];
      ripples.push({
        x,
        y,
        radius: isStrong ? 8 : 4,
        maxRadius: isStrong ? Math.max(width, height) * 0.35 : Math.random() * 140 + 90,
        speed: isStrong ? 2.4 : 1.7,
        alpha: isStrong ? 0.45 : 0.28,
        color,
        width: isStrong ? 2.2 : 1.4,
      });
    };

    const ambientTimer = setInterval(() => {
      if (ripples.length < 4) {
        addRipple(Math.random() * width, Math.random() * height, false);
      }
    }, 1800);

    const onPointerMove = (e: MouseEvent) => {
      addRipple(e.clientX, e.clientY, false);
    };

    const onPointerDown = (e: MouseEvent) => {
      addRipple(e.clientX, e.clientY, true);
    };

    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mousedown", onPointerDown);

    let waveTick = 0;

    const render = () => {
      waveTick += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Sóng nước uốn lượn dưới đáy (Harmonic Water Undulation)
      ctx.save();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const baseHeight = height * (0.35 + i * 0.22);
        ctx.moveTo(0, baseHeight);
        for (let x = 0; x <= width; x += 25) {
          const y =
            baseHeight +
            Math.sin(x * 0.0035 + waveTick + i) * 18 +
            Math.cos(x * 0.007 - waveTick * 0.7) * 10;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, baseHeight - 40, width, height);
        grad.addColorStop(0, `rgba(254, 243, 199, ${0.07 - i * 0.015})`);
        grad.addColorStop(0.5, `rgba(224, 242, 254, ${0.11 - i * 0.025})`);
        grad.addColorStop(1, `rgba(255, 237, 213, 0.04)`);
        ctx.fillStyle = grad;
        ctx.fill();
      }
      ctx.restore();

      // Vòng tròn sóng nước lan tỏa tương tác theo chuột (Ripples)
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed;
        r.alpha *= 0.978;

        if (r.alpha <= 0.008 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `${r.color}${r.alpha.toFixed(3)})`;
        ctx.lineWidth = r.width;
        ctx.stroke();

        if (r.radius > 16) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius * 0.65, 0, Math.PI * 2);
          ctx.strokeStyle = `${r.color}${(r.alpha * 0.4).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(ambientTimer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-85"
    />
  );
}

export function LoginView({ onLoggedIn }: { onLoggedIn: (user: any) => void }) {
  // Giai đoạn mở đầu: Khôi phục Intro Orbit -> Transition -> Login [C1]
  const [phase, setPhase] = useState<LoginPhase>("INTRO");
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("admin@simpace.vn");
  const [password, setPassword] = useState("simpace2026");
  const [selectedRole, setSelectedRole] = useState<"ADMIN" | "SCHOOL_MANAGER" | "TEACHER" | "STUDENT">("ADMIN");
  // Nút con mắt bật/tắt hiển thị mật khẩu của các tài khoản mẫu [C2]
  const [showSamplePassword, setShowSamplePassword] = useState<boolean>(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [activationData, setActivationData] = useState<any>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  // Nút con mắt bật/tắt hiển thị tài khoản mẫu để phục vụ quay video demo [C1, C2]
  const [showSampleAccounts, setShowSampleAccounts] = useState<boolean>(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("simpace_show_sample_accounts");
      if (saved !== null) {
        const isVisible = saved === "true";
        setShowSampleAccounts(isVisible);
        if (!isVisible) {
          setIdentifier("");
          setPassword("");
        }
      }
    } catch {}
  }, []);

  const toggleShowSampleAccounts = () => {
    setShowSampleAccounts((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("simpace_show_sample_accounts", String(next));
      } catch {}
      if (!next) {
        // Chế độ quay video: làm sạch form để không lộ tài khoản test
        setIdentifier("");
        setPassword("");
      } else {
        // Chế độ kiểm thử: điền sẵn tài khoản admin
        setIdentifier("admin@simpace.vn");
        setPassword("simpace2026");
      }
      return next;
    });
  };

  // Hiệu ứng tự động chuyển từ INTRO (1.5s) -> TRANSITION (1.0s) -> LOGIN
  useEffect(() => {
    if (phase === "INTRO") {
      const timer1 = setTimeout(() => {
        setPhase("TRANSITION");
      }, 1500);
      return () => clearTimeout(timer1);
    }
    if (phase === "TRANSITION") {
      const timer2 = setTimeout(() => {
        setPhase("LOGIN");
      }, 1000);
      return () => clearTimeout(timer2);
    }
  }, [phase]);

  // Hỗ trợ người dùng nhấn phím bất kỳ hoặc click để Bỏ qua Intro ngay
  const handleSkipIntro = () => {
    setPhase("LOGIN");
  };

  // Chọn tài khoản mẫu: CHỈ điền sẵn Email & Mật khẩu vào form, KHÔNG tự động đăng nhập [C1]
  const handleSelectSample = (acc: SampleAccount) => {
    setSelectedRole(acc.role);
    setIdentifier(acc.identifier);
    setPassword(acc.password);
    setErrorMsg("");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await loginAction(formData);
      if (!result.success) {
        setErrorMsg(result.error || "Đăng nhập thất bại!");
        setPassword("");
        passwordInputRef.current?.focus();
        return;
      }

      if (result.mustChangePassword) {
        setActivationData(result);
      } else {
        onLoggedIn(result.user || { fullName: "Quản trị viên", role: result.role });
      }
    });
  };

  if (activationData) {
    return (
      <ActivateView
        userId={activationData.userId}
        fullName={activationData.fullName}
        email={activationData.email}
        role={activationData.role}
        onComplete={(user) => {
          onLoggedIn(
            user || {
              fullName: activationData.fullName,
              role: activationData.role || "STUDENT",
            }
          );
        }}
        onCancel={() => setActivationData(null)}
      />
    );
  }

  // =========================================================================
  // GIAI ĐOẠN 1 & 2: MÀN HÌNH INTRO & HIỆU ỨNG THU NHỎ ORBIT [C1]
  // =========================================================================
  if (phase === "INTRO" || phase === "TRANSITION") {
    return (
      <div
        onClick={handleSkipIntro}
        className="simpace-fade-enter fixed inset-0 z-50 flex flex-col justify-between bg-[#FDFBF7] p-8 sm:p-12 cursor-pointer select-none"
      >
        {/* Nút bấm nhỏ góc trên cho phép Bỏ qua Intro */}
        <div className="flex items-center justify-between">
          <SimpaceLogo className="h-10 w-auto object-contain" />
          <button
            onClick={handleSkipIntro}
            className="rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-xs font-semibold text-slate-600 shadow-xs hover:border-[#EA580C] hover:text-[#EA580C] transition"
          >
            Nhấn phím bất kỳ hoặc click để Bỏ qua &gt;
          </button>
        </div>

        {/* Khung trung tâm: Hiệu ứng thu nhỏ và vòng quỹ đạo Orbit */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center">
            {/* Vòng hào quang sáng phía sau */}
            <div className="absolute h-72 w-72 rounded-full bg-orange-100/60 blur-2xl" />

            {/* Vòng quỹ đạo hình elip với icon quay quanh */}
            <div
              className={`relative flex items-center justify-center ${
                phase === "TRANSITION" ? "simpace-orbit-shrink" : ""
              }`}
            >
              {/* Quỹ đạo nét đứt màu cam nhạt */}
              <div className="h-64 w-64 rounded-full border border-dashed border-orange-300/60 sm:h-80 sm:w-80" />

              {/* Logo trung tâm lớn */}
              <div className="absolute flex flex-col items-center">
                <SimpaceLogo className="h-16 w-auto object-contain sm:h-20 drop-shadow-md" />
              </div>

              {/* Điểm nhấn hành tinh nhỏ quay trên quỹ đạo */}
              <div className="simpace-orbit-circle absolute h-64 w-64 sm:h-80 sm:w-80 flex items-start justify-center">
                <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-[#EA580C] to-amber-300 shadow-md shadow-orange-500/30 -mt-3" />
              </div>
              <div className="absolute -bottom-2 -left-2 h-4 w-4 rounded-full bg-orange-300/80 shadow-xs" />
            </div>
          </div>

          {/* Slogan thương hiệu SIMPACE */}
          {phase === "INTRO" && (
            <div className="mt-8 text-center animate-in fade-in-50 duration-700">
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                Hệ thống Quản lý Đào tạo Ngoại ngữ SIMPACE LMS
              </h2>
              <p className="mt-2 text-xs font-medium text-slate-500">
                Đồng hành cùng 17+ trường THPT đối tác · Chuẩn khảo thí Quốc tế IELTS
              </p>

              {/* Thanh tiến trình màu cam chạy đầy 100% */}
              <div className="mt-6 flex flex-col items-center gap-2">
                <div className="h-1 w-44 overflow-hidden rounded-full bg-slate-200/80">
                  <div className="simpace-progress-bar h-full rounded-full bg-[#EA580C]" />
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  Đang chuyển đến trang đăng nhập...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Trạng thái khởi tạo góc dưới bên trái */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <span className="text-[#EA580C] font-bold">|</span>
          <span>Đang khởi tạo hệ thống...</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // GIAI ĐOẠN 3: MÀN HÌNH ĐĂNG NHẬP VỚI NỀN SÓNG NƯỚC HỒ VÀ 4 NÚT TÀI KHOẢN
  // =========================================================================
  return (
    <div className="simpace-fade-enter relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#FEF9F5] via-[#EBF8FF]/50 to-[#FFF7ED] p-4 sm:p-6">
      {/* Hiệu ứng sóng nước tương tác theo chuột [C3] */}
      <WaterRippleCanvas />

      {/* Ánh sáng phản chiếu mặt nước */}
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-orange-200/25 blur-3xl" />
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-sky-200/30 blur-3xl" />

      {/* FLOATING LOGIN CARD MÀU TRẮNG TINH KHIẾT BO TRÒN - CĂN GIỮA TRUNG TÂM */}
      <div className="relative z-10 w-full max-w-[480px] rounded-[32px] border border-white/80 bg-white/95 p-7 sm:p-9 shadow-[0_25px_60px_-15px_rgba(234,88,12,0.12),0_10px_25px_-5px_rgba(0,0,0,0.06)] backdrop-blur-xl">
        {/* Header card: Logo căn giữa trung tâm */}
        <div className="flex flex-col items-center text-center">
          <SimpaceLogo className="h-11 w-auto mb-4 object-contain mx-auto" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Chào mừng trở lại!
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Đăng nhập để tiếp tục truy cập hệ thống LMS SIMPACE
          </p>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
            {errorMsg}
          </div>
        )}

        {/* Form đăng nhập */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email hoặc mã học viên
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 h-4 w-4 text-slate-400" strokeWidth={1.75} />
              <input
                name="identifier"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@simpace.vn"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-3.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#EA580C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mật khẩu
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 h-4 w-4 text-slate-400" strokeWidth={1.75} />
              <input
                ref={passwordInputRef}
                name="password"
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#EA580C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                aria-label="Hiện mật khẩu"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                ) : (
                  <Eye className="h-4 w-4" strokeWidth={1.75} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white py-2.5 text-xs font-bold shadow-md shadow-orange-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Đang đăng nhập...
              </>
            ) : (
              "Đăng nhập"
            )}
          </button>
        </form>

        {/* Quên mật khẩu */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            className="font-medium text-[#EA580C] hover:underline cursor-pointer"
          >
            Quên mật khẩu ?
          </button>
        </div>

        {/* Nút con mắt bật/tắt & Khối tài khoản mẫu [C1, C2, C3] */}
        {showSampleAccounts ? (
          <div className="mt-5 border-t border-slate-100 pt-3.5 animate-in fade-in-50 duration-300">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                CHỌN TÀI KHOẢN MẪU:
              </span>
              <div className="flex items-center gap-1.5">
                {/* Nút con mắt bật/tắt hiện mật khẩu tài khoản mẫu [C2] */}
                <button
                  type="button"
                  onClick={() => setShowSamplePassword(!showSamplePassword)}
                  title={showSamplePassword ? "Ẩn mật khẩu các tài khoản mẫu" : "Hiện mật khẩu các tài khoản mẫu"}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-200 bg-white text-[10.5px] font-semibold text-slate-600 hover:text-[#EA580C] hover:border-orange-300 hover:bg-orange-50/50 transition cursor-pointer shadow-2xs"
                >
                  {showSamplePassword ? (
                    <>
                      <EyeOff className="size-3.5 text-[#EA580C]" />
                      <span className="text-[#EA580C]">Ẩn MK</span>
                    </>
                  ) : (
                    <>
                      <Eye className="size-3.5 text-slate-500" />
                      <span>Hiện MK</span>
                    </>
                  )}
                </button>

                {/* Nút ẩn toàn bộ tài khoản mẫu khi quay video */}
                <button
                  type="button"
                  onClick={toggleShowSampleAccounts}
                  title="Ẩn toàn bộ tài khoản mẫu để quay video sạch sẽ"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-200 bg-white text-[10.5px] font-semibold text-slate-500 hover:text-[#EA580C] hover:border-orange-300 hover:bg-orange-50/50 transition cursor-pointer shadow-2xs"
                >
                  <span>Ẩn khung test</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {SAMPLE_ACCOUNTS.map((acc) => {
                const isSelected = selectedRole === acc.role;
                return (
                  <div
                    key={acc.role}
                    onClick={() => handleSelectSample(acc)}
                    className={`group relative flex flex-col justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#EA580C] bg-orange-50/80 shadow-xs ring-2 ring-[#EA580C]/30"
                        : "border-slate-200 bg-slate-50/70 hover:bg-white hover:border-[#EA580C]/50 hover:shadow-xs"
                    }`}
                    title="Bấm để tự điền thông tin vào form"
                  >
                    <div>
                      <div className="flex items-center justify-between w-full mb-1">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${acc.badgeClass}`}
                        >
                          {acc.roleLabel}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-[#EA580C] bg-orange-100/90 px-1.5 py-0.2 rounded-full">
                            Đã chọn
                          </span>
                        )}
                      </div>
                      <span className="block text-xs font-bold text-slate-900 group-hover:text-[#EA580C] transition truncate">
                        {acc.name}
                      </span>
                      <span className="block text-[10px] text-slate-500 font-mono truncate mt-0.5">
                        {acc.identifier}
                      </span>
                    </div>

                    {/* Dòng hiển thị mật khẩu có nút con mắt bật/tắt [C2] */}
                    <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10.5px]">
                      <span className="text-slate-400 font-medium">Mật khẩu:</span>
                      <span className="font-mono font-bold text-slate-700">
                        {showSamplePassword ? acc.password : "••••••••"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2.5 text-[10.5px] text-center text-slate-500">
              💡 Bấm chọn tài khoản mẫu để <b>tự điền form</b>, sau đó bạn bấm <b>Đăng nhập</b> để quay video.
            </p>
          </div>
        ) : (
          /* Chế độ quay video sạch sẽ: Footer chuyên nghiệp với icon con mắt nhỏ tinh tế để bật lại */
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-3 animate-in fade-in-50 duration-300">
            <span className="text-[11px] font-medium text-slate-400">
              Hệ thống SIMPACE LMS © 2026
            </span>
            <button
              type="button"
              onClick={toggleShowSampleAccounts}
              title="Hiện danh sách tài khoản mẫu để test"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-dashed border-slate-300 bg-slate-50 text-[10.5px] font-semibold text-slate-500 hover:border-[#EA580C] hover:text-[#EA580C] hover:bg-orange-50/50 transition cursor-pointer"
            >
              <EyeOff className="size-3.5 text-slate-400" />
              <span>Hiện tài khoản mẫu</span>
            </button>
          </div>
        )}
      </div>

      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
    </div>
  );
}

export function ForgotPasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPass, setNewPass] = useState("");
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    startTransition(async () => {
      const res = await requestPasswordResetOtpAction(email);
      if (!res.success) {
        setErr(res.error || "Lỗi gửi mã OTP!");
      } else {
        setStep(2);
        setMsg("Mã OTP đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư và nhập mã để đổi mật khẩu.");
      }
    });
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    startTransition(async () => {
      const res = await resetPasswordWithOtpAction(email, otp, newPass);
      if (!res.success) {
        setErr(res.error || "Không thể đặt lại mật khẩu!");
      } else {
        setStep(3);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <KeyRound className="h-5 w-5 text-[#EA580C]" strokeWidth={1.75} /> Khôi phục mật khẩu
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {step === 1
              ? "Nhập email của bạn để nhận mã OTP khôi phục tài khoản."
              : step === 2
              ? "Nhập mã OTP vừa nhận được và mật khẩu mới của bạn."
              : "Mật khẩu của bạn đã được cập nhật thành công."}
          </DialogDescription>
        </DialogHeader>

        {err && <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl border border-red-200">{err}</div>}
        {msg && <div className="p-3 text-xs bg-amber-50 text-amber-700 rounded-xl border border-amber-200">{msg}</div>}

        {step === 3 ? (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CircleCheck className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Đặt lại mật khẩu thành công!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có thể sử dụng mật khẩu mới để đăng nhập ngay bây giờ.
              </p>
            </div>
            <Button
              onClick={() => {
                onOpenChange(false);
                setStep(1);
              }}
              className="w-full bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-bold"
            >
              Quay lại đăng nhập
            </Button>
          </div>
        ) : step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-3.5 mt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Địa chỉ Email
              </label>
              <input
                type="email"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#EA580C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 transition-all"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl text-xs">
                Hủy
              </Button>
              <Button type="submit" disabled={isPending} className="bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-bold">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null} Gửi mã OTP
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-3.5 mt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mã xác thực OTP (6 chữ số)
              </label>
              <input
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#EA580C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 transition-all"
                placeholder="Nhập mã OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mật khẩu mới
              </label>
              <input
                type="password"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#EA580C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 transition-all"
                placeholder="Tối thiểu 6 ký tự"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="rounded-xl text-xs">
                Quay lại
              </Button>
              <Button type="submit" disabled={isPending} className="bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-bold">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null} Xác nhận đổi
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
