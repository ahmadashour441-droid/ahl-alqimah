"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  FileText,
  Package,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
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

type Activity = {
  is_active: boolean;
  floor_charged: boolean;
  produced_total: number;
  consumed_total: number;
  produced_count: number;
  consumed_count: number;
};

type Order = {
  id: string;
  order_number: number;
  order_type: "passenger" | "order";
  amount: number;
  commission_rate: number;
  commission_amount: number;
  producer_id: string;
  consumer_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

type WeekData = {
  week: Week;
  activity: Activity;
  producedOrders: Order[];
  consumedOrders: Order[];
};

export default function WeeksPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [weekData, setWeekData] = useState<WeekData | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadWeeks();
  }, []);

  async function getSessionToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return null;
    }

    return session.access_token;
  }

  async function loadWeeks() {
    try {
      setLoading(true);
      setError("");

      const token = await getSessionToken();

      if (!token) {
        setError("انتهت جلسة الدخول، يرجى تسجيل الدخول مرة أخرى.");
        return;
      }

      const response = await fetch("/api/weeks", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("WEEKS API ERROR:", result);

        setError(result.error || "تعذر تحميل الأسابيع.");
        return;
      }

      const loadedWeeks = Array.isArray(result.weeks)
        ? result.weeks
        : [];

      setWeeks(loadedWeeks);

      if (result.currentWeek) {
        setCurrentWeek(result.currentWeek);
        setSelectedWeek(result.currentWeek.id);

        await loadWeekDetails(result.currentWeek.id, token);
      } else if (loadedWeeks.length > 0) {
        setSelectedWeek(loadedWeeks[0].id);

        await loadWeekDetails(loadedWeeks[0].id, token);
      }
    } catch (err) {
      console.error("LOAD WEEKS ERROR:", err);

      setError("حدث خطأ أثناء تحميل الأسابيع.");
    } finally {
      setLoading(false);
    }
  }

  async function loadWeekDetails(
    weekId: string,
    existingToken?: string
  ) {
    try {
      setLoadingDetails(true);
      setError("");

      const token =
        existingToken || (await getSessionToken());

      if (!token) {
        setError("انتهت جلسة الدخول، يرجى تسجيل الدخول مرة أخرى.");
        return;
      }

      const response = await fetch(`/api/weeks/${weekId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("WEEK DETAILS API ERROR:", result);

        setError(
          result.error || "تعذر تحميل تفاصيل الأسبوع."
        );

        return;
      }

      setWeekData(result);
      setSelectedWeek(weekId);
    } catch (err) {
      console.error("LOAD WEEK DETAILS ERROR:", err);

      setError("حدث خطأ أثناء تحميل تفاصيل الأسبوع.");
    } finally {
      setLoadingDetails(false);
    }
  }

  function selectWeek(week: Week) {
    if (week.id === selectedWeek) {
      return;
    }

    setSelectedWeek(week.id);
    loadWeekDetails(week.id);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("ar-JO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatDateTime(date: string) {
    return new Date(date).toLocaleString("ar-JO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatMoney(value: number) {
    return `${Number(value || 0).toFixed(2)} د.أ`;
  }

  function getWeekEndDate(endAt: string) {
    const date = new Date(endAt);

    date.setMilliseconds(
      date.getMilliseconds() - 1
    );

    return date;
  }

  function getWeekLabel(week: Week) {
    return `${formatDate(week.start_at)} → ${formatDate(
      getWeekEndDate(week.end_at).toISOString()
    )}`;
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#0b0d10] px-4"
      >
        <div className="w-full max-w-sm rounded-[28px] border border-[#292d33] bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#d6a84f]/10 text-[#d6a84f]">
            <CalendarDays size={30} />
          </div>

          <p className="mt-5 font-bold text-[#f3f4f6]">
            جاري تحميل الأسابيع...
          </p>

          <div className="mx-auto mt-4 h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#d6a84f]" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#0b0d10] text-[#f3f4f6]"
    >
      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">

        {/* HEADER */}

        <header className="mb-6 overflow-hidden rounded-[28px] border border-[#292d33] bg-white shadow-2xl">
          <div className="relative p-5 sm:p-7">
            <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-[#d6a84f]/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-4">

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#d6a84f]/20 bg-[#d6a84f]/10 text-[#d6a84f]">
                  <CalendarDays size={27} />
                </div>

                <div>
                  <p className="text-xs font-bold tracking-wide text-[#d6a84f]">
                    السجل الأسبوعي
                  </p>

                  <h1 className="mt-1 text-2xl font-black text-[#f3f4f6] sm:text-3xl">
                    الأسابيع
                  </h1>

                  <p className="mt-1 text-sm text-[#73777e]/45">
                    تابع إنتاجك واستهلاكك ونشاطك في كل أسبوع.
                  </p>
                </div>

              </div>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#292d33] bg-[#11151a] px-5 py-3 text-sm font-bold text-[#f3f4f6] transition hover:border-[#d6a84f]/40 hover:bg-[#d6a84f]/10"
              >
                <ArrowRight size={17} />
                العودة للوحة التحكم
              </Link>

            </div>
          </div>
        </header>

        {/* ERROR */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            <XCircle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-bold">حدث خطأ</p>
              <p className="mt-1 text-sm text-red-300/80">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* NO WEEKS */}

        {weeks.length === 0 ? (
          <div className="rounded-[28px] border border-[#292d33] bg-white p-10 text-center shadow-2xl">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#d6a84f]/10 text-[#d6a84f]">
              <CalendarDays size={36} />
            </div>

            <h2 className="mt-5 text-xl font-black text-[#f3f4f6]">
              لا توجد أسابيع
            </h2>

            <p className="mt-2 text-sm text-[#73777e]/40">
              لم يتم تسجيل أي أسبوع في النظام حتى الآن.
            </p>

          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">

            {/* WEEKS LIST */}

            <aside className="h-fit rounded-[28px] border border-[#292d33] bg-white p-4 shadow-2xl xl:sticky xl:top-6">

              <div className="mb-4 flex items-center justify-between px-1">

                <div className="flex items-center gap-2">
                  <CalendarDays
                    size={18}
                    className="text-[#d6a84f]"
                  />

                  <h2 className="font-black text-[#f3f4f6]">
                    سجل الأسابيع
                  </h2>
                </div>

                <span className="rounded-full border border-[#292d33] bg-[#11151a] px-3 py-1 text-xs font-bold text-[#73777e]/50">
                  {weeks.length}
                </span>

              </div>

              <div className="space-y-2">

                {weeks.map((week) => {
                  const selected =
                    week.id === selectedWeek;

                  const isCurrent =
                    currentWeek?.id === week.id;

                  return (
                    <button
                      key={week.id}
                      type="button"
                      onClick={() =>
                        selectWeek(week)
                      }
                      className={`group w-full rounded-2xl border p-4 text-right transition ${
                        selected
                          ? "border-[#d6a84f]/50 bg-[#d6a84f]/10 shadow-lg shadow-[#d6a84f]/5"
                          : "border-[#eeeae4] bg-[#11151a] hover:border-[#292d33] hover:bg-[#15191f]"
                      }`}
                    >

                      <div className="flex items-center gap-3">

                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            selected
                              ? "bg-[#d6a84f] text-[#0b0d10]"
                              : "bg-[#15191f] text-[#73777e]/40"
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
                            {getWeekLabel(week)}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-1.5">

                            {isCurrent && (
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-black ${
                                  selected
                                    ? "bg-[#d6a84f]/15 text-[#d6a84f]"
                                    : "bg-[#d6a84f]/10 text-[#d6a84f]"
                                }`}
                              >
                                الحالي
                              </span>
                            )}

                            {week.is_closed && (
                              <span
                                className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-400"
                              >
                                مغلق
                              </span>
                            )}

                          </div>

                        </div>

                        <ChevronLeft
                          size={18}
                          className={`shrink-0 transition ${
                            selected
                              ? "text-[#d6a84f]"
                              : "text-[#73777e]/20 group-hover:text-[#73777e]/50"
                          }`}
                        />

                      </div>

                    </button>
                  );
                })}

              </div>

            </aside>

            {/* DETAILS */}

            <section className="min-w-0">

              {loadingDetails ? (
                <div className="flex min-h-[450px] items-center justify-center rounded-[28px] border border-[#292d33] bg-white shadow-2xl">

                  <div className="text-center">

                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#d6a84f]/10 text-[#d6a84f]">
                      <Clock3
                        size={30}
                        className="animate-pulse"
                      />
                    </div>

                    <p className="mt-5 font-bold text-[#73777e]/70">
                      جاري تحميل تفاصيل الأسبوع...
                    </p>

                  </div>

                </div>
              ) : !weekData ? (
                <div className="rounded-[28px] border border-[#292d33] bg-white p-10 text-center shadow-2xl">

                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#15191f] text-[#73777e]/30">
                    <CalendarDays size={30} />
                  </div>

                  <p className="mt-4 text-sm text-[#73777e]/40">
                    اختر أسبوعًا لعرض تفاصيله.
                  </p>

                </div>
              ) : (
                <div className="space-y-6">

                  {/* WEEK HERO */}

                  <div className="relative overflow-hidden rounded-[28px] border border-[#d6a84f]/20 bg-white shadow-2xl">

                    <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#d6a84f]/10 blur-3xl" />

                    <div className="relative p-6 sm:p-7">

                      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                          <p className="text-xs font-bold text-[#d6a84f]">
                            الفترة الأسبوعية
                          </p>

                          <h2 className="mt-2 text-xl font-black text-[#f3f4f6] sm:text-2xl">
                            {getWeekLabel(
                              weekData.week
                            )}
                          </h2>

                          {weekData.week.closed_at && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-[#73777e]/35">
                              <Clock3 size={14} />
                              تم الإغلاق:{" "}
                              {formatDateTime(
                                weekData.week.closed_at
                              )}
                            </div>
                          )}

                        </div>

                        <div
                          className={`flex w-fit items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-black ${
                            weekData.week.is_closed
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                              : "border-[#d6a84f]/20 bg-[#d6a84f]/10 text-[#d6a84f]"
                          }`}
                        >
                          {weekData.week.is_closed ? (
                            <>
                              <CheckCircle2 size={15} />
                              أسبوع مغلق
                            </>
                          ) : (
                            <>
                              <Zap size={15} />
                              الأسبوع الحالي
                            </>
                          )}
                        </div>

                      </div>

                    </div>

                  </div>

                  {/* STATISTICS */}

                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

                    <StatCard
                      icon={<TrendingUp size={21} />}
                      title="الإنتاج"
                      value={formatMoney(
                        weekData.activity.produced_total
                      )}
                      subtitle={`${weekData.activity.produced_count} أوردر`}
                    />

                    <StatCard
                      icon={<TrendingDown size={21} />}
                      title="الاستهلاك"
                      value={formatMoney(
                        weekData.activity.consumed_total
                      )}
                      subtitle={`${weekData.activity.consumed_count} أوردر`}
                    />

                    <StatCard
                      icon={<Package size={21} />}
                      title="إجمالي العمليات"
                      value={String(
                        weekData.activity.produced_count +
                          weekData.activity.consumed_count
                      )}
                      subtitle="إنتاج + استهلاك"
                    />

                    <StatCard
                      icon={<Zap size={21} />}
                      title="حالة النشاط"
                      value={
                        weekData.activity.is_active
                          ? "نشط"
                          : "غير نشط"
                      }
                      subtitle={
                        weekData.activity.floor_charged
                          ? "تم احتساب أرضية الأسبوع"
                          : "لم تحتسب الأرضية"
                      }
                    />

                  </div>

                  {/* PRODUCED ORDERS */}

                  <OrderSection
                    title="الأوردرات التي أنتجتها"
                    subtitle="الأوردرات التي قمت بإنتاجها خلال هذا الأسبوع."
                    orders={
                      weekData.producedOrders || []
                    }
                    type="produced"
                  />

                  {/* CONSUMED ORDERS */}

                  <OrderSection
                    title="الأوردرات التي استهلكتها"
                    subtitle="الأوردرات التي أخذتها خلال هذا الأسبوع."
                    orders={
                      weekData.consumedOrders || []
                    }
                    type="consumed"
                  />

                </div>
              )}

            </section>

          </div>
        )}

      </div>
    </main>
  );
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#292d33] bg-white p-4 shadow-xl sm:p-5">

      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0">

          <p className="text-xs font-bold text-[#73777e]/40">
            {title}
          </p>

          <p className="mt-2 truncate text-lg font-black text-[#f3f4f6] sm:text-2xl">
            {value}
          </p>

          <p className="mt-1 truncate text-[11px] text-[#73777e]/30">
            {subtitle}
          </p>

        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
          {icon}
        </div>

      </div>

    </div>
  );
}

