"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Bell,
  Check,
  CheckCheck,
  ChevronLeft,
  Clock3,
  RefreshCw,
  Wallet,
  BanknoteArrowDown,
  Package,
  CreditCard,
  AlertTriangle,
  Settings,
  XCircle,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [markingAll, setMarkingAll] =
    useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadNotifications() {
    try {
      setLoading(true);
      setError("");

      const token = await getToken();

      if (!token) {
        setError(
          "انتهت جلسة الدخول، يرجى تسجيل الدخول مرة أخرى."
        );
        return;
      }

      const response = await fetch(
        "/api/notifications",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error(
          "NOTIFICATIONS API ERROR:",
          result
        );

        setError(
          result.error ||
            "تعذر تحميل الإشعارات."
        );

        return;
      }

      setNotifications(
        Array.isArray(result.notifications)
          ? result.notifications
          : []
      );
    } catch (error) {
      console.error(
        "LOAD NOTIFICATIONS ERROR:",
        error
      );

      setError(
        "حدث خطأ أثناء تحميل الإشعارات."
      );
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(
    notificationId: string
  ) {
    try {
      const token = await getToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        "/api/notifications",
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            notificationId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error(
          "MARK NOTIFICATION ERROR:",
          result
        );
        return;
      }

      setNotifications(
        (current) =>
          current.map(
            (notification) =>
              notification.id ===
              notificationId
                ? {
                    ...notification,
                    is_read: true,
                  }
                : notification
          )
      );
    } catch (error) {
      console.error(
        "MARK AS READ ERROR:",
        error
      );
    }
  }

  async function markAllAsRead() {
    try {
      setMarkingAll(true);

      const token = await getToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        "/api/notifications",
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            markAll: true,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error(
          "MARK ALL ERROR:",
          result
        );

        return;
      }

      setNotifications(
        (current) =>
          current.map(
            (notification) => ({
              ...notification,
              is_read: true,
            })
          )
      );
    } catch (error) {
      console.error(
        "MARK ALL AS READ ERROR:",
        error
      );
    } finally {
      setMarkingAll(false);
    }
  }

  function getNotificationIcon(
    type: string
  ) {
    switch (type) {
      case "topup":
        return <Wallet size={21} />;

      case "withdrawal":
        return (
          <BanknoteArrowDown size={21} />
        );

      case "order":
        return <Package size={21} />;

      case "balance":
        return <CreditCard size={21} />;

      case "negative_balance":
        return (
          <AlertTriangle size={21} />
        );

      case "system":
        return <Settings size={21} />;

      default:
        return <Bell size={21} />;
    }
  }

  function getNotificationStyle(
    type: string
  ) {
    switch (type) {
      case "negative_balance":
        return {
          wrapper:
            "border-red-500/20 bg-red-500/10",
          icon: "bg-red-500/10 text-red-400",
          accent: "border-red-400",
        };

      case "topup":
        return {
          wrapper:
            "border-emerald-500/20 bg-emerald-500/10",
          icon:
            "bg-emerald-500/10 text-emerald-400",
          accent: "border-emerald-400",
        };

      case "withdrawal":
        return {
          wrapper:
            "border-orange-500/20 bg-orange-500/10",
          icon:
            "bg-orange-500/10 text-orange-400",
          accent: "border-orange-400",
        };

      case "order":
        return {
          wrapper:
            "border-[#d6a84f]/20 bg-[#d6a84f]/10",
          icon:
            "bg-[#d6a84f]/10 text-[#d6a84f]",
          accent: "border-[#d6a84f]",
        };

      case "balance":
        return {
          wrapper:
            "border-sky-500/20 bg-sky-500/10",
          icon:
            "bg-sky-500/10 text-sky-400",
          accent: "border-sky-400",
        };

      default:
        return {
          wrapper:
            "border-white/10 bg-white/5",
          icon:
            "bg-white/5 text-white/50",
          accent: "border-white/30",
        };
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString(
      "ar-JO",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.is_read
    ).length;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#0b0d10] text-white"
    >
      <div className="mx-auto w-full max-w-[1100px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">

        {/* HEADER */}

        <header className="mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-[#12151a] shadow-2xl">

          <div className="relative p-5 sm:p-7">

            <div className="absolute -left-16 -top-16 h-44 w-44 rounded-full bg-[#d6a84f]/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-4">

                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#d6a84f]/20 bg-[#d6a84f]/10 text-[#d6a84f]">

                  <Bell size={27} />

                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#12151a] bg-[#d6a84f] px-1 text-[9px] font-black text-[#0b0d10]">
                      {unreadCount > 99
                        ? "99+"
                        : unreadCount}
                    </span>
                  )}

                </div>

                <div>

                  <p className="text-xs font-bold text-[#d6a84f]">
                    مركز التنبيهات
                  </p>

                  <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                    الإشعارات
                  </h1>

                  <p className="mt-1 text-sm text-white/40">
                    جميع التنبيهات والإشعارات الخاصة بحسابك
                  </p>

                </div>

              </div>

              <div className="flex flex-col gap-2 sm:flex-row">

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={
                      markAllAsRead
                    }
                    disabled={markingAll}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-[#d6a84f] px-5 py-3 text-sm font-black text-[#0b0d10] transition hover:bg-[#e2b962] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCheck
                      size={17}
                    />

                    {markingAll
                      ? "جاري التحديث..."
                      : "تحديد الكل كمقروء"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={
                    loadNotifications
                  }
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#181b20] px-5 py-3 text-sm font-bold text-white/70 transition hover:border-[#d6a84f]/30 hover:text-white disabled:opacity-50"
                >
                  <RefreshCw
                    size={17}
                    className={
                      loading
                        ? "animate-spin"
                        : ""
                    }
                  />

                  تحديث
                </button>

              </div>

            </div>

          </div>

        </header>

        {/* ERROR */}

        {error && (
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-start gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                <XCircle size={19} />
              </div>

              <div>
                <p className="font-bold text-red-400">
                  حدث خطأ
                </p>

                <p className="mt-1 text-sm text-red-400/70">
                  {error}
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={
                loadNotifications
              }
              className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-400 transition hover:bg-red-500/20"
            >
              إعادة المحاولة
            </button>

          </div>
        )}

        {/* SUMMARY */}

        <div className="mb-6 grid grid-cols-2 gap-3">

          <div className="rounded-[24px] border border-white/10 bg-[#12151a] p-4 shadow-xl sm:p-5">

            <div className="flex items-start justify-between gap-3">

              <div>

                <p className="text-xs font-bold text-white/35">
                  إجمالي الإشعارات
                </p>

                <p className="mt-2 text-2xl font-black text-white sm:text-3xl">
                  {notifications.length}
                </p>

              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
                <Bell size={19} />
              </div>

            </div>

          </div>

          <div
            className={`rounded-[24px] border p-4 shadow-xl sm:p-5 ${
              unreadCount > 0
                ? "border-[#d6a84f]/20 bg-[#d6a84f]/5"
                : "border-white/10 bg-[#12151a]"
            }`}
          >

            <div className="flex items-start justify-between gap-3">

              <div>

                <p className="text-xs font-bold text-white/35">
                  غير مقروء
                </p>

                <p
                  className={`mt-2 text-2xl font-black sm:text-3xl ${
                    unreadCount > 0
                      ? "text-[#d6a84f]"
                      : "text-white"
                  }`}
                >
                  {unreadCount}
                </p>

              </div>

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  unreadCount > 0
                    ? "bg-[#d6a84f]/10 text-[#d6a84f]"
                    : "bg-white/5 text-white/30"
                }`}
              >
                <CheckCheck size={19} />
              </div>

            </div>

          </div>

        </div>

        {/* NOTIFICATIONS */}

        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#12151a] shadow-2xl">

          <div className="border-b border-white/5 p-5 sm:p-6">

            <div className="flex items-center justify-between">

              <div>

                <h2 className="text-lg font-black text-white">
                  سجل الإشعارات
                </h2>

                <p className="mt-1 text-xs text-white/30">
                  آخر التنبيهات المتعلقة بحسابك
                </p>

              </div>

              {unreadCount > 0 && (
                <span className="rounded-full border border-[#d6a84f]/20 bg-[#d6a84f]/10 px-3 py-1.5 text-[11px] font-black text-[#d6a84f]">
                  {unreadCount} جديد
                </span>
              )}

            </div>

          </div>

          {loading ? (
            <div className="p-12 text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#d6a84f]/10 text-[#d6a84f]">
                <Bell
                  size={29}
                  className="animate-pulse"
                />
              </div>

              <p className="mt-5 font-bold text-white/60">
                جاري تحميل الإشعارات...
              </p>

            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">

              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 text-white/20">
                <Bell size={36} />
              </div>

              <h3 className="mt-5 font-black text-white">
                لا توجد إشعارات
              </h3>

              <p className="mt-2 text-sm text-white/30">
                عندما يصلك إشعار سيظهر هنا.
              </p>

            </div>
          ) : (
            <div className="divide-y divide-white/5">

              {notifications.map(
                (notification) => {

                  const style =
                    getNotificationStyle(
                      notification.type
                    );

                  return (
                    <div
                      key={
                        notification.id
                      }
                      className={`relative p-5 transition sm:p-6 ${
                        !notification.is_read
                          ? "bg-[#d6a84f]/[0.025]"
                          : "hover:bg-white/[0.015]"
                      }`}
                    >

                      {/* UNREAD ACCENT */}

                      {!notification.is_read && (
                        <div className="absolute right-0 top-0 h-full w-1 bg-[#d6a84f]" />
                      )}

                      <div className="flex gap-4">

                        {/* ICON */}

                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${style.wrapper} ${style.icon}`}
                        >
                          {getNotificationIcon(
                            notification.type
                          )}
                        </div>

                        {/* CONTENT */}

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                            <div className="min-w-0">

                              <div className="flex flex-wrap items-center gap-2">

                                <h3 className="font-black text-white">
                                  {
                                    notification.title
                                  }
                                </h3>

                                {!notification.is_read && (
                                  <span className="rounded-full bg-[#d6a84f] px-2.5 py-1 text-[10px] font-black text-[#0b0d10]">
                                    جديد
                                  </span>
                                )}

                              </div>

                              <p className="mt-2 text-sm leading-7 text-white/55">
                                {
                                  notification.message
                                }
                              </p>

                            </div>

                            <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-white/25">

                              <Clock3
                                size={13}
                              />

                              <span>
                                {formatDate(
                                  notification.created_at
                                )}
                              </span>

                            </div>

                          </div>

                          {!notification.is_read && (
                            <div className="mt-4">

                              <button
                                type="button"
                                onClick={() =>
                                  markAsRead(
                                    notification.id
                                  )
                                }
                                className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#181b20] px-4 py-2.5 text-xs font-bold text-white/55 transition hover:border-[#d6a84f]/30 hover:bg-[#d6a84f]/5 hover:text-[#d6a84f]"
                              >
                                <Check
                                  size={15}
                                />
                                تحديد كمقروء
                              </button>

                            </div>
                          )}

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </section>

        {/* BACK */}

        <div className="mt-6 mb-10">

          <a
            href="/dashboard"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#12151a] py-4 text-sm font-bold text-white/50 transition hover:border-[#d6a84f]/30 hover:text-[#d6a84f]"
          >
            <ArrowLeft size={17} />
            العودة إلى لوحة التحكم
          </a>

        </div>

      </div>
    </main>
  );
}