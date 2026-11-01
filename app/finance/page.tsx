"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowRight,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  History,
  Clock3,
  CircleCheck,
  CircleX,
  AlertCircle,
  RefreshCw,
  FileText,
  Banknote,
  Building2,
  Smartphone,
  ChevronLeft,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Transaction = {
  id: string;
  transaction_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  created_at: string;
};

type TopupRequest = {
  id: string;
  amount: number;
  payment_method: string;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type WithdrawalRequest = {
  id: string;
  amount: number;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type User = {
  id: string;
  full_name: string;
  phone: string;
  balance: number;
};

export default function FinancePage() {
  const [user, setUser] =
    useState<User | null>(null);

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [topups, setTopups] =
    useState<TopupRequest[]>([]);

  const [withdrawals, setWithdrawals] =
    useState<WithdrawalRequest[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function loadFinance() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session) {
        setError(
          "انتهت جلسة الدخول، يرجى تسجيل الدخول مرة أخرى."
        );
        return;
      }

      const token =
        session.access_token;

      const meResponse = await fetch(
        "/api/auth/me",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const meResult =
        await meResponse.json();

      if (!meResponse.ok) {
        setError(
          meResult.error ||
            "تعذر تحميل بيانات الحساب."
        );
        return;
      }

      setUser(meResult.user);

      const [
        transactionsResponse,
        topupsResponse,
        withdrawalsResponse,
      ] = await Promise.all([
        supabase
          .from("transactions")
          .select(
            "id, transaction_type, amount, balance_before, balance_after, description, created_at"
          )
          .eq(
            "user_id",
            meResult.user.id
          )
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("topup_requests")
          .select(
            "id, amount, payment_method, notes, status, created_at"
          )
          .eq(
            "user_id",
            meResult.user.id
          )
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("withdrawal_requests")
          .select(
            "id, amount, notes, status, created_at"
          )
          .eq(
            "user_id",
            meResult.user.id
          )
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (transactionsResponse.error) {
        console.error(
          "TRANSACTIONS ERROR:",
          transactionsResponse.error
        );
      }

      if (topupsResponse.error) {
        console.error(
          "TOPUPS ERROR:",
          topupsResponse.error
        );
      }

      if (withdrawalsResponse.error) {
        console.error(
          "WITHDRAWALS ERROR:",
          withdrawalsResponse.error
        );
      }

      setTransactions(
        transactionsResponse.data || []
      );

      setTopups(
        topupsResponse.data || []
      );

      setWithdrawals(
        withdrawalsResponse.data || []
      );
    } catch (err) {
      console.error(
        "FINANCE ERROR:",
        err
      );

      setError(
        "حدث خطأ أثناء تحميل البيانات المالية."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFinance();
  }, []);

  function formatDate(date: string) {
    return new Date(
      date
    ).toLocaleString("ar-JO", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Amman",
    });
  }

  function formatMoney(value: number) {
    return `${Number(value || 0).toFixed(
      2
    )} د.أ`;
  }

  function getStatus(status: string) {
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

  function getPaymentMethod(
    method: string
  ) {
    if (method === "cash")
      return {
        text: "كاش",
        icon: (
          <Banknote
            size={14}
            strokeWidth={1.7}
          />
        ),
      };

    if (method === "bank_transfer")
      return {
        text: "تحويل بنكي",
        icon: (
          <Building2
            size={14}
            strokeWidth={1.7}
          />
        ),
      };

    if (method === "wallet")
      return {
        text: "محفظة إلكترونية",
        icon: (
          <Smartphone
            size={14}
            strokeWidth={1.7}
          />
        ),
      };

    return {
      text: method,
      icon: (
        <Wallet
          size={14}
          strokeWidth={1.7}
        />
      ),
    };
  }

  function getTransactionType(
    type: string
  ) {
    if (type === "topup")
      return "شحن رصيد";

    if (type === "withdrawal")
      return "سحب رصيد";

    if (type === "commission")
      return "عمولة";

    if (type === "floor")
      return "أرضية أسبوعية";

    if (type === "order")
      return "طلب";

    if (type === "refund")
      return "استرجاع";

    return type;
  }

  const pendingTopups =
    topups.filter(
      (item) =>
        item.status === "pending"
    ).length;

  const approvedTopups =
    topups.filter(
      (item) =>
        item.status === "approved"
    ).length;

  const rejectedTopups =
    topups.filter(
      (item) =>
        item.status === "rejected"
    ).length;

  const pendingWithdrawals =
    withdrawals.filter(
      (item) =>
        item.status === "pending"
    ).length;

  const approvedWithdrawals =
    withdrawals.filter(
      (item) =>
        item.status === "approved"
    ).length;

  const rejectedWithdrawals =
    withdrawals.filter(
      (item) =>
        item.status === "rejected"
    ).length;

  const balance =
    Number(user?.balance || 0);

  if (loading) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#0b0d10] text-white"
      >
        <div className="flex flex-col items-center text-center">

          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d6a84f]/20 bg-[#d6a84f]/10 text-[#d6a84f]">
            <RefreshCw
              size={24}
              className="animate-spin"
              strokeWidth={1.7}
            />
          </div>

          <p className="text-sm text-white/40">
            جاري تحميل البيانات المالية...
          </p>

        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#0b0d10] text-white"
    >
      <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-5 sm:px-6">

        {/* Header */}

        <header className="mb-6 flex items-center justify-between">

          <Link
            href="/dashboard"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#12151a] text-white/55 transition hover:border-[#d6a84f]/30 hover:text-[#d6a84f]"
          >
            <ArrowRight
              size={19}
              strokeWidth={1.8}
            />
          </Link>

          <div className="text-center">

            <h1 className="text-lg font-black tracking-wide text-[#d6a84f]">
              أهل القمة
            </h1>

            <p className="mt-0.5 text-[11px] text-white/35">
              المالية
            </p>

          </div>

          <button
            onClick={loadFinance}
            disabled={loading}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#12151a] text-white/55 transition hover:border-[#d6a84f]/30 hover:text-[#d6a84f]"
          >
            <RefreshCw
              size={18}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
              strokeWidth={1.8}
            />
          </button>

        </header>

        {/* Error */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs leading-5 text-red-400">

            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
              strokeWidth={1.8}
            />

            <span>{error}</span>

          </div>
        )}

        {/* Balance */}

        <section
          className={`relative mb-4 overflow-hidden rounded-[28px] border p-5 sm:p-7 ${
            balance < 0
              ? "border-red-400/20 bg-gradient-to-br from-[#1d1517] to-[#121317]"
              : "border-[#d6a84f]/20 bg-gradient-to-br from-[#191817] to-[#121317]"
          }`}
        >

          <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-[#d6a84f]/5 blur-3xl" />

          <div className="relative">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d6a84f]/20 bg-[#d6a84f]/10 text-[#d6a84f]">
                <Wallet
                  size={21}
                  strokeWidth={1.7}
                />
              </div>

              <div>

                <p className="text-xs text-white/40">
                  الرصيد الحالي
                </p>

                <p className="mt-0.5 text-[10px] text-white/20">
                  {user?.full_name || ""}
                </p>

              </div>

            </div>

            <div className="mt-5 flex items-end gap-2">

              <span
                dir="ltr"
                className={`text-4xl font-black tracking-tight sm:text-5xl ${
                  balance < 0
                    ? "text-red-400"
                    : "text-white"
                }`}
              >
                {balance.toFixed(2)}
              </span>

              <span className="mb-1.5 text-sm font-bold text-[#d6a84f]">
                د.أ
              </span>

            </div>

            {balance < 0 && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-xs font-bold text-red-400">

                <AlertCircle
                  size={16}
                  strokeWidth={1.8}
                />

                رصيدك صار سالب. يرجى شحن الرصيد.

              </div>
            )}

          </div>

        </section>

        {/* Quick Actions */}

        <section className="mb-5 grid grid-cols-2 gap-3">

          <Link
            href="/finance/topup"
            className="group rounded-[22px] border border-white/8 bg-[#12151a] p-4 transition hover:border-[#d6a84f]/25 hover:bg-[#15181d]"
          >

            <div className="flex items-center justify-between">

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
                <ArrowUpCircle
                  size={19}
                  strokeWidth={1.7}
                />
              </span>

              <ChevronLeft
                size={15}
                className="text-white/20 transition group-hover:text-[#d6a84f]"
              />

            </div>

            <p className="mt-4 text-sm font-bold">
              شحن الرصيد
            </p>

            <p className="mt-1 text-[10px] text-white/30">
              إرسال طلب شحن جديد
            </p>

          </Link>

          <Link
            href="/finance/withdraw"
            className="group rounded-[22px] border border-white/8 bg-[#12151a] p-4 transition hover:border-[#d6a84f]/25 hover:bg-[#15181d]"
          >

            <div className="flex items-center justify-between">

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-white/55">
                <ArrowDownCircle
                  size={19}
                  strokeWidth={1.7}
                />
              </span>

              <ChevronLeft
                size={15}
                className="text-white/20 transition group-hover:text-[#d6a84f]"
              />

            </div>

            <p className="mt-4 text-sm font-bold">
              سحب الرصيد
            </p>

            <p className="mt-1 text-[10px] text-white/30">
              إرسال طلب سحب جديد
            </p>

          </Link>

        </section>

        {/* Summary */}

        <section className="mb-5">

          <div className="mb-3">

            <h2 className="text-sm font-bold">
              ملخص الطلبات
            </h2>

            <p className="mt-1 text-[10px] text-white/25">
              حالة طلباتك المالية
            </p>

          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">

            <SummaryCard
              title="شحن معلق"
              value={pendingTopups}
              icon={
                <Clock3
                  size={17}
                  strokeWidth={1.8}
                />
              }
              highlight={
                pendingTopups > 0
              }
            />

            <SummaryCard
              title="شحن مقبول"
              value={approvedTopups}
              icon={
                <CircleCheck
                  size={17}
                  strokeWidth={1.8}
                />
              }
            />

            <SummaryCard
              title="شحن مرفوض"
              value={rejectedTopups}
              icon={
                <CircleX
                  size={17}
                  strokeWidth={1.8}
                />
              }
            />

            <SummaryCard
              title="سحب معلق"
              value={pendingWithdrawals}
              icon={
                <Clock3
                  size={17}
                  strokeWidth={1.8}
                />
              }
              highlight={
                pendingWithdrawals > 0
              }
            />

            <SummaryCard
              title="سحب مقبول"
              value={approvedWithdrawals}
              icon={
                <CircleCheck
                  size={17}
                  strokeWidth={1.8}
                />
              }
            />

            <SummaryCard
              title="سحب مرفوض"
              value={rejectedWithdrawals}
              icon={
                <CircleX
                  size={17}
                  strokeWidth={1.8}
                />
              }
            />

          </div>

        </section>

        {/* Withdrawal Requests */}

        <FinanceSection
          title="طلبات السحب"
          subtitle="جميع طلبات سحب الرصيد"
          icon={
            <ArrowDownCircle
              size={19}
              strokeWidth={1.7}
            />
          }
          count={withdrawals.length}
        >

          {withdrawals.length === 0 ? (
            <EmptyState text="لا توجد طلبات سحب حتى الآن." />
          ) : (
            <div className="space-y-2">

              {withdrawals.map(
                (withdrawal) => {
                  const status =
                    getStatus(
                      withdrawal.status
                    );

                  return (
                    <div
                      key={withdrawal.id}
                      className="rounded-2xl border border-white/6 bg-[#181b20] p-4"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <p className="text-lg font-black text-white">
                            {Number(
                              withdrawal.amount
                            ).toFixed(2)}{" "}
                            <span className="text-xs text-[#d6a84f]">
                              د.أ
                            </span>
                          </p>

                          <p className="mt-1 text-[10px] text-white/25">
                            {formatDate(
                              withdrawal.created_at
                            )}
                          </p>

                        </div>

                        <StatusBadge
                          status={
                            withdrawal.status
                          }
                          getStatus={
                            getStatus
                          }
                        />

                      </div>

                      {withdrawal.notes && (
                        <div className="mt-3 flex items-start gap-2 border-t border-white/5 pt-3">

                          <FileText
                            size={14}
                            className="mt-0.5 shrink-0 text-white/20"
                            strokeWidth={1.7}
                          />

                          <p className="text-[10px] leading-5 text-white/35">
                            {withdrawal.notes}
                          </p>

                        </div>
                      )}

                    </div>
                  );
                }
              )}

            </div>
          )}

        </FinanceSection>

        {/* Topup Requests */}

        <FinanceSection
          title="طلبات الشحن"
          subtitle="حالة جميع طلبات شحن الرصيد"
          icon={
            <ArrowUpCircle
              size={19}
              strokeWidth={1.7}
            />
          }
          count={topups.length}
        >

          {topups.length === 0 ? (
            <EmptyState text="لا توجد طلبات شحن حتى الآن." />
          ) : (
            <div className="space-y-2">

              {topups.map((topup) => {
                const status =
                  getStatus(
                    topup.status
                  );

                const method =
                  getPaymentMethod(
                    topup.payment_method
                  );

                return (
                  <div
                    key={topup.id}
                    className="rounded-2xl border border-white/6 bg-[#181b20] p-4"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div>

                        <p className="text-lg font-black text-white">
                          {Number(
                            topup.amount
                          ).toFixed(2)}{" "}
                          <span className="text-xs text-[#d6a84f]">
                            د.أ
                          </span>
                        </p>

                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-white/30">

                          {method.icon}

                          <span>
                            {method.text}
                          </span>

                          <span className="text-white/10">
                            •
                          </span>

                          <span>
                            {formatDate(
                              topup.created_at
                            )}
                          </span>

                        </div>

                      </div>

                      <StatusBadge
                        status={
                          topup.status
                        }
                        getStatus={
                          getStatus
                        }
                      />

                    </div>

                    {topup.notes && (
                      <div className="mt-3 flex items-start gap-2 border-t border-white/5 pt-3">

                        <FileText
                          size={14}
                          className="mt-0.5 shrink-0 text-white/20"
                          strokeWidth={1.7}
                        />

                        <p className="text-[10px] leading-5 text-white/35">
                          {topup.notes}
                        </p>

                      </div>
                    )}

                  </div>
                );
              })}

            </div>
          )}

        </FinanceSection>

        {/* Transactions */}

        <FinanceSection
          title="الحركات المالية"
          subtitle="سجل الحركات التي أثرت على رصيدك"
          icon={
            <History
              size={19}
              strokeWidth={1.7}
            />
          }
          count={transactions.length}
        >

          {transactions.length === 0 ? (
            <EmptyState text="لا توجد حركات مالية حتى الآن." />
          ) : (
            <div className="space-y-2">

              {transactions.map(
                (transaction) => {
                  const positive =
                    Number(
                      transaction.amount
                    ) > 0;

                  return (
                    <div
                      key={transaction.id}
                      className="rounded-2xl border border-white/6 bg-[#181b20] p-4"
                    >

                      <div className="flex items-center gap-3">

                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            positive
                              ? "bg-emerald-400/10 text-emerald-400"
                              : "bg-red-400/10 text-red-400"
                          }`}
                        >
                          {positive ? (
                            <ArrowUpCircle
                              size={18}
                              strokeWidth={1.7}
                            />
                          ) : (
                            <ArrowDownCircle
                              size={18}
                              strokeWidth={1.7}
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="text-xs font-bold text-white/75">
                            {getTransactionType(
                              transaction.transaction_type
                            )}
                          </p>

                          <p className="mt-1 truncate text-[10px] text-white/25">
                            {transaction.description ||
                              "-"}
                          </p>

                        </div>

                        <div className="text-left">

                          <p
                            dir="ltr"
                            className={`text-sm font-black ${
                              positive
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {positive
                              ? "+"
                              : ""}
                            {Number(
                              transaction.amount
                            ).toFixed(2)}
                          </p>

                          <p className="mt-1 text-[9px] text-white/20">
                            {formatDate(
                              transaction.created_at
                            )}
                          </p>

                        </div>

                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">

                        <span className="text-[9px] text-white/20">
                          الرصيد بعد الحركة
                        </span>

                        <span
                          dir="ltr"
                          className={`text-[11px] font-bold ${
                            Number(
                              transaction.balance_after
                            ) < 0
                              ? "text-red-400"
                              : "text-white/50"
                          }`}
                        >
                          {Number(
                            transaction.balance_after
                          ).toFixed(2)}{" "}
                          د.أ
                        </span>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </FinanceSection>

      </div>
    </main>
  );
}

/* =========================================================
   FINANCE SECTION
========================================================= */

function FinanceSection({
  title,
  subtitle,
  icon,
  count,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="mb-4 rounded-[26px] border border-white/10 bg-[#12151a] p-4 sm:p-5">

      <div className="mb-4 flex items-center justify-between gap-3">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
            {icon}
          </div>

          <div>

            <h2 className="text-sm font-bold">
              {title}
            </h2>

            <p className="mt-1 text-[10px] text-white/25">
              {subtitle}
            </p>

          </div>

        </div>

        <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-white/5 px-2 text-[9px] font-bold text-white/30">
          {count}
        </span>

      </div>

      {children}

    </section>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  title,
  value,
  icon,
  highlight,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-[#12151a] p-3 ${
        highlight
          ? "border-[#d6a84f]/20"
          : "border-white/7"
      }`}
    >

      <div className="flex items-center justify-between">

        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            highlight
              ? "bg-[#d6a84f]/10 text-[#d6a84f]"
              : "bg-white/[0.04] text-white/35"
          }`}
        >
          {icon}
        </span>

        <span className="text-xl font-black">
          {value}
        </span>

      </div>

      <p className="mt-2 text-[10px] text-white/30">
        {title}
      </p>

    </div>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
  getStatus,
}: {
  status: string;
  getStatus: (
    status: string
  ) => {
    text: string;
    className: string;
    icon: ReactNode;
  };
}) {
  const data = getStatus(status);

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[9px] font-bold ${data.className}`}
    >
      {data.icon}
      {data.text}
    </span>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/7 bg-white/[0.015] py-8 text-center">

      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.03] text-white/20">
        <History
          size={18}
          strokeWidth={1.6}
        />
      </div>

      <p className="text-[10px] text-white/25">
        {text}
      </p>

    </div>
  );
}