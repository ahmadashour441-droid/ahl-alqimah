"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Menu,
  X,
  Home,
  Users,
  ClipboardList,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Activity,
  CalendarDays,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ShieldCheck,
  UserRound,
  CircleDollarSign,
  AlertCircle,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type User = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  balance: number;
  is_active: boolean;
  created_at: string;
};

type DashboardData = {
  admin: User;

  stats: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    totalBalance: number;
    positiveBalance: number;
    negativeBalance: number;
    positiveUsersCount: number;
    negativeUsersCount: number;
    zeroUsersCount: number;
    totalOrders: number;
    activeOrders: number;
    pendingTopups: number;
    pendingWithdrawals: number;
    unreadNotifications: number;
  };

  balances: {
    positive: User[];
    negative: User[];
    zero: User[];
  };

  users: User[];

  currentWeek: {
    id: string;
    start_at: string;
    end_at: string;
    is_closed: boolean;
  } | null;
};

function formatMoney(value: number) {
  return `${Number(value || 0).toFixed(2)} JD`;
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("ar-JO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function getInitials(name: string | null) {
  if (!name) return "؟";

  const parts = name.trim().split(" ");

  if (parts.length === 1) {
    return parts[0].slice(0, 1);
  }

  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`;
}

export default function AdminPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);

  const [balanceModal, setBalanceModal] = useState<
    "positive" | "negative" | null
  >(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        window.location.href = "/";
        return;
      }

      const response = await fetch("/api/admin/dashboard", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const contentType =
        response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        throw new Error("استجابة غير صحيحة من السيرفر");
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "فشل تحميل لوحة التحكم"
        );
      }

      setData(result);
    } catch (err) {
      console.error("ADMIN DASHBOARD ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل لوحة التحكم"
      );
    } finally {
      setLoading(false);
    }
  }

  function goTo(path: string) {
    setMenuOpen(false);
    window.location.href = path;
  }

  async function logout() {
    setMenuOpen(false);

    await supabase.auth.signOut();

    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("admin");

    window.location.href = "/";
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#0b0d10] text-white"
      >
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#d6a84f]" />

            <p className="text-sm text-white/50">
              جاري تحميل لوحة التحكم...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#0b0d10] p-4 text-white"
      >
        <div className="mx-auto mt-16 max-w-md rounded-3xl border border-white/10 bg-[#12151a] p-6 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
            <AlertCircle size={20} strokeWidth={1.8} />
          </div>

          <h1 className="text-lg font-bold">
            تعذر تحميل لوحة التحكم
          </h1>

          <p className="mt-2 text-sm text-white/50">
            {error || "حدث خطأ غير معروف"}
          </p>

          <button
            onClick={loadDashboard}
            className="mt-5 rounded-2xl bg-[#d6a84f] px-6 py-3 text-sm font-bold text-black"
          >
            إعادة المحاولة
          </button>
        </div>
      </main>
    );
  }

  const { stats, balances, currentWeek, admin } = data;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#0b0d10] text-white"
    >
      {/* =========================
          OVERLAY
      ========================= */}

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* =========================
          SIDE MENU
      ========================= */}

      <aside
        className={`fixed right-0 top-0 z-50 h-full w-[84%] max-w-[350px] border-l border-white/10 bg-[#101317] shadow-2xl transition-transform duration-300 ${
          menuOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">

          {/* Menu Header */}

          <div className="border-b border-white/10 p-5">

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d6a84f]/30 bg-[#d6a84f]/10 text-[#d6a84f]">
                  <ShieldCheck
                    size={21}
                    strokeWidth={1.7}
                  />
                </div>

                <div>
                  <h2 className="text-lg font-black tracking-wide text-[#d6a84f]">
                    أهل القمة
                  </h2>

                  <p className="mt-0.5 text-[10px] text-white/35">
                    لوحة إدارة النظام
                  </p>
                </div>

              </div>

              <button
                onClick={() => setMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                <X size={18} strokeWidth={1.8} />
              </button>

            </div>

            {/* Admin Profile */}

            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/7 bg-white/[0.025] p-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d6a84f]/10 text-xs font-bold text-[#d6a84f]">
                {getInitials(admin.full_name)}
              </div>

              <div className="min-w-0">

                <p className="truncate text-sm font-semibold">
                  {admin.full_name || "مدير النظام"}
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                  <span className="text-[10px] text-white/30">
                    مدير النظام
                  </span>
                </div>

              </div>

            </div>

          </div>

          {/* Menu Items */}

          <div className="flex-1 overflow-y-auto p-3">

            <MenuItem
              icon={
                <Home
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="الرئيسية"
              active
              onClick={() => goTo("/admin")}
            />

            <MenuItem
              icon={
                <Users
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="المستخدمون"
              onClick={() => goTo("/admin/users")}
            />

            <MenuItem
              icon={
                <ClipboardList
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="الطلبات"
              onClick={() => goTo("/admin/orders")}
            />

            <MenuItem
              icon={
                <ArrowUpCircle
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="طلبات الشحن"
              badge={stats.pendingTopups}
              onClick={() => goTo("/admin/topups")}
            />

            <MenuItem
              icon={
                <ArrowDownCircle
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="طلبات السحب"
              badge={stats.pendingWithdrawals}
              onClick={() => goTo("/admin/withdrawals")}
            />

            <MenuItem
              icon={
                <Activity
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="الحركات المالية"
              onClick={() =>
                goTo("/admin/transactions")
              }
            />

            <MenuItem
              icon={
                <CalendarDays
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="الأسابيع"
              onClick={() => goTo("/admin/weeks")}
            />

            <MenuItem
              icon={
                <Bell
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="الإشعارات"
              badge={stats.unreadNotifications}
              onClick={() =>
                goTo("/admin/notifications")
              }
            />

            <MenuItem
              icon={
                <Settings
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="الإعدادات"
              onClick={() =>
                goTo("/admin/settings")
              }
            />

          </div>

          {/* Logout */}

          <div className="border-t border-white/10 p-3">

            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-right text-sm text-red-400 transition hover:bg-red-500/5"
            >

              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10">
                <LogOut
                  size={17}
                  strokeWidth={1.8}
                />
              </span>

              <span>تسجيل الخروج</span>

            </button>

          </div>

        </div>
      </aside>

      {/* =========================
          MAIN
      ========================= */}

      <div className="mx-auto min-h-screen max-w-6xl px-4 pb-8 pt-4 sm:px-6">

        {/* =========================
            HEADER
        ========================= */}

        <header className="mb-5 flex items-center justify-between">

          <button
            onClick={() => setMenuOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#12151a] text-white/70 transition hover:border-[#d6a84f]/30 hover:text-[#d6a84f]"
          >
            <Menu
              size={20}
              strokeWidth={1.8}
            />
          </button>

          <div className="text-center">

            <h1 className="text-lg font-black tracking-wide text-[#d6a84f]">
              أهل القمة
            </h1>

            <p className="mt-0.5 text-[11px] text-white/45">
              لوحة التحكم
            </p>

          </div>

          <button
            onClick={() =>
              goTo("/admin/notifications")
            }
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#12151a] text-white/60 transition hover:border-[#d6a84f]/30 hover:text-[#d6a84f]"
          >

            <Bell
              size={18}
              strokeWidth={1.8}
            />

            {stats.unreadNotifications > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {stats.unreadNotifications}
              </span>
            )}

          </button>

        </header>

        {/* =========================
            WELCOME
        ========================= */}

        <section className="mb-4 rounded-[26px] border border-white/10 bg-gradient-to-br from-[#171a20] to-[#101216] p-5">

          <div className="flex items-center gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d6a84f]/40 bg-[#d6a84f]/10 text-sm font-bold text-[#d6a84f]">
              {getInitials(admin.full_name)}
            </div>

            <div className="min-w-0">

              <p className="text-xs text-white/40">
                أهلاً بك
              </p>

              <h2 className="truncate text-lg font-bold">
                {admin.full_name || "مدير النظام"}
              </h2>

              <div className="mt-1 flex items-center gap-2">

                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                <span className="text-[10px] text-white/35">
                  مدير النظام
                </span>

              </div>

            </div>

          </div>

        </section>

        {/* =========================
            TOTAL BALANCE
        ========================= */}

        <button
          onClick={() => setBalanceModal("positive")}
          className="mb-4 w-full rounded-[26px] border border-[#d6a84f]/30 bg-gradient-to-br from-[#76551f] via-[#8e6623] to-[#4f3915] p-5 text-right shadow-[0_10px_40px_rgba(0,0,0,0.25)] transition active:scale-[0.99]"
        >

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs text-white/65">
                إجمالي أرصدة الحسابات
              </p>

              <p className="mt-2 text-3xl font-black tracking-tight">
                {formatMoney(stats.totalBalance)}
              </p>

              <p className="mt-2 text-[10px] text-white/45">
                اضغط لعرض الحسابات التي لديها رصيد
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/20 text-white">
              <CircleDollarSign
                size={21}
                strokeWidth={1.7}
              />
            </div>

          </div>

        </button>

        {/* =========================
            MAIN STATS
        ========================= */}

        <section className="mb-5 grid grid-cols-2 gap-3">

          <StatCard
            title="المستخدمون"
            value={stats.totalUsers}
            subtitle={`${stats.activeUsers} نشط`}
            icon={
              <Users
                size={18}
                strokeWidth={1.8}
              />
            }
            onClick={() => goTo("/admin/users")}
          />

          <StatCard
            title="الطلبات"
            value={stats.totalOrders}
            subtitle={`${stats.activeOrders} فعّال`}
            icon={
              <ClipboardList
                size={18}
                strokeWidth={1.8}
              />
            }
            onClick={() => goTo("/admin/orders")}
          />

          <StatCard
            title="طلبات الشحن"
            value={stats.pendingTopups}
            subtitle="بانتظار المراجعة"
            icon={
              <ArrowUpCircle
                size={18}
                strokeWidth={1.8}
              />
            }
            alert={stats.pendingTopups > 0}
            onClick={() => goTo("/admin/topups")}
          />

          <StatCard
            title="طلبات السحب"
            value={stats.pendingWithdrawals}
            subtitle="بانتظار المراجعة"
            icon={
              <ArrowDownCircle
                size={18}
                strokeWidth={1.8}
              />
            }
            alert={stats.pendingWithdrawals > 0}
            onClick={() => goTo("/admin/withdrawals")}
          />

        </section>

        {/* =========================
            BALANCES
        ========================= */}

        <section className="mb-5">

          <div className="mb-3">

            <h2 className="text-sm font-bold">
              الأرصدة
            </h2>

            <p className="mt-1 text-[11px] text-white/35">
              حسب الرصيد الحالي للمستخدمين
            </p>

          </div>

          <div className="grid grid-cols-2 gap-3">

            <button
              onClick={() =>
                setBalanceModal("positive")
              }
              className="rounded-2xl border border-emerald-400/10 bg-[#11171a] p-4 text-right transition active:scale-[0.98] hover:border-emerald-400/20"
            >

              <div className="mb-3 flex items-center justify-between">

                <span className="text-xs text-white/55">
                  أرصدة موجبة
                </span>

                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                  <ArrowUpCircle
                    size={17}
                    strokeWidth={1.7}
                  />
                </span>

              </div>

              <p className="text-lg font-bold text-emerald-400">
                {formatMoney(stats.positiveBalance)}
              </p>

              <p className="mt-1 text-[10px] text-white/30">
                {stats.positiveUsersCount} حساب
              </p>

            </button>

            <button
              onClick={() =>
                setBalanceModal("negative")
              }
              className="rounded-2xl border border-red-400/10 bg-[#171113] p-4 text-right transition active:scale-[0.98] hover:border-red-400/20"
            >

              <div className="mb-3 flex items-center justify-between">

                <span className="text-xs text-white/55">
                  أرصدة سالبة
                </span>

                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-400/10 text-red-400">
                  <ArrowDownCircle
                    size={17}
                    strokeWidth={1.7}
                  />
                </span>

              </div>

              <p className="text-lg font-bold text-red-400">
                {formatMoney(
                  Math.abs(stats.negativeBalance)
                )}
              </p>

              <p className="mt-1 text-[10px] text-white/30">
                {stats.negativeUsersCount} حساب
              </p>

            </button>

          </div>

        </section>

        {/* =========================
            QUICK MANAGEMENT
        ========================= */}

        <section className="mb-5">

          <div className="mb-3">

            <h2 className="text-sm font-bold">
              الإدارة السريعة
            </h2>

            <p className="mt-1 text-[11px] text-white/35">
              الوصول السريع للأقسام
            </p>

          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

            <QuickAction
              title="المستخدمون"
              icon={
                <Users
                  size={18}
                  strokeWidth={1.8}
                />
              }
              onClick={() => goTo("/admin/users")}
            />

            <QuickAction
              title="الطلبات"
              icon={
                <ClipboardList
                  size={18}
                  strokeWidth={1.8}
                />
              }
              onClick={() => goTo("/admin/orders")}
            />

            <QuickAction
              title="الحركات"
              icon={
                <Activity
                  size={18}
                  strokeWidth={1.8}
                />
              }
              onClick={() =>
                goTo("/admin/transactions")
              }
            />

            <QuickAction
              title="الأسابيع"
              icon={
                <CalendarDays
                  size={18}
                  strokeWidth={1.8}
                />
              }
              onClick={() => goTo("/admin/weeks")}
            />

            <QuickAction
              title="الشحن"
              icon={
                <ArrowUpCircle
                  size={18}
                  strokeWidth={1.8}
                />
              }
              badge={stats.pendingTopups}
              onClick={() => goTo("/admin/topups")}
            />

            <QuickAction
              title="السحب"
              icon={
                <ArrowDownCircle
                  size={18}
                  strokeWidth={1.8}
                />
              }
              badge={stats.pendingWithdrawals}
              onClick={() =>
                goTo("/admin/withdrawals")
              }
            />

            <QuickAction
              title="الإشعارات"
              icon={
                <Bell
                  size={18}
                  strokeWidth={1.8}
                />
              }
              badge={stats.unreadNotifications}
              onClick={() =>
                goTo("/admin/notifications")
              }
            />

            <QuickAction
              title="الإعدادات"
              icon={
                <Settings
                  size={18}
                  strokeWidth={1.8}
                />
              }
              onClick={() =>
                goTo("/admin/settings")
              }
            />

          </div>

        </section>

        {/* =========================
            CURRENT WEEK
        ========================= */}

        <button
          onClick={() => goTo("/admin/weeks")}
          className="mb-5 w-full rounded-2xl border border-white/10 bg-[#12151a] p-4 text-right transition hover:border-[#d6a84f]/30"
        >

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
                <CalendarDays
                  size={18}
                  strokeWidth={1.7}
                />
              </div>

              <div>

                <p className="text-xs text-white/40">
                  الأسبوع الحالي
                </p>

                {currentWeek ? (
                  <>
                    <p className="mt-1 text-sm font-bold">
                      {formatDate(
                        currentWeek.start_at
                      )}
                    </p>

                    <p className="mt-1 text-[10px] text-white/30">
                      حتى{" "}
                      {formatDate(
                        currentWeek.end_at
                      )}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-white/40">
                    غير متوفر
                  </p>
                )}

              </div>

            </div>

            <ChevronLeft
              size={17}
              className="text-white/25"
            />

          </div>

        </button>

      </div>

      {/* =========================
          BALANCE MODAL
      ========================= */}

      {balanceModal && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center"
          onClick={() => setBalanceModal(null)}
        >

          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-[#12151a]"
          >

            <div className="flex items-center justify-between border-b border-white/10 p-5">

              <div>

                <h2 className="font-bold">
                  {balanceModal === "positive"
                    ? "الأرصدة الموجبة"
                    : "الأرصدة السالبة"}
                </h2>

                <p className="mt-1 text-[11px] text-white/35">
                  {balanceModal === "positive"
                    ? `${balances.positive.length} حساب`
                    : `${balances.negative.length} حساب`}
                </p>

              </div>

              <button
                onClick={() =>
                  setBalanceModal(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X
                  size={17}
                  strokeWidth={1.8}
                />
              </button>

            </div>

            <div className="max-h-[60vh] overflow-y-auto p-3">

              {(balanceModal === "positive"
                ? balances.positive
                : balances.negative
              ).length === 0 ? (
                <div className="p-8 text-center text-sm text-white/35">
                  لا توجد حسابات
                </div>
              ) : (
                (balanceModal === "positive"
                  ? balances.positive
                  : balances.negative
                ).map((user) => (
                  <div
                    key={user.id}
                    className="mb-2 flex items-center justify-between rounded-2xl border border-white/5 bg-[#181b20] p-3"
                  >

                    <div className="flex min-w-0 items-center gap-3">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d6a84f]/10 text-xs font-bold text-[#d6a84f]">
                        {getInitials(
                          user.full_name
                        )}
                      </div>

                      <div className="min-w-0">

                        <p className="truncate text-sm font-semibold">
                          {user.full_name ||
                            "بدون اسم"}
                        </p>

                        <p className="mt-1 text-[10px] text-white/30">
                          {user.phone || "-"}
                        </p>

                      </div>

                    </div>

                    <p
                      className={`shrink-0 text-sm font-bold ${
                        user.balance > 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {formatMoney(
                        user.balance
                      )}
                    </p>

                  </div>
                ))
              )}

            </div>

          </div>

        </div>
      )}
    </main>
  );
}

/* =========================================================
   MENU ITEM
========================================================= */

function MenuItem({
  icon,
  title,
  badge,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-right transition ${
        active
          ? "bg-[#d6a84f]/10 text-[#d6a84f]"
          : "text-white/55 hover:bg-white/5 hover:text-white"
      }`}
    >

      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          active
            ? "bg-[#d6a84f]/10"
            : "bg-white/[0.035]"
        }`}
      >
        {icon}
      </span>

      <span className="flex-1 text-sm font-medium">
        {title}
      </span>

      {badge && badge > 0 ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
          {badge}
        </span>
      ) : null}

      <ChevronLeft
        size={14}
        className="text-white/20"
      />

    </button>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  title,
  value,
  subtitle,
  icon,
  alert,
  onClick,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  alert?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[22px] border bg-[#12151a] p-4 text-right transition active:scale-[0.98] ${
        alert
          ? "border-[#d6a84f]/30"
          : "border-white/8"
      }`}
    >

      <div className="flex items-start justify-between">

        <div>

          <p className="text-[11px] text-white/40">
            {title}
          </p>

          <p className="mt-2 text-xl font-black">
            {value}
          </p>

          <p className="mt-1 text-[10px] text-white/30">
            {subtitle}
          </p>

        </div>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
          {icon}
        </span>

      </div>

    </button>
  );
}

/* =========================================================
   QUICK ACTION
========================================================= */

function QuickAction({
  title,
  icon,
  badge,
  onClick,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex min-h-[76px] flex-col items-center justify-center rounded-2xl border border-white/7 bg-[#12151a] px-2 py-3 transition active:scale-[0.97] hover:border-[#d6a84f]/25"
    >

      <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
        {icon}
      </span>

      <span className="text-[10px] font-medium text-white/65">
        {title}
      </span>

      {badge && badge > 0 ? (
        <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">
          {badge}
        </span>
      ) : null}

    </button>
  );
}