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
  ChevronDown,
  CarFront,
  UserRound,
  CalendarDays,
  ReceiptText,
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
  order_id: string | null;
};

type UserReference = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

type OrderDetails = {
  id: string;
  order_number: string | null;
  order_type: string | null;
  amount: number;
  commission_rate: number | null;
  commission_amount: number | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  financially_processed: boolean | null;
  processed_week_id: string | null;
  producer_id: string;
  consumer_id: string;
  producer?: UserReference | null;
  consumer?: UserReference | null;
};

/*
 * Supabase may return foreign-key relations as arrays.
 * We normalize them before storing them in state.
 */
type OrderDetailsRow = Omit<
  OrderDetails,
  "producer" | "consumer"
> & {
  producer: UserReference[] | null;
  consumer: UserReference[] | null;
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

  const [orderDetails, setOrderDetails] =
    useState<Record<string, OrderDetails>>({});

  const [expandedOrders, setExpandedOrders] =
    useState<Record<string, boolean>>({});

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
        withdrawalsResponse,
      ] = await Promise.all([
        supabase
          .from("transactions")
          .select(
            "id, transaction_type, amount, balance_before, balance_after, description, created_at, order_id"
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

      if (withdrawalsResponse.error) {
        console.error(
          "WITHDRAWALS ERROR:",
          withdrawalsResponse.error
        );
      }

      const loadedTransactions = (transactionsResponse.data || []) as Transaction[];
      setTransactions(loadedTransactions);

      const orderIds = Array.from(
        new Set(
          loadedTransactions
            .map((transaction) => transaction.order_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      if (orderIds.length > 0) {
        const { data: linkedOrders, error: linkedOrdersError } = await supabase
          .from("orders")
          .select(`
            id,
            order_number,
            order_type,
            amount,
            commission_rate,
            commission_amount,
            status,
            notes,
            created_at,
            updated_at,
            financially_processed,
            processed_week_id,
            producer_id,
            consumer_id,
            producer:users!orders_producer_id_fkey (id, full_name, phone),
            consumer:users!orders_consumer_id_fkey (id, full_name, phone)
          `)
          .in("id", orderIds);

        if (linkedOrdersError) {
          console.error("LINKED ORDERS ERROR:", linkedOrdersError);
        } else {
          const rows = (linkedOrders || []) as unknown as OrderDetailsRow[];

const mappedOrders = Object.fromEntries(
  rows.map((order) => {
    const normalizedOrder: OrderDetails = {
      ...order,
      producer: order.producer?.[0] ?? null,
      consumer: order.consumer?.[0] ?? null,
    };

    return [order.id, normalizedOrder];
  })
);

setOrderDetails(mappedOrders);
        }
      } else {
        setOrderDetails({});
      }

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
          "border-[#e8b63e]/35 bg-[#e8b63e]/10 text-[#d6a84f]",
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
          "border-emerald-400/15 bg-emerald-400/10 text-[#16845a]",
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
        "border-red-400/15 bg-red-400/10 text-[#b4233f]",
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

  function getOrderTypeLabel(type: string | null | undefined) {
    if (type === "passenger") return "راكب";
    if (type === "product") return "منتج";
    return type || "غير محدد";
  }

  function getOrderStatusLabel(status: string | null | undefined) {
    if (status === "completed") return "مكتمل";
    if (status === "assigned") return "مسند";
    if (status === "pending") return "قيد الانتظار";
    if (status === "processing") return "قيد التنفيذ";
    if (status === "cancelled" || status === "canceled") return "ملغى";
    return status || "غير محدد";
  }

  function toggleOrderDetails(orderId: string) {
    setExpandedOrders((current) => ({
      ...current,
      [orderId]: !current[orderId],
    }));
  }

  const pendingWithdrawals = withdrawals.filter(
    (item) => item.status === "pending"
  ).length;

  const approvedWithdrawals = withdrawals.filter(
    (item) => item.status === "approved"
  ).length;

  const rejectedWithdrawals = withdrawals.filter(
    (item) => item.status === "rejected"
  ).length;

  const balance = Number(user?.balance || 0);

  return (
    <main
      dir="rtl"
      className="vip-legacy-page min-h-screen"
    >
      <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-5 sm:px-6">

        {/* Header */}

        <header className="mb-6 flex items-center justify-between">

          <Link
            href="/dashboard"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#292d33] bg-white text-[#73777e] transition hover:border-[#e8b63e]/45 hover:text-[#d6a84f]"
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

            <p className="mt-0.5 text-[11px] text-[#85878d]">
              المالية
            </p>

          </div>

          <button
            onClick={loadFinance}
            disabled={loading}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#292d33] bg-white text-[#73777e] transition hover:border-[#e8b63e]/45 hover:text-[#d6a84f]"
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
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs leading-5 text-[#b4233f]">

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
              : "border-[#e8b63e]/35 bg-gradient-to-br from-[#191817] to-[#121317]"
          }`}
        >

          <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-[#e8b63e]/5 blur-3xl" />

          <div className="relative">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e8b63e]/35 bg-[#e8b63e]/10 text-[#d6a84f]">
                <Wallet
                  size={21}
                  strokeWidth={1.7}
                />
              </div>

              <div>

                <p className="text-xs text-[#73777e]">
                  الرصيد الحالي
                </p>

                <p className="mt-0.5 text-[10px] text-[#f3f4f6]/20">
                  {user?.full_name || ""}
                </p>

              </div>

            </div>

            <div className="mt-5 flex items-end gap-2">

              <span
                dir="ltr"
                className={`text-4xl font-black tracking-tight sm:text-5xl ${
                  balance < 0
                    ? "text-[#b4233f]"
                    : "text-[#f3f4f6]"
                }`}
              >
                {balance.toFixed(2)}
              </span>

              <span className="mb-1.5 text-sm font-bold text-[#d6a84f]">
                د.أ
              </span>

            </div>

            {balance < 0 && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-xs font-bold text-[#b4233f]">

                <AlertCircle
                  size={16}
                  strokeWidth={1.8}
                />

                رصيدك صار سالب. يرجى تسوية المبلغ المستحق.

              </div>
            )}

          </div>

        </section>

        {/* Quick Actions */}

        <section className="mb-5 grid grid-cols-2 gap-3">

          <Link
            href="/finance/withdraw"
            className="group rounded-[22px] border border-[#eeeae4] bg-white p-4 transition hover:border-[#d6a84f]/25 hover:bg-[#15191f]"
          >

            <div className="flex items-center justify-between">

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f7f4ef] text-[#73777e]">
                <ArrowDownCircle
                  size={19}
                  strokeWidth={1.7}
                />
              </span>

              <ChevronLeft
                size={15}
                className="text-[#f3f4f6]/20 transition group-hover:text-[#d6a84f]"
              />

            </div>

            <p className="mt-4 text-sm font-bold">
              سحب الرصيد
            </p>

            <p className="mt-1 text-[10px] text-[#85878d]">
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

            <p className="mt-1 text-[10px] text-[#f3f4f6]/25">
              حالة طلباتك المالية
            </p>

          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">

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
                      className="rounded-2xl border border-[#eeeae4] bg-[#15191f] p-4"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <p className="text-lg font-black text-[#f3f4f6]">
                            {Number(
                              withdrawal.amount
                            ).toFixed(2)}{" "}
                            <span className="text-xs text-[#d6a84f]">
                              د.أ
                            </span>
                          </p>

                          <p className="mt-1 text-[10px] text-[#f3f4f6]/25">
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
                        <div className="mt-3 flex items-start gap-2 border-t border-[#eeeae4] pt-3">

                          <FileText
                            size={14}
                            className="mt-0.5 shrink-0 text-[#f3f4f6]/20"
                            strokeWidth={1.7}
                          />

                          <p className="text-[10px] leading-5 text-[#85878d]">
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
                  const positive = Number(transaction.amount) > 0;
                  const order = transaction.order_id
                    ? orderDetails[transaction.order_id]
                    : undefined;
                  const isExpanded = order
                    ? Boolean(expandedOrders[order.id])
                    : false;

                  return (
                    <div
                      key={transaction.id}
                      className="rounded-2xl border border-[#eeeae4] bg-[#15191f] p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            positive
                              ? "bg-emerald-400/10 text-[#16845a]"
                              : "bg-red-400/10 text-[#b4233f]"
                          }`}
                        >
                          {positive ? (
                            <ArrowUpCircle size={18} strokeWidth={1.7} />
                          ) : (
                            <ArrowDownCircle size={18} strokeWidth={1.7} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#f3f4f6]/75">
                            {getTransactionType(transaction.transaction_type)}
                          </p>
                          <p className="mt-1 truncate text-[10px] text-[#f3f4f6]/25">
                            {transaction.description || "-"}
                          </p>
                        </div>
                        <div className="text-left">
                          <p
                            dir="ltr"
                            className={`text-sm font-black ${
                              positive ? "text-[#16845a]" : "text-[#b4233f]"
                            }`}
                          >
                            {positive ? "+" : ""}{Number(transaction.amount).toFixed(2)}
                          </p>
                          <p className="mt-1 text-[9px] text-[#f3f4f6]/20">
                            {formatDate(transaction.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#eeeae4] pt-3">
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] text-[#f3f4f6]/20">الرصيد بعد الحركة</span>
                          <span
                            dir="ltr"
                            className={`text-[11px] font-bold ${
                              Number(transaction.balance_after) < 0
                                ? "text-[#b4233f]"
                                : "text-[#73777e]"
                            }`}
                          >
                            {Number(transaction.balance_after).toFixed(2)} د.أ
                          </span>
                        </div>

                        {order && (
                          <button
                            type="button"
                            onClick={() => toggleOrderDetails(order.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8b63e]/30 bg-[#e8b63e]/5 px-2.5 py-1.5 text-[9px] font-black text-[#d6a84f] transition hover:bg-[#e8b63e]/10"
                          >
                            <ReceiptText size={13} strokeWidth={1.8} />
                            تفاصيل الطلب
                            <ChevronDown
                              size={13}
                              strokeWidth={1.8}
                              className={isExpanded ? "rotate-180 transition" : "transition"}
                            />
                          </button>
                        )}
                      </div>

                      {order && isExpanded && (
                        <div className="mt-4 rounded-2xl border border-[#d6a84f]/10 bg-[#15191f] p-3.5">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8b63e]/10 text-[#d6a84f]">
                                <CarFront size={15} strokeWidth={1.8} />
                              </span>
                              <div>
                                <p className="text-[11px] font-black text-[#303238]">تفاصيل الطلب كاملة</p>
                                <p className="mt-0.5 text-[9px] text-[#f3f4f6]/25">#{order.order_number || order.id.slice(0, 8)}</p>
                              </div>
                            </div>
                            <span className="rounded-full border border-[#292d33] bg-[#f7f4ef] px-2 py-1 text-[9px] font-bold text-[#73777e]">
                              {getOrderStatusLabel(order.status)}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <OrderDetailItem label="رقم الطلب" value={`#${order.order_number || order.id.slice(0, 8)}`} />
                            <OrderDetailItem label="نوع الطلب" value={getOrderTypeLabel(order.order_type)} />
                            <OrderDetailItem label="قيمة الطلب" value={formatMoney(order.amount)} />
                            <OrderDetailItem label="نسبة العمولة" value={order.commission_rate != null ? `${Number(order.commission_rate).toFixed(0)}%` : "-"} />
                            <OrderDetailItem label="قيمة العمولة" value={order.commission_amount != null ? formatMoney(order.commission_amount) : "-"} />
                            <OrderDetailItem label="تاريخ الطلب" value={formatDate(order.created_at)} />
                            <OrderDetailItem label="حالة المعالجة" value={order.financially_processed ? "تمت المعالجة المالية" : "غير معالجة"} />
                            <OrderDetailItem label="رقم الأسبوع" value={order.processed_week_id ? order.processed_week_id.slice(0, 8) : "-"} />
                          </div>

                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-xl border border-[#eeeae4] bg-[#15191f] p-3">
                              <div className="mb-2 flex items-center gap-2 text-[9px] font-bold text-[#d6a84f]">
                                <UserRound size={13} className="text-[#e8b63e]" /> اسم المنتج
                              </div>
                              <p className="text-[13px] font-black text-[#650016]">{order.producer?.full_name || "غير محدد"}</p>
                              <p dir="ltr" className="mt-1 text-[10px] font-semibold text-[#73777e]">{order.producer?.phone || "لا يوجد رقم"}</p>
                            </div>
                            <div className="rounded-xl border border-[#eeeae4] bg-[#15191f] p-3">
                              <div className="mb-2 flex items-center gap-2 text-[9px] font-bold text-[#d6a84f]">
                                <UserRound size={13} className="text-[#e8b63e]" /> اسم المستهلك
                              </div>
                              <p className="text-[13px] font-black text-[#650016]">{order.consumer?.full_name || "غير محدد"}</p>
                              <p dir="ltr" className="mt-1 text-[10px] font-semibold text-[#73777e]">{order.consumer?.phone || "لا يوجد رقم"}</p>
                            </div>
                          </div>

                          <div className="mt-2 flex items-start gap-2 rounded-xl border border-[#eeeae4] bg-[#15191f] p-3">
                            <CalendarDays size={14} className="mt-0.5 shrink-0 text-[#d6a84f]" />
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold text-[#85878d]">ملاحظات الطلب</p>
                              <p className="mt-1 whitespace-pre-wrap break-words text-[10px] leading-5 text-[#5f6368]">{order.notes || "لا توجد ملاحظات على الطلب."}</p>
                            </div>
                          </div>
                        </div>
                      )}
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

function OrderDetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#eeeae4] bg-[#15191f] p-2.5">
      <p className="text-[8px] font-bold text-[#f3f4f6]/25">{label}</p>
      <p className="mt-1 break-words text-[10px] font-black text-[#4b4f55]">{value}</p>
    </div>
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
    <section className="mb-4 rounded-[26px] border border-[#292d33] bg-white p-4 sm:p-5">

      <div className="mb-4 flex items-center justify-between gap-3">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8b63e]/10 text-[#d6a84f]">
            {icon}
          </div>

          <div>

            <h2 className="text-sm font-bold">
              {title}
            </h2>

            <p className="mt-1 text-[10px] text-[#f3f4f6]/25">
              {subtitle}
            </p>

          </div>

        </div>

        <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-[#f7f4ef] px-2 text-[9px] font-bold text-[#85878d]">
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
      className={`rounded-2xl border bg-white p-3 ${
        highlight
          ? "border-[#e8b63e]/35"
          : "border-[#eeeae4]"
      }`}
    >

      <div className="flex items-center justify-between">

        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            highlight
              ? "bg-[#e8b63e]/10 text-[#d6a84f]"
              : "bg-[#f7f4ef] text-[#85878d]"
          }`}
        >
          {icon}
        </span>

        <span className="text-xl font-black">
          {value}
        </span>

      </div>

      <p className="mt-2 text-[10px] text-[#85878d]">
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
    <div className="rounded-2xl border border-dashed border-[#eeeae4] bg-[#fbfaf8] py-8 text-center">

      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#15191f] text-[#f3f4f6]/20">
        <History
          size={18}
          strokeWidth={1.6}
        />
      </div>

      <p className="text-[10px] text-[#f3f4f6]/25">
        {text}
      </p>

    </div>
  );
}