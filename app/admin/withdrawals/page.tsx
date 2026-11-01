"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Menu,
  X,
  Home,
  Users,
  ClipboardList,
  ArrowUpCircle,
  ArrowDownCircle,
  Activity,
  CalendarDays,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ShieldCheck,
  RefreshCw,
  Clock3,
  CircleCheck,
  CircleX,
  Wallet,
  UserRound,
  FileText,
  AlertCircle,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    phone: string;
    balance: number;
  } | null;
};

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadWithdrawals() {
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

      const response = await fetch("/api/admin/withdrawals", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "تعذر تحميل طلبات السحب."
        );
        return;
      }

      setWithdrawals(data.requests || []);
    } catch (err) {
      console.error("ADMIN WITHDRAWALS ERROR:", err);

      setError(
        "حدث خطأ أثناء تحميل طلبات السحب."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWithdrawals();
  }, []);

  async function handleAction(
    requestId: string,
    action: "approve" | "reject"
  ) {
    const withdrawal = withdrawals.find(
      (item) => item.id === requestId
    );

    if (!withdrawal) return;

    const actionText =
      action === "approve"
        ? "الموافقة على"
        : "رفض";

    const confirmed = window.confirm(
      `هل أنت متأكد من ${actionText} طلب السحب بقيمة ${Number(
        withdrawal.amount
      ).toFixed(2)} د.أ؟`
    );

    if (!confirmed) return;

    try {
      setProcessingId(requestId);
      setMessage("");
      setError("");

      const token = await getToken();

      if (!token) {
        setError(
          "انتهت جلسة الدخول، يرجى تسجيل الدخول مرة أخرى."
        );
        return;
      }

      const response = await fetch(
        "/api/admin/withdrawals",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            requestId,
            action,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "تعذر معالجة الطلب."
        );
        return;
      }

      setMessage(
        data.message ||
          "تمت معالجة الطلب بنجاح."
      );

      await loadWithdrawals();
    } catch (err) {
      console.error("WITHDRAWAL ACTION ERROR:", err);

      setError(
        "حدث خطأ أثناء معالجة الطلب."
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function logout() {
    setMenuOpen(false);

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

  function formatDate(date: string) {
    return new Date(date).toLocaleString(
      "ar-JO",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Amman",
      }
    );
  }

  function formatMoney(value: number) {
    return `${Number(value || 0).toFixed(2)} د.أ`;
  }

  function getStatus(status: Withdrawal["status"]) {
    if (status === "pending") {
      return {
        text: "قيد المراجعة",
        className:
          "border-[#d6a84f]/20 bg-[#d6a84f]/10 text-[#d6a84f]",
        icon: (
          <Clock3
            size={13}
            strokeWidth={1.8}
          />
        ),
      };
    }

    if (status === "approved") {
      return {
        text: "مقبول",
        className:
          "border-emerald-400/15 bg-emerald-400/10 text-emerald-400",
        icon: (
          <CircleCheck
            size={13}
            strokeWidth={1.8}
          />
        ),
      };
    }

    return {
      text: "مرفوض",
      className:
        "border-red-400/15 bg-red-400/10 text-red-400",
      icon: (
        <CircleX
          size={13}
          strokeWidth={1.8}
        />
      ),
    };
  }

  const pendingCount = withdrawals.filter(
    (item) => item.status === "pending"
  ).length;

  const approvedCount = withdrawals.filter(
    (item) => item.status === "approved"
  ).length;

  const rejectedCount = withdrawals.filter(
    (item) => item.status === "rejected"
  ).length;

  const totalPending = withdrawals
    .filter((item) => item.status === "pending")
    .reduce(
      (sum, item) =>
        sum + Number(item.amount || 0),
      0
    );

  const filteredWithdrawals =
    selectedStatus === "all"
      ? withdrawals
      : withdrawals.filter(
          (item) =>
            item.status === selectedStatus
        );

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#0b0d10] text-white"
    >
      {/* =====================================================
          OVERLAY
      ===================================================== */}

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* =====================================================
          SIDE MENU
      ===================================================== */}

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
                onClick={() =>
                  setMenuOpen(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                <X
                  size={18}
                  strokeWidth={1.8}
                />
              </button>

            </div>

            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/7 bg-white/[0.025] p-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d6a84f]/10 text-[#d6a84f]">
                <UserRound
                  size={18}
                  strokeWidth={1.7}
                />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  مدير النظام
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                  <span className="text-[10px] text-white/30">
                    حساب إداري
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Menu */}

          <div className="flex-1 overflow-y-auto p-3">

            <MenuItem
              icon={
                <Home
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="الرئيسية"
              onClick={() =>
                goTo("/admin")
              }
            />

            <MenuItem
              icon={
                <Users
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="المستخدمون"
              onClick={() =>
                goTo("/admin/users")
              }
            />

            <MenuItem
              icon={
                <ClipboardList
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="الطلبات"
              onClick={() =>
                goTo("/admin/orders")
              }
            />

            <MenuItem
              icon={
                <ArrowUpCircle
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="طلبات الشحن"
              onClick={() =>
                goTo("/admin/topups")
              }
            />

            <MenuItem
              icon={
                <ArrowDownCircle
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="طلبات السحب"
              active
              badge={pendingCount}
              onClick={() =>
                goTo("/admin/withdrawals")
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
              onClick={() =>
                goTo("/admin/weeks")
              }
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

              <span>
                تسجيل الخروج
              </span>
            </button>

          </div>

        </div>
      </aside>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <div className="mx-auto min-h-screen max-w-6xl px-4 pb-8 pt-4 sm:px-6">

        {/* Header */}

        <header className="mb-5 flex items-center justify-between">

          <button
            onClick={() =>
              setMenuOpen(true)
            }
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
              طلبات السحب
            </p>

          </div>

          <button
            onClick={loadWithdrawals}
            disabled={loading}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#12151a] text-white/60 transition hover:border-[#d6a84f]/30 hover:text-[#d6a84f] disabled:opacity-50"
          >
            <RefreshCw
              size={18}
              strokeWidth={1.8}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />
          </button>

        </header>

        {/* Page Intro */}

        <section className="mb-4 rounded-[26px] border border-white/10 bg-gradient-to-br from-[#171a20] to-[#101216] p-5">

          <div className="flex items-center gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#d6a84f]/25 bg-[#d6a84f]/10 text-[#d6a84f]">
              <ArrowDownCircle
                size={22}
                strokeWidth={1.7}
              />
            </div>

            <div className="min-w-0">

              <h2 className="text-lg font-bold">
                طلبات السحب
              </h2>

              <p className="mt-1 text-[11px] leading-5 text-white/35">
                مراجعة طلبات سحب الرصيد
                واتخاذ الإجراء المناسب.
              </p>

            </div>

          </div>

        </section>

        {/* Messages */}

        {message && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-sm text-emerald-400">

            <CircleCheck
              size={18}
              className="mt-0.5 shrink-0"
              strokeWidth={1.8}
            />

            <span>
              {message}
            </span>

          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-sm text-red-400">

            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
              strokeWidth={1.8}
            />

            <span>
              {error}
            </span>

          </div>
        )}

        {/* Stats */}

        <section className="mb-5 grid grid-cols-2 gap-3">

          <StatCard
            title="قيد المراجعة"
            value={pendingCount}
            subtitle="طلبات معلقة"
            icon={
              <Clock3
                size={18}
                strokeWidth={1.8}
              />
            }
            highlight={
              pendingCount > 0
            }
          />

          <StatCard
            title="المبالغ المعلقة"
            value={formatMoney(
              totalPending
            )}
            subtitle="إجمالي السحب"
            icon={
              <Wallet
                size={18}
                strokeWidth={1.8}
              />
            }
            highlight={
              totalPending > 0
            }
          />

          <StatCard
            title="مقبول"
            value={approvedCount}
            subtitle="طلبات تمت الموافقة عليها"
            icon={
              <CircleCheck
                size={18}
                strokeWidth={1.8}
              />
            }
          />

          <StatCard
            title="مرفوض"
            value={rejectedCount}
            subtitle="طلبات مرفوضة"
            icon={
              <CircleX
                size={18}
                strokeWidth={1.8}
              />
            }
          />

        </section>

        {/* Filters */}

        <section className="mb-4">

          <div className="mb-3">

            <h2 className="text-sm font-bold">
              الطلبات
            </h2>

            <p className="mt-1 text-[11px] text-white/35">
              اختر الحالة لعرض الطلبات
            </p>

          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

            <FilterButton
              title="الكل"
              count={withdrawals.length}
              active={
                selectedStatus === "all"
              }
              onClick={() =>
                setSelectedStatus("all")
              }
            />

            <FilterButton
              title="معلقة"
              count={pendingCount}
              active={
                selectedStatus === "pending"
              }
              onClick={() =>
                setSelectedStatus("pending")
              }
            />

            <FilterButton
              title="مقبولة"
              count={approvedCount}
              active={
                selectedStatus === "approved"
              }
              onClick={() =>
                setSelectedStatus("approved")
              }
            />

            <FilterButton
              title="مرفوضة"
              count={rejectedCount}
              active={
                selectedStatus === "rejected"
              }
              onClick={() =>
                setSelectedStatus("rejected")
              }
            />

          </div>

        </section>

        {/* Content */}

        <section className="overflow-hidden rounded-[26px] border border-white/10 bg-[#12151a]">

          {loading ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">

              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d6a84f]/10 text-[#d6a84f]">
                <RefreshCw
                  size={21}
                  className="animate-spin"
                  strokeWidth={1.8}
                />
              </div>

              <p className="text-sm text-white/45">
                جاري تحميل طلبات السحب...
              </p>

            </div>
          ) : filteredWithdrawals.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* =================================================
                  MOBILE
              ================================================= */}

              <div className="divide-y divide-white/5 sm:hidden">

                {filteredWithdrawals.map(
                  (withdrawal) => (
                    <WithdrawalMobileCard
                      key={withdrawal.id}
                      withdrawal={withdrawal}
                      processingId={
                        processingId
                      }
                      handleAction={
                        handleAction
                      }
                      formatDate={
                        formatDate
                      }
                      formatMoney={
                        formatMoney
                      }
                      getStatus={
                        getStatus
                      }
                    />
                  )
                )}

              </div>

              {/* =================================================
                  DESKTOP
              ================================================= */}

              <div className="hidden overflow-x-auto sm:block">

                <table className="w-full min-w-[950px] border-collapse">

                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02]">

                      <th className={thClass}>
                        المستخدم
                      </th>

                      <th className={thClass}>
                        المبلغ
                      </th>

                      <th className={thClass}>
                        الرصيد الحالي
                      </th>

                      <th className={thClass}>
                        الملاحظات
                      </th>

                      <th className={thClass}>
                        التاريخ
                      </th>

                      <th className={thClass}>
                        الحالة
                      </th>

                      <th className={thClass}>
                        الإجراء
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {filteredWithdrawals.map(
                      (withdrawal) => {
                        const status =
                          getStatus(
                            withdrawal.status
                          );

                        return (
                          <tr
                            key={
                              withdrawal.id
                            }
                            className="border-b border-white/5 transition hover:bg-white/[0.02]"
                          >

                            <td className={tdClass}>

                              <div className="flex items-center gap-3">

                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d6a84f]/10 text-[#d6a84f]">
                                  <UserRound
                                    size={16}
                                    strokeWidth={
                                      1.7
                                    }
                                  />
                                </div>

                                <div className="min-w-0">

                                  <p className="truncate text-sm font-semibold text-white">
                                    {withdrawal
                                      .user
                                      ?.full_name ||
                                      "مستخدم غير معروف"}
                                  </p>

                                  <p
                                    className="mt-1 text-[10px] text-white/30"
                                    dir="ltr"
                                  >
                                    {withdrawal
                                      .user
                                      ?.phone ||
                                      "-"}
                                  </p>

                                </div>

                              </div>

                            </td>

                            <td className={tdClass}>

                              <span className="text-base font-black text-[#d6a84f]">
                                {Number(
                                  withdrawal.amount
                                ).toFixed(2)}
                              </span>

                              <span className="mr-1 text-xs text-white/35">
                                د.أ
                              </span>

                            </td>

                            <td className={tdClass}>

                              <span
                                className={`font-semibold ${
                                  Number(
                                    withdrawal
                                      .user
                                      ?.balance ||
                                      0
                                  ) < 0
                                    ? "text-red-400"
                                    : "text-white/75"
                                }`}
                              >
                                {formatMoney(
                                  Number(
                                    withdrawal
                                      .user
                                      ?.balance ||
                                      0
                                  )
                                )}
                              </span>

                            </td>

                            <td className={tdClass}>

                              <div className="flex max-w-[180px] items-center gap-2">

                                <FileText
                                  size={14}
                                  className="shrink-0 text-white/20"
                                  strokeWidth={1.7}
                                />

                                <span className="truncate text-xs text-white/45">
                                  {withdrawal
                                    .notes ||
                                    "-"}
                                </span>

                              </div>

                            </td>

                            <td className={tdClass}>

                              <span className="whitespace-nowrap text-xs text-white/40">
                                {formatDate(
                                  withdrawal.created_at
                                )}
                              </span>

                            </td>

                            <td className={tdClass}>

                              <StatusBadge
                                status={
                                  withdrawal.status
                                }
                                getStatus={
                                  getStatus
                                }
                              />

                            </td>

                            <td className={tdClass}>

                              {withdrawal.status ===
                              "pending" ? (
                                <div className="flex gap-2">

                                  <ActionButton
                                    type="approve"
                                    loading={
                                      processingId ===
                                      withdrawal.id
                                    }
                                    onClick={() =>
                                      handleAction(
                                        withdrawal.id,
                                        "approve"
                                      )
                                    }
                                  />

                                  <ActionButton
                                    type="reject"
                                    loading={
                                      processingId ===
                                      withdrawal.id
                                    }
                                    onClick={() =>
                                      handleAction(
                                        withdrawal.id,
                                        "reject"
                                      )
                                    }
                                  />

                                </div>
                              ) : (
                                <span className="text-xs text-white/20">
                                  تمت المعالجة
                                </span>
                              )}

                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>
            </>
          )}

        </section>

        {/* Footer */}

        {!loading &&
          withdrawals.length > 0 && (
            <div className="mt-4 text-center text-[10px] text-white/20">
              عرض {filteredWithdrawals.length} من{" "}
              {withdrawals.length} طلب
            </div>
          )}

      </div>
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
  icon: ReactNode;
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
  highlight,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-[22px] border bg-[#12151a] p-4 ${
        highlight
          ? "border-[#d6a84f]/25"
          : "border-white/8"
      }`}
    >

      <div className="flex items-start justify-between">

        <div className="min-w-0">

          <p className="text-[11px] text-white/40">
            {title}
          </p>

          <p className="mt-2 truncate text-xl font-black">
            {value}
          </p>

          <p className="mt-1 text-[10px] text-white/30">
            {subtitle}
          </p>

        </div>

        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            highlight
              ? "bg-[#d6a84f]/10 text-[#d6a84f]"
              : "bg-white/[0.04] text-white/45"
          }`}
        >
          {icon}
        </span>

      </div>

    </div>
  );
}

/* =========================================================
   FILTER BUTTON
========================================================= */

function FilterButton({
  title,
  count,
  active,
  onClick,
}: {
  title: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-right transition active:scale-[0.98] ${
        active
          ? "border-[#d6a84f]/30 bg-[#d6a84f]/10 text-[#d6a84f]"
          : "border-white/7 bg-[#12151a] text-white/45 hover:border-white/15 hover:text-white"
      }`}
    >

      <span className="text-xs font-semibold">
        {title}
      </span>

      <span
        className={`flex h-6 min-w-6 items-center justify-center rounded-lg px-1.5 text-[9px] font-bold ${
          active
            ? "bg-[#d6a84f]/15 text-[#d6a84f]"
            : "bg-white/5 text-white/30"
        }`}
      >
        {count}
      </span>

    </button>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
  getStatus,
}: {
  status: Withdrawal["status"];
  getStatus: (
    status: Withdrawal["status"]
  ) => {
    text: string;
    className: string;
    icon: ReactNode;
  };
}) {
  const data = getStatus(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold ${data.className}`}
    >
      {data.icon}
      {data.text}
    </span>
  );
}

/* =========================================================
   ACTION BUTTON
========================================================= */

function ActionButton({
  type,
  loading,
  onClick,
}: {
  type: "approve" | "reject";
  loading: boolean;
  onClick: () => void;
}) {
  const approve = type === "approve";

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        approve
          ? "border border-emerald-400/15 bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/15"
          : "border border-red-400/15 bg-red-400/10 text-red-400 hover:bg-red-400/15"
      }`}
    >
      {loading ? (
        <RefreshCw
          size={13}
          className="animate-spin"
          strokeWidth={1.8}
        />
      ) : approve ? (
        <CircleCheck
          size={13}
          strokeWidth={1.8}
        />
      ) : (
        <CircleX
          size={13}
          strokeWidth={1.8}
        />
      )}

      {loading
        ? "جاري..."
        : approve
        ? "موافقة"
        : "رفض"}
    </button>
  );
}

/* =========================================================
   MOBILE CARD
========================================================= */

function WithdrawalMobileCard({
  withdrawal,
  processingId,
  handleAction,
  formatDate,
  formatMoney,
  getStatus,
}: {
  withdrawal: Withdrawal;
  processingId: string | null;
  handleAction: (
    id: string,
    action: "approve" | "reject"
  ) => void;
  formatDate: (date: string) => string;
  formatMoney: (value: number) => string;
  getStatus: (
    status: Withdrawal["status"]
  ) => {
    text: string;
    className: string;
    icon: ReactNode;
  };
}) {
  const status = getStatus(
    withdrawal.status
  );

  const isProcessing =
    processingId === withdrawal.id;

  return (
    <div className="p-4">

      <div className="flex items-start justify-between gap-3">

        <div className="flex min-w-0 items-center gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d6a84f]/10 text-[#d6a84f]">
            <UserRound
              size={17}
              strokeWidth={1.7}
            />
          </div>

          <div className="min-w-0">

            <p className="truncate text-sm font-bold">
              {withdrawal.user
                ?.full_name ||
                "مستخدم غير معروف"}
            </p>

            <p
              className="mt-1 text-[10px] text-white/30"
              dir="ltr"
            >
              {withdrawal.user?.phone ||
                "-"}
            </p>

          </div>

        </div>

        <StatusBadge
          status={withdrawal.status}
          getStatus={getStatus}
        />

      </div>

      <div className="mt-4 rounded-2xl border border-white/5 bg-[#181b20] p-3">

        <div className="flex items-center justify-between">

          <div>
            <p className="text-[10px] text-white/30">
              مبلغ السحب
            </p>

            <p className="mt-1 text-xl font-black text-[#d6a84f]">
              {Number(
                withdrawal.amount
              ).toFixed(2)}{" "}
              <span className="text-xs text-white/35">
                د.أ
              </span>
            </p>
          </div>

          <div className="text-left">

            <p className="text-[10px] text-white/30">
              الرصيد الحالي
            </p>

            <p
              className={`mt-1 text-sm font-bold ${
                Number(
                  withdrawal.user
                    ?.balance || 0
                ) < 0
                  ? "text-red-400"
                  : "text-white/70"
              }`}
            >
              {formatMoney(
                Number(
                  withdrawal.user
                    ?.balance || 0
                )
              )}
            </p>

          </div>

        </div>

      </div>

      <div className="mt-3 flex items-center gap-2 text-[10px] text-white/30">

        <CalendarDays
          size={13}
          strokeWidth={1.7}
        />

        <span>
          {formatDate(
            withdrawal.created_at
          )}
        </span>

      </div>

      {withdrawal.notes && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-white/[0.025] p-3">

          <FileText
            size={14}
            className="mt-0.5 shrink-0 text-white/25"
            strokeWidth={1.7}
          />

          <p className="text-[10px] leading-5 text-white/40">
            {withdrawal.notes}
          </p>

        </div>
      )}

      {withdrawal.status ===
        "pending" && (
        <div className="mt-4 grid grid-cols-2 gap-2">

          <button
            onClick={() =>
              handleAction(
                withdrawal.id,
                "approve"
              )
            }
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/10 py-3 text-xs font-bold text-emerald-400 transition hover:bg-emerald-400/15 disabled:opacity-40"
          >

            {isProcessing ? (
              <RefreshCw
                size={15}
                className="animate-spin"
                strokeWidth={1.8}
              />
            ) : (
              <CircleCheck
                size={15}
                strokeWidth={1.8}
              />
            )}

            {isProcessing
              ? "جاري..."
              : "موافقة"}

          </button>

          <button
            onClick={() =>
              handleAction(
                withdrawal.id,
                "reject"
              )
            }
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 rounded-xl border border-red-400/15 bg-red-400/10 py-3 text-xs font-bold text-red-400 transition hover:bg-red-400/15 disabled:opacity-40"
          >

            {isProcessing ? (
              <RefreshCw
                size={15}
                className="animate-spin"
                strokeWidth={1.8}
              />
            ) : (
              <CircleX
                size={15}
                strokeWidth={1.8}
              />
            )}

            {isProcessing
              ? "جاري..."
              : "رفض"}

          </button>

        </div>
      )}

    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">

      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d6a84f]/10 text-[#d6a84f]">
        <ArrowDownCircle
          size={25}
          strokeWidth={1.6}
        />
      </div>

      <h2 className="text-base font-bold">
        لا توجد طلبات سحب
      </h2>

      <p className="mt-2 max-w-sm text-xs leading-5 text-white/30">
        عندما يقوم أحد المستخدمين
        بطلب سحب سيظهر الطلب هنا.
      </p>

    </div>
  );
}

/* =========================================================
   TABLE CLASSES
========================================================= */

const thClass =
  "px-4 py-4 text-right text-[10px] font-bold text-white/35 whitespace-nowrap";

const tdClass =
  "px-4 py-4 align-middle";