function OrderSection({
  title,
  subtitle,
  orders,
  type,
}: {
  title: string;
  subtitle: string;
  orders: Order[];
  type: "produced" | "consumed";
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-[#292d33] bg-white shadow-2xl">

      <div className="border-b border-[#eeeae4] p-5 sm:p-6">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-start gap-3">

            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                type === "produced"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {type === "produced" ? (
                <TrendingUp size={20} />
              ) : (
                <TrendingDown size={20} />
              )}
            </div>

            <div>

              <h3 className="text-base font-black text-[#f3f4f6] sm:text-lg">
                {title}
              </h3>

              <p className="mt-1 text-xs text-[#73777e]/35">
                {subtitle}
              </p>

            </div>

          </div>

          <span className="w-fit rounded-full border border-[#292d33] bg-[#11151a] px-3 py-1.5 text-xs font-black text-[#73777e]/45">
            {orders.length} طلب
          </span>

        </div>

      </div>

      {orders.length === 0 ? (
        <div className="p-10 text-center">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#15191f] text-[#73777e]/20">
            <Package size={25} />
          </div>

          <p className="mt-4 text-sm text-[#73777e]/30">
            {type === "produced"
              ? "لم تنتج أي أوردر في هذا الأسبوع."
              : "لم تستهلك أي أوردر في هذا الأسبوع."}
          </p>

        </div>
      ) : (
        <div className="divide-y divide-white/5">

          {orders.map((order) => {

            const statusLabel =
              order.status === "published"
                ? "منشور"
                : order.status === "assigned"
                ? "مسند"
                : order.status === "completed"
                ? "مكتمل"
                : order.status === "cancelled"
                ? "ملغي"
                : order.status;

            const statusStyle =
              order.status === "cancelled"
                ? "border-red-500/20 bg-red-500/10 text-red-400"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";

            return (
              <div
                key={order.id}
                className="p-5 transition hover:bg-white/[0.015] sm:p-6"
              >

                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                  <div className="min-w-0">

                    <div className="flex flex-wrap items-center gap-2">

                      <span className="font-black text-[#f3f4f6]">
                        #{order.order_number}
                      </span>

                      <span className="rounded-full border border-[#292d33] bg-[#11151a] px-2.5 py-1 text-[11px] font-bold text-[#73777e]/50">
                        {order.order_type === "passenger"
                          ? "راكب"
                          : "أوردر"}
                      </span>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusStyle}`}
                      >
                        {statusLabel}
                      </span>

                    </div>

                    <div className="mt-2 flex items-center gap-2 text-[11px] text-[#73777e]/25">
                      <Clock3 size={13} />
                      {formatOrderDateTime(
                        order.created_at
                      )}
                    </div>

                    {order.notes && (
                      <div className="mt-3 flex items-start gap-2 rounded-2xl border border-[#eeeae4] bg-[#11151a] p-3 text-xs text-[#73777e]/45">
                        <FileText
                          size={15}
                          className="mt-0.5 shrink-0 text-[#d6a84f]"
                        />

                        <span>{order.notes}</span>
                      </div>
                    )}

                  </div>

                  <div className="flex items-center justify-between gap-5 border-t border-[#eeeae4] pt-4 lg:min-w-[190px] lg:border-t-0 lg:pt-0">

                    <div>
                      <p className="text-[11px] font-bold text-[#73777e]/30">
                        قيمة الأوردر
                      </p>

                      <p className="mt-1 text-lg font-black text-[#f3f4f6]">
                        {formatOrderMoney(
                          order.amount
                        )}
                      </p>
                    </div>

                    <div className="text-left">

                      <p className="text-[11px] font-bold text-[#73777e]/30">
                        العمولة
                      </p>

                      <p
                        className={`mt-1 text-base font-black ${
                          type === "produced"
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {type === "produced"
                          ? "+"
                          : "-"}
                        {formatOrderMoney(
                          order.commission_amount
                        )}
                      </p>

                    </div>

                  </div>

                </div>

              </div>
            );
          })}

        </div>
      )}

    </section>
  );
}

function formatOrderMoney(value: number) {
  return `${Number(value || 0).toFixed(2)} د.أ`;
}

function formatOrderDateTime(date: string) {
  return new Date(date).toLocaleString("ar-JO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}