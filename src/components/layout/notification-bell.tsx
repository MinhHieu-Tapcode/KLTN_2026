"use client";

import React, { useEffect, useState, useTransition, useRef } from "react";
import {
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Loader2,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  getMyNotificationsAction,
  markNotificationsReadAction,
  countUnreadNotificationsAction,
} from "@/actions/notifications";

export function NotificationBell({
  isOpen: controlledOpen,
  onOpenChange,
}: {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpenState, setIsOpenState] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isPopoverOpen = controlledOpen !== undefined ? controlledOpen : isOpenState;

  const setOpen = (open: boolean) => {
    if (controlledOpen === undefined) {
      setIsOpenState(open);
    }
    onOpenChange?.(open);
  };

  // Đóng popover khi click bên ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (isPopoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isPopoverOpen]);

  // Polling đếm số chưa đọc mỗi 45 giây và khi mở trang
  const fetchUnreadCount = async () => {
    try {
      const res = await countUnreadNotificationsAction();
      setUnreadCount(res.count || 0);
    } catch {
      // bỏ qua lỗi im lặng
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 45000);
    return () => clearInterval(interval);
  }, []);

  // Tải danh sách khi popover mở
  const loadNotifications = () => {
    setLoading(true);
    startTransition(async () => {
      const res = await getMyNotificationsAction(30);
      if (res.success && res.notifications) {
        setNotifications(res.notifications);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    if (isPopoverOpen) {
      loadNotifications();
    }
  }, [isPopoverOpen]);

  // Toggle mở / đóng
  const handleToggleOpen = () => {
    const nextState = !isPopoverOpen;
    setOpen(nextState);
  };

  // Đánh dấu 1 thông báo là đã đọc
  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await markNotificationsReadAction([id]);
  };

  // Đánh dấu tất cả đã đọc
  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await markNotificationsReadAction();
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "ASSIGNMENT_ASSIGNED":
        return <FileText className="size-4 text-[#EA580C]" />;
      case "SUBMISSION_RECEIVED":
        return <FileCheck className="size-4 text-blue-600" />;
      case "SUBMISSION_GRADED":
        return <CheckCircle2 className="size-4 text-emerald-600" />;
      case "OUT_TAB_ALERT":
        return <ShieldAlert className="size-4 text-rose-600" />;
      case "MATERIAL_ADDED":
        return <BookOpen className="size-4 text-amber-600" />;
      default:
        return <Sparkles className="size-4 text-slate-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggleOpen}
        title="Thông báo hoạt động học tập"
        className="relative size-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 grid place-items-center text-slate-600 hover:text-slate-900 transition shadow-2xs cursor-pointer"
      >
        <Bell className="size-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 min-w-[18px] h-[18px] rounded-full bg-[#EA580C] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white animate-pulse shadow-xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isPopoverOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-[#EA580C]" />
              <h4 className="text-xs font-bold text-slate-900">Thông báo hoạt động</h4>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-[#EA580C]">
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-semibold text-[#EA580C] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Check className="size-3" /> Đọc tất cả
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 text-xs">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="size-5 animate-spin text-[#EA580C]" />
                <span className="text-[11px]">Đang tải thông báo...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Bell className="size-8 mx-auto text-slate-200 mb-2 stroke-[1.5]" />
                <p className="font-medium text-slate-600">Chưa có thông báo nào!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Các hoạt động giao bài, nộp bài và chấm điểm sẽ xuất hiện tại đây.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                  className={`p-3.5 transition flex items-start gap-3 cursor-pointer ${
                    n.isRead
                      ? "bg-white hover:bg-slate-50/70 opacity-80"
                      : "bg-orange-50/30 hover:bg-orange-50/60 font-medium"
                  }`}
                >
                  <div className="size-8 rounded-xl bg-slate-100 grid place-items-center shrink-0 mt-0.5">
                    {getNotifIcon(n.type)}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${!n.isRead ? "font-bold text-slate-900" : "text-slate-700"}`}>
                        {n.title}
                      </span>
                      {!n.isRead && (
                        <span className="size-2 rounded-full bg-[#EA580C] shrink-0" />
                      )}
                    </div>
                    {n.message && (
                      <p className="text-[11.5px] text-slate-600 leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                    )}
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 pt-1">
                      <Clock className="size-2.5" />
                      {new Date(n.createdAt).toLocaleDateString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
