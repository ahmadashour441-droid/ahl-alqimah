"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Package,
  RefreshCw,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Week = {
  id: string;
  start_at: string;
  end_at: string;
  is_closed: boolean;
  closed_at: string | null;
};

type Order = {
  id: string;
  order_number: string | number | null;
  order_type: string;
  amount: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  created_at: string;
  producer_id: string | null;
  consumer_id: string | null;
  processed_week_id: string | null;
};

type User = {
  id: string;
  full_name: string;
};

export default function OrdersPage() {
  const [orders, setOrders] =
    useState<Order[]>([]);

  const [users, setUsers] =
    useState<User[]>([]);

  const [weeks, setWeeks] =
    useState<Week[]>([]);

  const [currentWeekId, setCurrentWeekId] =
    useState<string | null>(null);

  const [selectedWeekId, setSelectedWeekId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [filter, setFilter] =
    useState<
      "all" | "produced" | "consumed"
    >("all");

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session?.access_token) {
        setError(
          "انتهت جلسة الدخول، يرجى تسجيل الدخول مرة أخرى."
        );
        return;
      }

      const response = await fetch(
        "/api/orders",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        console.error(
          "ORDERS API ERROR:",
          result
        );

        setError(
          result.error ||
            "تعذر تحميل الطلبات."
        );

        return;
      }

      const orderList =
        Array.isArray(result.orders)
          ? result.orders
          : [];

      const userList =
        Array.isArray(result.users)
          ? result.users
          : [];

      const weekList =
        Array.isArray(result.weeks)
          ? result.weeks
          : [];

      setOrders(orderList);
      setUsers(userList);
      setWeeks(weekList);

      setCurrentWeekId(
        result.currentWeekId ||
          null
      );

      if (result.currentWeekId) {
        setSelectedWeekId(
          result.currentWeekId
        );
      } else if (weekList.length > 0) {
        setSelectedWeekId(
          weekList[0].id
        );
      }
    } catch (error) {
      console.error(
        "LOAD ORDERS ERROR:",
        error
      );

      setError(
        "حدث خطأ أثناء تحميل الطلبات."
      );
    } finally {
      setLoading(false);
    }
  }

  function getUserName(
    id: string | null
  ) {
    if (!id) {
      return "-";
    }

    const user =
      users.find(
        (item) =>
          item.id === id
      );

    return user?.full_name || "-";
  }

  function getOrderType(
    type: string
  ) {
    if (type === "passenger") {
      return {
        label: "راكب",
        icon: <ShoppingBag size={14} />,
        className:
          "border-sky-500/20 bg-sky-500/10 text-sky-400",
      };
    }

    return {
      label: "أوردر",
      icon: <Package size={14} />,
      className:
        "border-purple-500/20 bg-purple-500/10 text-purple-400",
    };
  }

  function getStatus(
    status: string
  ) {
    switch (status) {
      case "published":
        return {
          label: "منشور",
          icon: <Clock3 size={13} />,
          className:
            "border-[#e8b63e]/35 bg-[#e8b63e]/10 text-[#d6a84f]",
        };

      case "assigned":
      case "processed":
      case "completed":
        return {
          label: "مكتمل",
          icon: <CheckCircle2 size={13} />,
          className:
            "border-[#bfe8d2] bg-[#ecf8f1] text-[#16845a]",
        };

      case "cancelled":
        return {
          label: "ملغي",
          icon: <XCircle size={13} />,
          className:
            "border-red-500/20 bg-red-500/10 text-[#b4233f]",
        };

      default:
        return {
          label:
            status || "غير محدد",
          icon: <AlertTriangle size={13} />,
          className:
            "border-[#292d33] bg-[#f7f4ef] text-[#73777e]",
        };
    }
  }

  function formatDate(
    date: string
  ) {
    return new Date(
      date
    ).toLocaleString(
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

  function formatWeekDate(
    date: string
  ) {
    return new Date(
      date
    ).toLocaleDateString(
      "ar-JO",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );
  }

  function getWeekEndDate(
    endAt: string
  ) {
    const date =
      new Date(endAt);

    date.setMilliseconds(
      date.getMilliseconds() -
        1
    );

    return date;
  }

  function getWeekLabel(
    week: Week
  ) {
    return `${formatWeekDate(
      week.start_at
    )} → ${formatWeekDate(
      getWeekEndDate(
        week.end_at
      ).toISOString()
    )}`;
  }

  const storedUser =
    typeof window !== "undefined"
      ? localStorage.getItem("user")
      : null;

  let currentUser:
    | {
        id: string;
      }
    | null = null;

  if (storedUser) {
    try {
      currentUser =
        JSON.parse(
          storedUser
        );
    } catch {
      currentUser = null;
    }
  }

  const weekOrders =
    selectedWeekId
      ? orders.filter(
          (order) =>
            order.processed_week_id ===
            selectedWeekId
        )
      : [];

  const filteredOrders =
    weekOrders.filter(
      (order) => {
        if (
          filter === "produced"
        ) {
          return (
            order.producer_id ===
            currentUser?.id
          );
        }

        if (
          filter === "consumed"
        ) {
          return (
            order.consumer_id ===
            currentUser?.id
          );
        }

        return (
          order.producer_id ===
            currentUser?.id ||
          order.consumer_id ===
            currentUser?.id
        );
      }
    );

  const producedCount =
    weekOrders.filter(
      (order) =>
        order.producer_id ===
        currentUser?.id
    ).length;

  const consumedCount =
    weekOrders.filter(
      (order) =>
        order.consumer_id ===
        currentUser?.id
    ).length;

  const selectedWeek =
    weeks.find(
      (week) =>
        week.id ===
        selectedWeekId
    );

  const isCurrentWeek =
    selectedWeekId ===
    currentWeekId;

  return (
    <main
      dir="rtl"
      className="vip-legacy-page min-h-screen"
    >
      <div className="mx-auto w-full max-w-[1450px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">

        {/* HEADER */}

        <header className="mb-6 overflow-hidden rounded-[28px] border border-[#292d33] bg-white shadow-2xl">

          <div className="relative p-5 sm:p-7">

            <div className="absolute -left-20 -top-20 h-52 w-52 rounded-full bg-[#e8b63e]/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-4">

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#e8b63e]/35 bg-[#e8b63e]/10 text-[#d6a84f]">
                  <Package size={27} />
                </div>

                <div>

                  <p className="text-xs font-bold text-[#d6a84f]">
                    سجل العمليات
                  </p>

                  <h1 className="mt-1 text-2xl font-black text-[#f3f4f6] sm:text-3xl">
                    الطلبات
                  </h1>

                  <p className="mt-1 text-sm text-[#73777e]">
                    جميع الطلبات التي أنتجتها أو استهلكتها حسب الأسبوع
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={loadOrders}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-2xl border border-[#292d33] bg-[#15191f] px-5 py-3 text-sm font-bold text-[#5f6368] transition hover:border-[#e8b63e]/45 hover:text-[#f3f4f6] disabled:opacity-50"
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

        </header>

        {/* ERROR */}

        {error && (
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-start gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-[#b4233f]">
                <XCircle size={19} />
              </div>

              <div>

                <p className="font-bold text-[#b4233f]">
                  حدث خطأ
                </p>

                <p className="mt-1 text-sm text-[#b4233f]/70">
                  {error}
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={loadOrders}
              className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm font-bold text-[#b4233f] transition hover:bg-red-500/20"
            >
              إعادة المحاولة
            </button>

          </div>
        )}

        {/* WEEK SELECTOR */}

        <section className="mb-6 rounded-[28px] border border-[#292d33] bg-white p-5 shadow-2xl sm:p-6">

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-start gap-3">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8b63e]/10 text-[#d6a84f]">
                <CalendarDays size={21} />
              </div>

              <div>

                <h2 className="text-lg font-black text-[#f3f4f6]">
                  اختر الأسبوع
                </h2>

                <p className="mt-1 text-xs text-[#85878d]">
                  الطلبات محفوظة حسب الأسبوع الذي تمت فيه العملية.
                </p>

              </div>

            </div>

            {selectedWeek && (
              <div
                className={`w-fit rounded-full border px-3 py-1.5 text-xs font-black ${
                  isCurrentWeek
                    ? "border-[#e8b63e]/35 bg-[#e8b63e]/10 text-[#d6a84f]"
                    : selectedWeek.is_closed
                    ? "border-[#bfe8d2] bg-[#ecf8f1] text-[#16845a]"
                    : "border-[#292d33] bg-[#f7f4ef] text-[#73777e]"
                }`}
              >
                {isCurrentWeek
                  ? "الأسبوع الحالي"
                  : selectedWeek.is_closed
                  ? "أسبوع مغلق"
                  : "أسبوع سابق"}
              </div>
            )}

          </div>

          {weeks.length === 0 ? (
            <div className="rounded-2xl border border-[#eeeae4] bg-[#15191f] p-6 text-center text-sm text-[#85878d]">
              لا توجد أسابيع مسجلة.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">

              {weeks.map(
                (week) => {

                  const selected =
                    week.id ===
                    selectedWeekId;

                  const current =
                    week.id ===
                    currentWeekId;

                  return (
                    <button
                      key={week.id}
                      type="button"
                      onClick={() => {
                        setSelectedWeekId(
                          week.id
                        );
                        setFilter(
                          "all"
                        );
                      }}
                      className={`group rounded-2xl border p-4 text-right transition ${
                        selected
                          ? "border-[#e8b63e]/70 bg-[#e8b63e]/10 shadow-lg shadow-[#e8b63e]/10"
                          : "border-[#eeeae4] bg-[#15191f] hover:border-[#292d33] hover:bg-[#f5f0e8]"
                      }`}
                    >

                      <div className="flex items-center gap-3">

                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            selected
                              ? "bg-[#e8b63e] text-[#650016]"
                              : "bg-[#f7f4ef] text-[#85878d]"
                          }`}
                        >
                          <CalendarDays size={18} />
                        </div>

                        <div className="min-w-0 flex-1">

                          <p
                            className={`truncate text-sm font-black ${
                              selected
                                ? "text-[#d6a84f]"
                                : "text-[#f3f4f6]"
                            }`}
                          >
                            {getWeekLabel(
                              week
                            )}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-1.5">

                            {current && (
                              <span className="rounded-full bg-[#e8b63e]/10 px-2 py-1 text-[10px] font-black text-[#d6a84f]">
                                الحالي
                              </span>
                            )}

                            {week.is_closed && (
                              <span className="rounded-full bg-[#ecf8f1] px-2 py-1 text-[10px] font-black text-[#16845a]">
                                مغلق
                              </span>
                            )}

                          </div>

                        </div>

                        <ChevronLeft
                          size={18}
                          className={`shrink-0 ${
                            selected
                              ? "text-[#d6a84f]"
                              : "text-[#f3f4f6]/15 group-hover:text-[#73777e]"
                          }`}
                        />

                      </div>

                    </button>
                  );
                }
              )}

            </div>
          )}

        </section>

        {/* SELECTED WEEK */}

        {selectedWeek && (
          <section className="relative mb-6 overflow-hidden rounded-[28px] border border-[#e8b63e]/35 bg-white shadow-2xl">

            <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#e8b63e]/10 blur-3xl" />

            <div className="relative p-5 sm:p-6">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="text-xs font-bold text-[#d6a84f]">
                    الطلبات الخاصة بـ
                  </p>

                  <h2 className="mt-2 text-xl font-black text-[#f3f4f6]">
                    {getWeekLabel(
                      selectedWeek
                    )}
                  </h2>

                </div>

                <div className="rounded-2xl border border-[#292d33] bg-[#15191f] px-5 py-4 text-center">

                  <p className="text-[11px] font-bold text-[#85878d]">
                    إجمالي طلبات الأسبوع
                  </p>

                  <p className="mt-1 text-2xl font-black text-[#d6a84f]">
                    {weekOrders.length}
                  </p>

                </div>

              </div>

            </div>

          </section>
        )}

        {/* FILTERS */}

        <section className="mb-6 rounded-[24px] border border-[#292d33] bg-white p-3 shadow-xl">

          <div className="flex flex-wrap gap-2">

            <FilterButton
              active={
                filter === "all"
              }
              onClick={() =>
                setFilter("all")
              }
              icon={
                <Package size={16} />
              }
            >
              جميع الطلبات
            </FilterButton>

            <FilterButton
              active={
                filter ===
                "produced"
              }
              onClick={() =>
                setFilter(
                  "produced"
                )
              }
              icon={
                <TrendingUp size={16} />
              }
            >
              أنتجتها
            </FilterButton>

            <FilterButton
              active={
                filter ===
                "consumed"
              }
              onClick={() =>
                setFilter(
                  "consumed"
                )
              }
              icon={
                <TrendingDown size={16} />
              }
            >
              استهلكتها
            </FilterButton>

          </div>

        </section>

        {/* SUMMARY */}

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">

          <SummaryCard
            icon={
              <Package size={20} />
            }
            title="إجمالي طلبات الأسبوع"
            value={weekOrders.length}
          />

          <SummaryCard
            icon={
              <TrendingUp size={20} />
            }
            title="الطلبات المنتجة"
            value={producedCount}
            accent="green"
          />

          <SummaryCard
            icon={
              <TrendingDown size={20} />
            }
            title="الطلبات المستهلكة"
            value={consumedCount}
            accent="red"
          />

        </div>

        {/* ORDERS */}

        <section className="overflow-hidden rounded-[28px] border border-[#292d33] bg-white shadow-2xl">

          <div className="border-b border-[#eeeae4] p-5 sm:p-6">

            <div className="flex items-center justify-between gap-4">

              <div>

                <h2 className="text-lg font-black text-[#f3f4f6]">
                  سجل الطلبات
                </h2>

                <p className="mt-1 text-xs text-[#85878d]">
                  الطلبات المرتبطة بالأسبوع المحدد
                </p>

              </div>

              <span className="rounded-full border border-[#292d33] bg-[#15191f] px-3 py-1.5 text-[11px] font-black text-[#73777e]">
                {filteredOrders.length} طلب
              </span>

            </div>

          </div>

          {loading ? (
            <div className="p-12 text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8b63e]/10 text-[#d6a84f]">
                <Package
                  size={29}
                  className="animate-pulse"
                />
              </div>

              <p className="mt-5 font-bold text-[#73777e]">
                جاري تحميل الطلبات...
              </p>

            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center">

              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#f7f4ef] text-[#f3f4f6]/20">
                <Package size={36} />
              </div>

              <p className="mt-5 font-black text-[#f3f4f6]">
                لا توجد طلبات في هذا الأسبوع
              </p>

              <p className="mt-2 text-sm text-[#85878d]">
                جرّب اختيار أسبوع آخر أو فلتر آخر.
              </p>

            </div>
          ) : (
            <>
              {/* MOBILE CARDS */}

              <div className="divide-y divide-white/5 md:hidden">

                {filteredOrders.map(
                  (order) => {

                    const type =
                      getOrderType(
                        order.order_type
                      );

                    const status =
                      getStatus(
                        order.status
                      );

                    const isProducer =
                      order.producer_id ===
                      currentUser?.id;

                    const isConsumer =
                      order.consumer_id ===
                      currentUser?.id;

                    return (
                      <div
                        key={
                          order.id
                        }
                        className="p-5"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div>

                            <div className="flex flex-wrap items-center gap-2">

                              <span className="font-black text-[#f3f4f6]">
                                #
                                {order.order_number ||
                                  order.id.slice(
                                    0,
                                    8
                                  )}
                              </span>

                              <span
                                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${type.className}`}
                              >
                                {type.icon}
                                {type.label}
                              </span>

                            </div>

                            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#f3f4f6]/25">
                              <Clock3
                                size={12}
                              />
                              {formatDate(
                                order.created_at
                              )}
                            </div>

                          </div>

                          <span
                            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${status.className}`}
                          >
                            {status.icon}
                            {status.label}
                          </span>

                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">

                          <div className="rounded-2xl border border-[#eeeae4] bg-[#15191f] p-3">

                            <p className="text-[10px] text-[#f3f4f6]/25">
                              قيمة الأوردر
                            </p>

                            <p className="mt-1 font-black text-[#f3f4f6]">
                              {Number(
                                order.amount ||
                                  0
                              ).toFixed(
                                2
                              )}{" "}
                              <span className="text-[10px] text-[#85878d]">
                                د.أ
                              </span>
                            </p>

                          </div>

                          <div className="rounded-2xl border border-[#eeeae4] bg-[#15191f] p-3">

                            <p className="text-[10px] text-[#f3f4f6]/25">
                              العمولة
                            </p>

                            <p className="mt-1 font-black text-[#d6a84f]">
                              {Number(
                                order.commission_amount ||
                                  0
                              ).toFixed(
                                2
                              )}{" "}
                              <span className="text-[10px] text-[#85878d]">
                                د.أ
                              </span>
                            </p>

                            <p className="mt-0.5 text-[9px] text-[#f3f4f6]/20">
                              {Number(
                                order.commission_rate ||
                                  0
                              )}
                              %
                            </p>

                          </div>

                        </div>

                        <div className="mt-3 space-y-2">

                          <div className="flex items-center justify-between rounded-xl bg-[#15191f] px-3 py-2.5">

                            <span className="text-[11px] text-[#85878d]">
                              المنتج
                            </span>

                            <span className="text-xs font-bold text-[#4b4f55]">
                              {getUserName(
                                order.producer_id
                              )}

                              {isProducer && (
                                <span className="mr-1 text-[#d6a84f]">
                                  (أنت)
                                </span>
                              )}
                            </span>

                          </div>

                          <div className="flex items-center justify-between rounded-xl bg-[#15191f] px-3 py-2.5">

                            <span className="text-[11px] text-[#85878d]">
                              المستهلك
                            </span>

                            <span className="text-xs font-bold text-[#4b4f55]">
                              {getUserName(
                                order.consumer_id
                              )}

                              {isConsumer && (
                                <span className="mr-1 text-[#d6a84f]">
                                  (أنت)
                                </span>
                              )}
                            </span>

                          </div>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

              {/* DESKTOP TABLE */}

              <div className="hidden overflow-x-auto md:block">

                <table className="w-full min-w-[1000px] text-right">

                  <thead className="bg-[#15191f]">

                    <tr>

                      <th className="px-5 py-4 text-xs font-black text-[#85878d]">
                        رقم الطلب
                      </th>

                      <th className="px-5 py-4 text-xs font-black text-[#85878d]">
                        النوع
                      </th>

                      <th className="px-5 py-4 text-xs font-black text-[#85878d]">
                        المبلغ
                      </th>

                      <th className="px-5 py-4 text-xs font-black text-[#85878d]">
                        العمولة
                      </th>

                      <th className="px-5 py-4 text-xs font-black text-[#85878d]">
                        المنتج
                      </th>

                      <th className="px-5 py-4 text-xs font-black text-[#85878d]">
                        المستهلك
                      </th>

                      <th className="px-5 py-4 text-xs font-black text-[#85878d]">
                        الحالة
                      </th>

                      <th className="px-5 py-4 text-xs font-black text-[#85878d]">
                        التاريخ
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-white/5">

                    {filteredOrders.map(
                      (order) => {

                        const type =
                          getOrderType(
                            order.order_type
                          );

                        const status =
                          getStatus(
                            order.status
                          );

                        const isProducer =
                          order.producer_id ===
                          currentUser?.id;

                        const isConsumer =
                          order.consumer_id ===
                          currentUser?.id;

                        return (
                          <tr
                            key={
                              order.id
                            }
                            className="transition hover:bg-[#fbfaf8]"
                          >

                            <td
                              dir="ltr"
                              className="whitespace-nowrap px-5 py-4 text-right font-mono text-sm font-black text-[#f3f4f6]"
                            >
                              {order.order_number ||
                                order.id.slice(
                                  0,
                                  8
                                )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">

                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ${type.className}`}
                              >
                                {type.icon}
                                {type.label}
                              </span>

                            </td>

                            <td className="whitespace-nowrap px-5 py-4 font-black text-[#f3f4f6]">

                              {Number(
                                order.amount ||
                                  0
                              ).toFixed(
                                2
                              )}{" "}
                              <span className="text-xs text-[#85878d]">
                                د.أ
                              </span>

                            </td>

                            <td className="whitespace-nowrap px-5 py-4">

                              <div className="font-black text-[#d6a84f]">
                                {Number(
                                  order.commission_amount ||
                                    0
                                ).toFixed(
                                  2
                                )}{" "}
                                د.أ
                              </div>

                              <div className="mt-0.5 text-[10px] text-[#f3f4f6]/25">
                                {Number(
                                  order.commission_rate ||
                                    0
                                )}
                                %
                              </div>

                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-[#f3f4f6]/65">

                              {getUserName(
                                order.producer_id
                              )}

                              {isProducer && (
                                <span className="mr-2 text-xs font-bold text-[#d6a84f]">
                                  (أنت)
                                </span>
                              )}

                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-[#f3f4f6]/65">

                              {getUserName(
                                order.consumer_id
                              )}

                              {isConsumer && (
                                <span className="mr-2 text-xs font-bold text-[#d6a84f]">
                                  (أنت)
                                </span>
                              )}

                            </td>

                            <td className="whitespace-nowrap px-5 py-4">

                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ${status.className}`}
                              >
                                {status.icon}
                                {status.label}
                              </span>

                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-xs text-[#85878d]">
                              {formatDate(
                                order.created_at
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

        {/* BACK TO DASHBOARD */}

        <div className="mb-10 mt-6">

          <a
            href="/dashboard"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#292d33] bg-white py-4 text-sm font-bold text-[#73777e] transition hover:border-[#e8b63e]/45 hover:text-[#d6a84f]"
          >
            <ArrowLeft size={17} />
            العودة إلى لوحة التحكم
          </a>

        </div>

      </div>
    </main>
  );
}

function FilterButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${
        active
          ? "bg-[#e8b63e] text-[#650016] shadow-lg shadow-[#d6a84f]/10"
          : "bg-[#15191f] text-[#73777e] hover:bg-[#f5f0e8] hover:text-[#f3f4f6]"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function SummaryCard({
  icon,
  title,
  value,
  accent = "gold",
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  accent?: "gold" | "green" | "red";
}) {
  const accentClass =
    accent === "green"
      ? "bg-[#ecf8f1] text-[#16845a]"
      : accent === "red"
      ? "bg-red-500/10 text-[#b4233f]"
      : "bg-[#e8b63e]/10 text-[#d6a84f]";

  const valueClass =
    accent === "green"
      ? "text-[#16845a]"
      : accent === "red"
      ? "text-[#b4233f]"
      : "text-[#d6a84f]";

  return (
    <div className="rounded-[24px] border border-[#292d33] bg-white p-4 shadow-xl sm:p-5">

      <div className="flex items-start justify-between gap-3">

        <div>

          <p className="text-xs font-bold text-[#85878d]">
            {title}
          </p>

          <p
            className={`mt-2 text-2xl font-black ${valueClass}`}
          >
            {value}
          </p>

        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentClass}`}
        >
          {icon}
        </div>

      </div>

    </div>
  );
}