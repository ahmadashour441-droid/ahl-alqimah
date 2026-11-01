"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Bell,
  Check,
  CheckCheck,
  ChevronLeft,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Settings,
  Users,
  Wallet,
  X,
  ClipboardList,
  CreditCard,
  CalendarDays,
  Receipt,
  CircleAlert,
  CircleCheck,
  Info,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Notification = {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  user_id: string | null;
};

type NotificationStyle = {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  border: string;
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
      setMessage("");

      const token = await getToken();

      if (!token) {
        setError(
          "انتهت جلسة الدخول، يرجى تسجيل الدخول مرة أخرى."
        );
        return;
      }

      const response = await fetch(
        "/api/admin/notifications",
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
    } catch (err) {
      console.error(
        "LOAD ADMIN NOTIFICATIONS ERROR:",
        err
      );

      setError(
        "حدث خطأ أثناء تحميل الإشعارات."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function markAsRead(
    notificationId: string
  ) {
    try {
      setError("");
      setMessage("");

      const token = await getToken();

      if (!token) {
        setError("انتهت جلسة الدخول.");
        return;
      }

      const response = await fetch(
        "/api/admin/notifications",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            notificationId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "تعذر تحديث الإشعار."
        );
        return;
      }

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                is_read: true,
              }
            : notification
        )
      );
    } catch (err) {
      console.error(
        "MARK NOTIFICATION READ ERROR:",
        err
      );

      setError(
        "حدث خطأ أثناء تحديث الإشعار."
      );
    }
  }

  async function markAllAsRead() {
    try {
      setMarkingAll(true);
      setError("");
      setMessage("");

      const token = await getToken();

      if (!token) {
        setError("انتهت جلسة الدخول.");
        return;
      }

      const response = await fetch(
        "/api/admin/notifications",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            markAll: true,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "تعذر تحديد الإشعارات كمقروءة."
        );
        return;
      }

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );

      setMessage(
        "تم تحديد جميع الإشعارات كمقروءة."
      );
    } catch (err) {
      console.error(
        "MARK ALL READ ERROR:",
        err
      );

      setError(
        "حدث خطأ أثناء تحديث الإشعارات."
      );
    } finally {
      setMarkingAll(false);
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

  function getNotificationStyle(
    type: string
  ): NotificationStyle {
    if (type === "success") {
      return {
        icon: <CircleCheck size={19} />,
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-400",
        border: "border-emerald-400/20",
      };
    }

    if (type === "warning") {
      return {
        icon: <CircleAlert size={19} />,
        iconBg: "bg-amber-400/10",
        iconColor: "text-amber-300",
        border: "border-amber-400/20",
      };
    }

    if (type === "error") {
      return {
        icon: <CircleAlert size={19} />,
        iconBg: "bg-red-500/10",
        iconColor: "text-red-400",
        border: "border-red-400/20",
      };
    }

    return {
      icon: <Info size={19} />,
      iconBg: "bg-sky-400/10",
      iconColor: "text-sky-300",
      border: "border-sky-400/20",
    };
  }

  function goTo(path: string) {
    window.location.href = path;
  }

  async function logout() {
    await supabase.auth.signOut();

    localStorage.removeItem("user");
    localStorage.removeItem("access_token");

    window.location.href = "/";
  }

  const unreadCount = notifications.filter(
    (notification) =>
      !notification.is_read
  ).length;

  const readCount =
    notifications.length - unreadCount;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#050505] text-white"
    >
      {/* OVERLAY */}

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* SIDE MENU */}

      <aside
        className={`fixed right-0 top-0 z-50 h-full w-[285px] border-l border-white/10 bg-[#090909] shadow-2xl transition-transform duration-300 ${
          menuOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* MENU HEADER */}

          <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
            <div>
              <h2 className="text-lg font-black text-[#d6a84f]">
                أهل القمة
              </h2>

              <p className="mt-1 text-[11px] text-white/40">
                لوحة تحكم الإدارة
              </p>
            </div>

            <button
              onClick={() => setMenuOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* MENU */}

          <nav className="flex-1 overflow-y-auto p-4">
            <div className="mb-2 px-3 text-[10px] font-bold text-white/30">
              الرئيسية
            </div>

            <MenuItem
              icon={<LayoutDashboard size={18} />}
              label="لوحة التحكم"
              onClick={() => goTo("/admin")}
            />

            <MenuItem
              icon={<Bell size={18} />}
              label="الإشعارات"
              active
              badge={
                unreadCount > 0
                  ? unreadCount
                  : undefined
              }
              onClick={() =>
                setMenuOpen(false)
              }
            />

            <div className="mb-2 mt-6 px-3 text-[10px] font-bold text-white/30">
              الإدارة
            </div>

            <MenuItem
              icon={<Users size={18} />}
              label="المستخدمون"
              onClick={() =>
                goTo("/admin/users")
              }
            />

            <MenuItem
              icon={<ClipboardList size={18} />}
              label="الطلبات"
              onClick={() =>
                goTo("/admin/orders")
              }
            />

            <MenuItem
              icon={<Wallet size={18} />}
              label="طلبات الشحن"
              onClick={() =>
                goTo("/admin/topups")
              }
            />

            <MenuItem
              icon={<CreditCard size={18} />}
              label="طلبات السحب"
              onClick={() =>
                goTo("/admin/withdrawals")
              }
            />

            <MenuItem
              icon={<Receipt size={18} />}
              label="الحركات المالية"
              onClick={() =>
                goTo("/admin/transactions")
              }
            />

            <MenuItem
              icon={<CalendarDays size={18} />}
              label="الأسابيع"
              onClick={() =>
                goTo("/admin/weeks")
              }
            />

            <div className="mb-2 mt-6 px-3 text-[10px] font-bold text-white/30">
              الحساب
            </div>

            <MenuItem
              icon={<Settings size={18} />}
              label="الإعدادات"
              onClick={() =>
                goTo("/admin/settings")
              }
            />
          </nav>

          {/* LOGOUT */}

          <div className="border-t border-white/10 p-4">
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl border border-red-500/10 bg-red-500/5 px-4 py-3 text-right text-sm font-bold text-red-300 transition hover:bg-red-500/10"
            >
              <LogOut size={18} />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </aside>

      {/* PAGE */}

      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        {/* HEADER */}

        <header className="mb-6 flex items-center justify-between">
          <button
            onClick={() => setMenuOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#0d0d0d] text-white/70 transition hover:border-[#d6a84f]/30 hover:text-[#d6a84f]"
            aria-label="فتح القائمة"
          >
            <Menu size={20} />
          </button>

          <div className="text-center">
            <h1 className="text-lg font-black tracking-wide text-[#d6a84f]">
              أهل القمة
            </h1>

            <p className="mt-0.5 text-[11px] text-white/40">
              الإشعارات
            </p>
          </div>

          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[#d6a84f]/20 bg-[#d6a84f]/5">
            <Bell
              size={19}
              className="text-[#d6a84f]"
            />

            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
                {unreadCount > 99
                  ? "99+"
                  : unreadCount}
              </span>
            )}
          </div>
        </header>

        {/* TITLE */}

        <section className="mb-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                الإشعارات
              </h2>

              <p className="mt-1 text-xs text-white/40">
                جميع التنبيهات الخاصة بالنظام
              </p>
            </div>

            <button
              onClick={loadNotifications}
              disabled={loading}
              className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white/70 transition hover:border-[#d6a84f]/30 hover:text-[#d6a84f] disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              تحديث
            </button>
          </div>
        </section>

        {/* STATS */}

        <section className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
          <StatCard
            icon={<Bell size={17} />}
            label="الإجمالي"
            value={notifications.length}
          />

          <StatCard
            icon={<CircleAlert size={17} />}
            label="غير مقروءة"
            value={unreadCount}
            danger={unreadCount > 0}
          />

          <StatCard
            icon={<CheckCheck size={17} />}
            label="مقروءة"
            value={readCount}
            success
          />
        </section>

        {/* ACTION */}

        {unreadCount > 0 && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-[#d6a84f]/15 bg-[#d6a84f]/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
                <Bell size={17} />
              </div>

              <div>
                <p className="text-xs font-bold text-white">
                  لديك {unreadCount} إشعار غير مقروء
                </p>

                <p className="mt-0.5 text-[10px] text-white/40">
                  يمكنك تحديدها كمقروءة دفعة واحدة
                </p>
              </div>
            </div>

            <button
              onClick={markAllAsRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 rounded-xl bg-[#d6a84f] px-3 py-2 text-[10px] font-black text-black transition hover:bg-[#e3bb68] disabled:opacity-50"
            >
              <CheckCheck size={14} />

              {markingAll
                ? "جاري..."
                : "قراءة الكل"}
            </button>
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-red-300">
            <CircleAlert
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div className="text-xs font-bold leading-6">
              {error}
            </div>
          </div>
        )}

        {/* SUCCESS */}

        {message && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-emerald-300">
            <CircleCheck
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div className="text-xs font-bold leading-6">
              {message}
            </div>
          </div>
        )}

        {/* NOTIFICATIONS */}

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a] shadow-2xl shadow-black/20">
          <div className="border-b border-white/10 px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">
                  آخر التنبيهات
                </h3>

                <p className="mt-1 text-[10px] text-white/35">
                  سجل الإشعارات الواردة للنظام
                </p>
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d6a84f]/10 text-[#d6a84f]">
                <Bell size={15} />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d6a84f]/20 bg-[#d6a84f]/5">
                <RefreshCw
                  size={19}
                  className="animate-spin text-[#d6a84f]"
                />
              </div>

              <p className="text-xs font-bold text-white/40">
                جاري تحميل الإشعارات...
              </p>
            </div>
          ) : notifications.length ===
            0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-5 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                <Bell
                  size={25}
                  className="text-white/25"
                />
              </div>

              <h3 className="mt-4 text-sm font-black text-white/60">
                لا توجد إشعارات حاليًا
              </h3>

              <p className="mt-1 text-[10px] text-white/30">
                ستظهر هنا التنبيهات الجديدة عند وصولها
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {notifications.map(
                (notification) => {
                  const style =
                    getNotificationStyle(
                      notification.notification_type
                    );

                  return (
                    <div
                      key={notification.id}
                      className={`relative px-4 py-4 transition sm:px-5 ${
                        notification.is_read
                          ? "bg-transparent"
                          : "bg-white/[0.025]"
                      }`}
                    >
                      {!notification.is_read && (
                        <div className="absolute bottom-0 right-0 top-0 w-0.5 bg-[#d6a84f]" />
                      )}

                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${style.border} ${style.iconBg} ${style.iconColor}`}
                        >
                          {style.icon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-black text-white">
                                  {
                                    notification.title
                                  }
                                </h4>

                                {!notification.is_read && (
                                  <span className="rounded-full bg-[#d6a84f]/10 px-2 py-0.5 text-[9px] font-black text-[#d6a84f]">
                                    جديد
                                  </span>
                                )}
                              </div>

                              <p className="mt-1.5 text-xs leading-6 text-white/55">
                                {
                                  notification.message
                                }
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                              <ChevronLeft
                                size={12}
                                className="rotate-180"
                              />

                              {formatDate(
                                notification.created_at
                              )}
                            </div>

                            {!notification.is_read && (
                              <button
                                onClick={() =>
                                  markAsRead(
                                    notification.id
                                  )
                                }
                                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold text-white/60 transition hover:border-[#d6a84f]/30 hover:text-[#d6a84f]"
                              >
                                <Check
                                  size={13}
                                />

                                تحديد كمقروء
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* FOOTER */}

        <div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-white/20">
          <Home size={11} />
          <span>أهل القمة • لوحة الإدارة</span>
        </div>
      </div>
    </main>
  );
}

/* =========================
   COMPONENTS
========================= */

function MenuItem({
  icon,
  label,
  active = false,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right transition ${
        active
          ? "border border-[#d6a84f]/15 bg-[#d6a84f]/10 text-[#d6a84f]"
          : "border border-transparent text-white/55 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span
        className={
          active
            ? "text-[#d6a84f]"
            : "text-white/45"
        }
      >
        {icon}
      </span>

      <span className="flex-1 text-xs font-bold">
        {label}
      </span>

      {badge !== undefined && (
        <span className="flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

function StatCard({
  icon,
  label,
  value,
  danger = false,
  success = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-3 shadow-xl shadow-black/10 sm:p-4">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          danger
            ? "bg-red-500/10 text-red-400"
            : success
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-[#d6a84f]/10 text-[#d6a84f]"
        }`}
      >
        {icon}
      </div>

      <p className="mt-3 text-[10px] font-bold text-white/35">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-black ${
          danger
            ? "text-red-400"
            : success
            ? "text-emerald-400"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}