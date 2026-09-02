"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Menu,
  X,
  Home,
  Wallet,
  CalendarDays,
  Bell,
  Settings,
  LogOut,
  PlusCircle,
  ArrowDownToLine,
  UserRound,
  ChevronLeft,
  Activity,
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
};

type DashboardData = {
  user?: User;

  stats?: {
    balance?: number;
    currentBalance?: number;
    totalBalance?: number;
    producedTotal?: number;
    consumedTotal?: number;
    producedCount?: number;
    consumedCount?: number;
    totalProduced?: number;
    totalConsumed?: number;
    orderCount?: number;
    totalOrders?: number;
  };

  currentWeek?: {
    id: string;
    start_at: string;
    end_at: string;
    is_closed: boolean;
  } | null;

  recentOrders?: Array<{
    id: string;
    order_number?: number;
    order_type?: string;
    amount?: number;
    commission_amount?: number;
    status?: string;
    producer_id?: string;
    consumer_id?: string;
    created_at?: string;
  }>;
};

function formatMoney(value: number) {
  return `${Number(value || 0).toFixed(2)} JD`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("ar-JO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

function getInitials(name: string | null | undefined) {
  if (!name) return "أ";

  const parts = name.trim().split(" ");

  if (parts.length === 1) {
    return parts[0].slice(0, 1);
  }

  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

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

      const response = await fetch("/api/dashboard", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
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
      console.error("DASHBOARD ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل الحساب"
      );
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();

    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("admin");

    window.location.href = "/";
  }

  function goTo(path: string) {
    setMenuOpen(false);
    window.location.href = path;
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#0b0d10] text-white"
      >
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#d6a84f]" />

            <p className="text-sm text-white/45">
              جاري تحميل الحساب...
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
        className="min-h-screen bg-[#0b0d10] p-5 text-white"
      >
        <div className="mx-auto mt-20 max-w-md rounded-3xl border border-white/10 bg-[#12151a] p-6 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            !
          </div>

          <h1 className="text-lg font-bold">
            تعذر تحميل الحساب
          </h1>

          <p className="mt-2 text-sm text-white/40">
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

  const user = data.user;

  const balance = Number(
    user?.balance ??
      data.stats?.balance ??
      data.stats?.currentBalance ??
      data.stats?.totalBalance ??
      0
  );

  const producedTotal = Number(
    data.stats?.producedTotal ??
      data.stats?.totalProduced ??
      0
  );

  const consumedTotal = Number(
    data.stats?.consumedTotal ??
      data.stats?.totalConsumed ??
      0
  );

  const producedCount = Number(
    data.stats?.producedCount ?? 0
  );

  const consumedCount = Number(
    data.stats?.consumedCount ?? 0
  );

  const isNegative = balance < 0;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#0b0d10] text-white"
    >
      <div className="mx-auto min-h-screen max-w-2xl px-4 pb-8 pt-4">

        {/* =========================
            SIDE MENU
        ========================= */}

        {menuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <aside
          className={`fixed right-0 top-0 z-50 h-full w-[82%] max-w-[340px] border-l border-white/10 bg-[#101317] shadow-2xl transition-transform duration-300 ${
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

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d6a84f]/30 bg-[#d6a84f]/10 text-sm font-black text-[#d6a84f]">
                    AQ
                  </div>

                  <div>
                    <p className="text-[10px] text-white/35">
                      أهل القمة
                    </p>

                    <p className="text-sm font-bold">
                      قائمة الحساب
                    </p>
                  </div>

                </div>

                <button
                  onClick={() => setMenuOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/50"
                >
                  <X size={18} strokeWidth={1.8} />
                </button>

              </div>

              {/* User mini profile */}

              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/7 bg-white/[0.025] p-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d6a84f]/10 text-xs font-bold text-[#d6a84f]">
                  {getInitials(user?.full_name)}
                </div>

                <div className="min-w-0">

                  <p className="truncate text-sm font-semibold">
                    {user?.full_name || "الكابتن"}
                  </p>

                  <p className="mt-1 text-[10px] text-white/30">
                    {user?.phone || ""}
                  </p>

                </div>

              </div>

            </div>

            {/* Menu Items */}

            <div className="flex-1 overflow-y-auto p-3">

              <MenuItem
                icon={<Home size={18} strokeWidth={1.8} />}
                title="الرئيسية"
                active
                onClick={() => goTo("/dashboard")}
              />

              <MenuItem
                icon={<Wallet size={18} strokeWidth={1.8} />}
                title="المالية"
                onClick={() => goTo("/finance")}
              />

              <MenuItem
                icon={
                  <PlusCircle
                    size={18}
                    strokeWidth={1.8}
                  />
                }
                title="طلب شحن الرصيد"
                onClick={() =>
                  goTo("/finance/topup")
                }
              />

              <MenuItem
                icon={
                  <ArrowDownToLine
                    size={18}
                    strokeWidth={1.8}
                  />
                }
                title="طلب سحب"
                onClick={() =>
                  goTo("/finance/withdraw")
                }
              />

              <MenuItem
                icon={
                  <Activity
                    size={18}
                    strokeWidth={1.8}
                  />
                }
                title="الحركات المالية"
                onClick={() => goTo("/finance")}
              />

              <MenuItem
                icon={
                  <CalendarDays
                    size={18}
                    strokeWidth={1.8}
                  />
                }
                title="الأسابيع"
                onClick={() => goTo("/weeks")}
              />

              <MenuItem
                icon={
                  <Bell
                    size={18}
                    strokeWidth={1.8}
                  />
                }
                title="الإشعارات"
                onClick={() =>
                  goTo("/notifications")
                }
              />

              <MenuItem
                icon={
                  <UserRound
                    size={18}
                    strokeWidth={1.8}
                  />
                }
                title="حسابي"
                onClick={() => goTo("/settings")}
              />

              <MenuItem
                icon={
                  <Settings
                    size={18}
                    strokeWidth={1.8}
                  />
                }
                title="الإعدادات"
                onClick={() => goTo("/settings")}
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
    الرئيسية
  </p>

</div>

          <button
            onClick={() =>
              goTo("/notifications")
            }
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#12151a] text-white/60"
          >
            <Bell
              size={18}
              strokeWidth={1.8}
            />
          </button>

        </header>

        {/* =========================
            WELCOME
        ========================= */}

        <section className="mb-4 rounded-[26px] border border-white/10 bg-[#12151a] p-5">

          <div className="flex items-center gap-3">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d6a84f]/30 bg-[#d6a84f]/10 text-sm font-bold text-[#d6a84f]">
              {getInitials(user?.full_name)}
            </div>

            <div className="min-w-0">

              <p className="text-[11px] text-white/35">
                أهلاً وسهلاً
              </p>

              <h2 className="truncate text-lg font-bold">
                {user?.full_name || "الكابتن"}
              </h2>

              <div className="mt-1 flex items-center gap-2">

                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    user?.is_active
                      ? "bg-emerald-400"
                      : "bg-white/25"
                  }`}
                />

                <span className="text-[10px] text-white/35">
                  {user?.is_active
                    ? "الحساب نشط"
                    : "الحساب غير نشط"}
                </span>

              </div>

            </div>

          </div>

        </section>

        {/* =========================
            BALANCE
        ========================= */}

        <button
          onClick={() => goTo("/finance")}
          className={`mb-4 w-full rounded-[26px] border p-5 text-right transition active:scale-[0.99] ${
            isNegative
              ? "border-red-500/20 bg-[#181113]"
              : "border-[#d6a84f]/25 bg-gradient-to-br from-[#76551f] to-[#4f3a17]"
          }`}
        >

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs text-white/55">
                الرصيد الحالي
              </p>

              <p
                className={`mt-2 text-3xl font-black ${
                  isNegative
                    ? "text-red-400"
                    : "text-white"
                }`}
              >
                {formatMoney(balance)}
              </p>

              <p className="mt-2 text-[10px] text-white/35">
                اضغط لعرض التفاصيل المالية
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/20">
              <Wallet
                size={20}
                strokeWidth={1.7}
              />
            </div>

          </div>

        </button>

        {/* =========================
            NEGATIVE BALANCE
        ========================= */}

        {isNegative && (
          <div className="mb-4 rounded-2xl border border-red-500/15 bg-red-500/5 p-4">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                !
              </div>

              <div>

                <p className="text-sm font-bold text-red-400">
                  رصيدك صار سالب
                </p>

                <p className="mt-1 text-[10px] text-white/35">
                  يرجى متابعة رصيدك وتسوية المبلغ المستحق.
                </p>

              </div>

            </div>

          </div>
        )}

        {/* =========================
            WEEK SUMMARY
        ========================= */}

        <section className="mb-4 rounded-[24px] border border-white/8 bg-[#12151a] p-5">

          <div className="mb-4 flex items-center justify-between">

            <div>
              <p className="text-[10px] text-white/35">
                ملخص الأسبوع
              </p>

              <h2 className="mt-1 text-sm font-bold">
                نشاطك الحالي
              </h2>
            </div>

            <button
              onClick={() => goTo("/weeks")}
              className="flex items-center gap-1 rounded-xl bg-[#d6a84f]/10 px-3 py-2 text-[10px] font-bold text-[#d6a84f]"
            >
              التفاصيل
              <ChevronLeft size={13} />
            </button>

          </div>

          <div className="grid grid-cols-2 gap-3">

            <SummaryItem
              title="الإنتاج"
              value={formatMoney(producedTotal)}
              count={`${producedCount} طلب`}
              positive
            />

            <SummaryItem
              title="الاستهلاك"
              value={formatMoney(consumedTotal)}
              count={`${consumedCount} طلب`}
            />

          </div>

        </section>

        {/* =========================
            CURRENT WEEK
        ========================= */}

        {data.currentWeek && (
          <button
            onClick={() => goTo("/weeks")}
            className="mb-4 flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#12151a] p-4 text-right"
          >

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
                <CalendarDays
                  size={17}
                  strokeWidth={1.7}
                />
              </div>

              <div>

                <p className="text-[10px] text-white/30">
                  الأسبوع الحالي
                </p>

                <p className="mt-1 text-xs font-semibold">
                  {formatDate(
                    data.currentWeek.start_at
                  )}
                  {" — "}
                  {formatDate(
                    data.currentWeek.end_at
                  )}
                </p>

              </div>

            </div>

            <ChevronLeft
              size={16}
              className="text-white/25"
            />

          </button>
        )}

        {/* =========================
            SMALL QUICK ACTIONS
        ========================= */}

        <section>

          <div className="mb-3">

            <h2 className="text-sm font-bold">
              خدمات سريعة
            </h2>

          </div>

          <div className="grid grid-cols-2 gap-2">

            <SmallAction
              icon={
                <PlusCircle
                  size={17}
                  strokeWidth={1.8}
                />
              }
              title="طلب شحن"
              onClick={() =>
                goTo("/finance/topup")
              }
            />

            <SmallAction
              icon={
                <ArrowDownToLine
                  size={17}
                  strokeWidth={1.8}
                />
              }
              title="طلب سحب"
              onClick={() =>
                goTo("/finance/withdraw")
              }
            />

          </div>

        </section>

      </div>
    </main>
  );
}

/* =========================
   MENU ITEM
========================= */

function MenuItem({
  icon,
  title,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
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
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
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

      <ChevronLeft
        size={14}
        className="text-white/20"
      />

    </button>
  );
}

/* =========================
   SUMMARY ITEM
========================= */

function SummaryItem({
  title,
  value,
  count,
  positive,
}: {
  title: string;
  value: string;
  count: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.025] p-4">

      <div className="flex items-center justify-between">

        <p className="text-[10px] text-white/35">
          {title}
        </p>

        <span
          className={`text-sm font-bold ${
            positive
              ? "text-emerald-400"
              : "text-white/40"
          }`}
        >
          {positive ? "+" : "−"}
        </span>

      </div>

      <p
        className={`mt-2 text-base font-black ${
          positive
            ? "text-emerald-400"
            : "text-white"
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-[9px] text-white/25">
        {count}
      </p>

    </div>
  );
}

/* =========================
   SMALL ACTION
========================= */

function SmallAction({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#12151a] p-4 text-right transition active:scale-[0.98] hover:border-[#d6a84f]/25"
    >

      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
        {icon}
      </span>

      <span className="text-xs font-semibold text-white/65">
        {title}
      </span>

    </button>
  );
}