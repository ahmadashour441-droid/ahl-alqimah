"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  RefreshCw,
  Settings,
  Users,
  Wallet,
  X,
  AlertTriangle,
  Archive,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  Clock3,
} from "lucide-react";

type Week = {
  id: string;
  start_at: string;
  end_at: string;
  is_closed: boolean;
  closed_at: string | null;
  created_at: string;
};

type UserActivity = {
  id: string;
  user_id: string;
  is_active: boolean;
  floor_charged: boolean;
  produced_total: number;
  consumed_total: number;
  produced_count: number;
  consumed_count: number;
  user: {
    id: string;
    full_name: string;
    phone: string;
    role: string;
    balance: number;
    is_active: boolean;
  } | null;
};

type WeekDetails = {
  week: Week;
  stats: {
    activeUsers: number;
    totalUsers: number;
    totalProduced: number;
    totalConsumed: number;
    producedOrders: number;
    consumedOrders: number;
    floorChargedUsers: number;
    ordersCount: number;
    transactionsCount: number;
  };
  users: UserActivity[];
  orders: any[];
  transactions: any[];
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ar-JO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Amman",
  }).format(new Date(dateString));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-JO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatMoney(value: number) {
  return `${formatNumber(value)} د.أ`;
}

function getTransactionLabel(type: string) {
  const labels: Record<string, string> = {
    production: "إنتاج",
    consumption: "استهلاك",
    floor: "أرضية",
    topup: "شحن",
    withdrawal: "سحب",
    withdrawal_reversal: "إرجاع سحب",
    adjustment: "تعديل",
  };

  return labels[type] || type;
}

function getOrderStatusLabel(status: string) {
  const labels: Record<string, string> = {
    published: "منشور",
    assigned: "معين",
    completed: "مكتمل",
    cancelled: "ملغي",
  };

  return labels[status] || status;
}

function getOrderTypeLabel(type: string) {
  return type === "passenger" ? "راكب" : "أوردر";
}

export default function AdminWeeksPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [selectedWeek, setSelectedWeek] =
    useState<WeekDetails | null>(null);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [detailsError, setDetailsError] =
    useState("");

  const [detailsTab, setDetailsTab] =
    useState<
      "users" | "orders" | "transactions"
    >("users");

  const [menuOpen, setMenuOpen] = useState(false);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadWeeks() {
    try {
      setLoading(true);
      setError("");

      const token = await getToken();

      if (!token) {
        setError("جلسة الدخول غير موجودة");
        return;
      }

      const response = await fetch(
        "/api/admin/weeks",
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
            "تعذر تحميل الأسابيع"
        );
        return;
      }

      setWeeks(result.weeks || []);
    } catch (err) {
      console.error(err);
      setError(
        "حدث خطأ أثناء تحميل الأسابيع"
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadWeekDetails(
    weekId: string
  ) {
    try {
      setDetailsLoading(true);
      setDetailsError("");
      setSelectedWeek(null);
      setDetailsTab("users");

      const token = await getToken();

      if (!token) {
        setDetailsError(
          "جلسة الدخول غير موجودة"
        );
        return;
      }

      const response = await fetch(
        `/api/admin/weeks/${weekId}`,
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
        setDetailsError(
          result.error ||
            "تعذر تحميل تفاصيل الأسبوع"
        );
        return;
      }

      setSelectedWeek(result);
    } catch (err) {
      console.error(err);

      setDetailsError(
        "حدث خطأ أثناء تحميل تفاصيل الأسبوع"
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function closeWeek() {
    const confirmed = window.confirm(
      "هل أنت متأكد من إغلاق الأسبوع الحالي؟\n\n" +
        "سيتم حفظ جميع بيانات الأسبوع في الأرشيف " +
        "وإنشاء أسبوع جديد.\n\n" +
        "أرصدة المستخدمين لن تتغير."
    );

    if (!confirmed) {
      return;
    }

    try {
      setClosing(true);
      setMessage("");
      setError("");

      const token = await getToken();

      if (!token) {
        setError("جلسة الدخول غير موجودة");
        return;
      }

      const response = await fetch(
        "/api/admin/weeks",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "تعذر إغلاق الأسبوع"
        );
        return;
      }

      setMessage(
        result.message ||
          "تم إغلاق الأسبوع وبدء الأسبوع الجديد بنجاح"
      );

      await loadWeeks();
    } catch (err) {
      console.error(err);

      setError(
        "حدث خطأ أثناء إغلاق الأسبوع"
      );
    } finally {
      setClosing(false);
    }
  }

  useEffect(() => {
    loadWeeks();
  }, []);

  const currentWeek = weeks.find(
    (week) => !week.is_closed
  );

  const closedWeeks = weeks.filter(
    (week) => week.is_closed
  );

  function goTo(path: string) {
    window.location.href = path;
  }

  async function logout() {
    await supabase.auth.signOut();

    localStorage.removeItem("user");
    localStorage.removeItem(
      "access_token"
    );

    window.location.href = "/";
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#050505] text-white"
    >
      {/* =========================
          OVERLAY
      ========================== */}

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() =>
            setMenuOpen(false)
          }
        />
      )}

      {/* =========================
          SIDE MENU
      ========================== */}

      <aside
        className={`fixed right-0 top-0 z-50 h-full w-[285px] border-l border-white/10 bg-[#090909] shadow-2xl transition-transform duration-300 ${
          menuOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
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
              onClick={() =>
                setMenuOpen(false)
              }
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4">
            <p className="mb-2 px-3 text-[10px] font-bold text-white/30">
              الرئيسية
            </p>

            <MenuItem
              icon={
                <LayoutDashboard size={18} />
              }
              label="لوحة التحكم"
              onClick={() =>
                goTo("/admin")
              }
            />

            <MenuItem
              icon={<Bell size={18} />}
              label="الإشعارات"
              onClick={() =>
                goTo(
                  "/admin/notifications"
                )
              }
            />

            <p className="mb-2 mt-6 px-3 text-[10px] font-bold text-white/30">
              الإدارة
            </p>

            <MenuItem
              icon={<Users size={18} />}
              label="المستخدمون"
              onClick={() =>
                goTo("/admin/users")
              }
            />

            <MenuItem
              icon={
                <ClipboardList size={18} />
              }
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
                goTo(
                  "/admin/withdrawals"
                )
              }
            />

            <MenuItem
              icon={<Receipt size={18} />}
              label="الحركات المالية"
              onClick={() =>
                goTo(
                  "/admin/transactions"
                )
              }
            />

            <MenuItem
              icon={
                <CalendarDays size={18} />
              }
              label="الأسابيع"
              active
              onClick={() =>
                setMenuOpen(false)
              }
            />

            <p className="mb-2 mt-6 px-3 text-[10px] font-bold text-white/30">
              الحساب
            </p>

            <MenuItem
              icon={<Settings size={18} />}
              label="الإعدادات"
              onClick={() =>
                goTo("/admin/settings")
              }
            />
          </nav>

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

      {/* =========================
          PAGE
      ========================== */}

      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        {/* HEADER */}

        <header className="mb-6 flex items-center justify-between">
          <button
            onClick={() =>
              setMenuOpen(true)
            }
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#0d0d0d] text-white/70 transition hover:border-[#d6a84f]/30 hover:text-[#d6a84f]"
          >
            <Menu size={20} />
          </button>

          <div className="text-center">
            <h1 className="text-lg font-black tracking-wide text-[#d6a84f]">
              أهل القمة
            </h1>

            <p className="mt-0.5 text-[11px] text-white/40">
              إدارة الأسابيع
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d6a84f]/20 bg-[#d6a84f]/5">
            <CalendarDays
              size={19}
              className="text-[#d6a84f]"
            />
          </div>
        </header>

        {/* PAGE TITLE */}

        <section className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight">
                إدارة الأسابيع
              </h2>

              <p className="mt-1 text-xs text-white/40">
                الأسبوع الحالي والأرشيف السابق
              </p>
            </div>

            <button
              onClick={closeWeek}
              disabled={
                closing || !currentWeek
              }
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#d6a84f] px-5 text-xs font-black text-black transition hover:bg-[#e2b862] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {closing ? (
                <>
                  <RefreshCw
                    size={15}
                    className="animate-spin"
                  />

                  جاري الإغلاق...
                </>
              ) : (
                <>
                  <Archive size={15} />

                  إغلاق الأسبوع الحالي
                </>
              )}
            </button>
          </div>
        </section>

        {/* SUCCESS */}

        {message && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0 text-emerald-400"
            />

            <p className="text-xs font-bold leading-6 text-emerald-300">
              {message}
            </p>
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3">
            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0 text-red-400"
            />

            <p className="text-xs font-bold leading-6 text-red-300">
              {error}
            </p>
          </div>
        )}

        {/* =========================
            CURRENT WEEK
        ========================== */}

        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d6a84f]/10 text-[#d6a84f]">
              <Clock3 size={15} />
            </div>

            <div>
              <h3 className="text-sm font-black">
                الأسبوع الحالي
              </h3>

              <p className="text-[10px] text-white/30">
                الفترة المفتوحة حاليًا
              </p>
            </div>
          </div>

          {loading ? (
            <LoadingCard text="جاري تحميل بيانات الأسبوع..." />
          ) : currentWeek ? (
            <div className="rounded-3xl border border-white/10 bg-[#0a0a0a] p-4 shadow-2xl sm:p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <InfoBox
                  label="بداية الأسبوع"
                  value={formatDate(
                    currentWeek.start_at
                  )}
                  icon={
                    <CalendarDays
                      size={15}
                    />
                  }
                />

                <InfoBox
                  label="نهاية الأسبوع"
                  value={formatDate(
                    currentWeek.end_at
                  )}
                  icon={
                    <CalendarDays
                      size={15}
                    />
                  }
                />

                <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/5 p-4">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2
                      size={15}
                    />

                    <span className="text-[10px] font-bold">
                      حالة الأسبوع
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-black text-emerald-300">
                    مفتوح
                  </p>

                  <p className="mt-1 text-[9px] text-emerald-400/50">
                    العمليات الجديدة تسجل هنا
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#d6a84f]/15 bg-[#d6a84f]/5 p-4">
                <AlertTriangle
                  size={16}
                  className="mt-0.5 shrink-0 text-[#d6a84f]"
                />

                <div>
                  <p className="text-[10px] font-black text-[#d6a84f]">
                    تنبيه
                  </p>

                  <p className="mt-1 text-[10px] leading-6 text-white/40">
                    عند إغلاق الأسبوع يتم حفظ
                    بياناته في الأرشيف وإنشاء أسبوع
                    جديد. أرصدة المستخدمين لا يتم
                    تصفيرها.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-red-500/20 bg-[#0a0a0a] p-8 text-center">
              <AlertTriangle
                size={24}
                className="mx-auto text-red-400"
              />

              <p className="mt-3 text-xs font-bold text-red-300">
                لا يوجد أسبوع مفتوح حاليًا
              </p>
            </div>
          )}
        </section>

        {/* =========================
            ARCHIVE
        ========================== */}

        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-black">
                أرشيف الأسابيع
              </h3>

              <p className="mt-1 text-[10px] text-white/30">
                اضغط على الأسبوع لعرض تفاصيله
              </p>
            </div>

            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-black text-white/40">
              {closedWeeks.length} أسبوع
            </div>
          </div>

          {loading ? (
            <LoadingCard text="جاري تحميل الأرشيف..." />
          ) : closedWeeks.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#0a0a0a] p-10 text-center">
              <Archive
                size={28}
                className="mx-auto text-white/20"
              />

              <h3 className="mt-4 text-sm font-black text-white/60">
                لا يوجد أرشيف حتى الآن
              </h3>

              <p className="mt-1 text-[10px] text-white/25">
                سيظهر الأسبوع هنا بعد إغلاقه.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {closedWeeks.map(
                (week, index) => (
                  <button
                    key={week.id}
                    onClick={() =>
                      loadWeekDetails(
                        week.id
                      )
                    }
                    className="group w-full rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 text-right transition hover:border-[#d6a84f]/25 hover:bg-[#0d0d0d] sm:p-5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[#d6a84f]">
                        <Archive
                          size={18}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black text-white">
                            أسبوع #
                            {closedWeeks.length -
                              index}
                          </span>

                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[8px] font-bold text-white/35">
                            مغلق
                          </span>
                        </div>

                        <p className="mt-2 truncate text-[10px] text-white/35">
                          {formatDate(
                            week.start_at
                          )}{" "}
                          —{" "}
                          {formatDate(
                            week.end_at
                          )}
                        </p>
                      </div>

                      <ChevronLeft
                        size={17}
                        className="shrink-0 text-white/20 transition group-hover:-translate-x-1 group-hover:text-[#d6a84f]"
                      />
                    </div>
                  </button>
                )
              )}
            </div>
          )}
        </section>

        {/* FOOTER */}

        <div className="mt-8 flex items-center justify-center gap-2 text-[9px] text-white/15">
          <CalendarDays size={11} />

          أهل القمة • إدارة الأسابيع
        </div>
      </div>

      {/* =========================
          DETAILS DRAWER
      ========================== */}

      {(detailsLoading ||
        selectedWeek ||
        detailsError) && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            onClick={() => {
              if (!detailsLoading) {
                setSelectedWeek(null);
                setDetailsError("");
              }
            }}
          />

          <section className="fixed bottom-0 right-0 top-0 z-[70] flex w-full flex-col border-l border-white/10 bg-[#090909] shadow-2xl sm:max-w-4xl">
            {/* DRAWER HEADER */}

            <div className="shrink-0 border-b border-white/10 bg-[#090909] px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-base font-black text-white">
                    أرشيف الأسبوع
                  </h2>

                  {selectedWeek && (
                    <p className="mt-1 truncate text-[10px] text-white/30">
                      {formatDate(
                        selectedWeek.week
                          .start_at
                      )}{" "}
                      —{" "}
                      {formatDate(
                        selectedWeek.week.end_at
                      )}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => {
                    setSelectedWeek(null);
                    setDetailsError("");
                  }}
                  disabled={detailsLoading}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 transition hover:text-white disabled:opacity-40"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* LOADING */}

            {detailsLoading && (
              <div className="flex flex-1 flex-col items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d6a84f]/20 bg-[#d6a84f]/5">
                  <RefreshCw
                    size={21}
                    className="animate-spin text-[#d6a84f]"
                  />
                </div>

                <p className="mt-4 text-xs font-bold text-white/40">
                  جاري تحميل أرشيف الأسبوع...
                </p>
              </div>
            )}

            {/* ERROR */}

            {!detailsLoading &&
              detailsError && (
                <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                    <AlertTriangle
                      size={22}
                    />
                  </div>

                  <p className="mt-4 text-xs font-bold text-red-300">
                    {detailsError}
                  </p>

                  <button
                    onClick={() => {
                      setDetailsError("");
                      setSelectedWeek(null);
                    }}
                    className="mt-5 rounded-xl bg-white/5 px-5 py-2.5 text-xs font-bold text-white/60 transition hover:bg-white/10 hover:text-white"
                  >
                    إغلاق
                  </button>
                </div>
              )}

            {/* DETAILS */}

            {!detailsLoading &&
              !detailsError &&
              selectedWeek && (
                <div className="flex min-h-0 flex-1 flex-col">
                  {/* STATS */}

                  <div className="shrink-0 border-b border-white/10 px-4 py-4 sm:px-6">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <MiniStat
                        label="النشطون"
                        value={
                          selectedWeek.stats
                            .activeUsers
                        }
                        icon={
                          <Users size={14} />
                        }
                      />

                      <MiniStat
                        label="الإنتاج"
                        value={formatMoney(
                          selectedWeek.stats
                            .totalProduced
                        )}
                        icon={
                          <TrendingUp
                            size={14}
                          />
                        }
                      />

                      <MiniStat
                        label="الاستهلاك"
                        value={formatMoney(
                          selectedWeek.stats
                            .totalConsumed
                        )}
                        icon={
                          <TrendingDown
                            size={14}
                          />
                        }
                      />

                      <MiniStat
                        label="الطلبات"
                        value={
                          selectedWeek.stats
                            .ordersCount
                        }
                        icon={
                          <ClipboardList
                            size={14}
                          />
                        }
                      />
                    </div>
                  </div>

                  {/* TABS */}

                  <div className="shrink-0 border-b border-white/10 px-4 sm:px-6">
                    <div className="flex gap-2 overflow-x-auto py-3">
                      <TabButton
                        active={
                          detailsTab ===
                          "users"
                        }
                        onClick={() =>
                          setDetailsTab(
                            "users"
                          )
                        }
                        icon={
                          <Users size={14} />
                        }
                        label="المستخدمون"
                      />

                      <TabButton
                        active={
                          detailsTab ===
                          "orders"
                        }
                        onClick={() =>
                          setDetailsTab(
                            "orders"
                          )
                        }
                        icon={
                          <ClipboardList
                            size={14}
                          />
                        }
                        label="الطلبات"
                      />

                      <TabButton
                        active={
                          detailsTab ===
                          "transactions"
                        }
                        onClick={() =>
                          setDetailsTab(
                            "transactions"
                          )
                        }
                        icon={
                          <Receipt size={14} />
                        }
                        label="المعاملات"
                      />
                    </div>
                  </div>

                  {/* TAB CONTENT */}

                  <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                    {detailsTab ===
                      "users" && (
                      <UsersTab
                        users={
                          selectedWeek.users
                        }
                        stats={
                          selectedWeek.stats
                        }
                      />
                    )}

                    {detailsTab ===
                      "orders" && (
                      <OrdersTab
                        orders={
                          selectedWeek.orders
                        }
                      />
                    )}

                    {detailsTab ===
                      "transactions" && (
                      <TransactionsTab
                        transactions={
                          selectedWeek.transactions
                        }
                      />
                    )}
                  </div>
                </div>
              )}
          </section>
        </>
      )}
    </main>
  );
}

/* =========================
   MENU ITEM
========================= */

function MenuItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
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
    </button>
  );
}

/* =========================
   INFO BOX
========================= */

function InfoBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-center gap-2 text-white/35">
        {icon}

        <span className="text-[10px] font-bold">
          {label}
        </span>
      </div>

      <p className="mt-2 text-xs font-black text-white">
        {value}
      </p>
    </div>
  );
}

/* =========================
   MINI STAT
========================= */

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
      <div className="flex items-center gap-2 text-[#d6a84f]">
        {icon}

        <span className="text-[9px] font-bold text-white/35">
          {label}
        </span>
      </div>

      <p className="mt-2 truncate text-sm font-black text-white">
        {value}
      </p>
    </div>
  );
}

/* =========================
   TAB BUTTON
========================= */

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-[10px] font-black transition ${
        active
          ? "bg-[#d6a84f] text-black"
          : "border border-white/10 bg-white/5 text-white/40 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* =========================
   USERS TAB
========================= */

function UsersTab({
  users,
  stats,
}: {
  users: UserActivity[];
  stats: WeekDetails["stats"];
}) {
  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat
          label="إجمالي المستخدمين"
          value={stats.totalUsers}
          icon={<Users size={14} />}
        />

        <MiniStat
          label="المستخدمون النشطون"
          value={stats.activeUsers}
          icon={
            <CheckCircle2 size={14} />
          }
        />

        <MiniStat
          label="عمليات الإنتاج"
          value={stats.producedOrders}
          icon={
            <TrendingUp size={14} />
          }
        />

        <MiniStat
          label="عمليات الاستهلاك"
          value={stats.consumedOrders}
          icon={
            <TrendingDown size={14} />
          }
        />
      </div>

      {/* MOBILE */}

      <div className="space-y-2 md:hidden">
        {users.length === 0 ? (
          <EmptyState text="لا توجد بيانات مستخدمين لهذا الأسبوع." />
        ) : (
          users.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-white">
                    {item.user
                      ?.full_name ||
                      "مستخدم"}
                  </p>

                  <p className="mt-1 text-[9px] text-white/30">
                    {item.user?.phone ||
                      "—"}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-black ${
                    item.is_active
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-white/5 text-white/30"
                  }`}
                >
                  {item.is_active
                    ? "نشط"
                    : "غير نشط"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <SmallValue
                  label="الإنتاج"
                  value={formatMoney(
                    Number(
                      item.produced_total
                    )
                  )}
                  sub={`${item.produced_count} عملية`}
                />

                <SmallValue
                  label="الاستهلاك"
                  value={formatMoney(
                    Number(
                      item.consumed_total
                    )
                  )}
                  sub={`${item.consumed_count} عملية`}
                />

                <SmallValue
                  label="الأرضية"
                  value={
                    item.floor_charged
                      ? "1 د.أ"
                      : "—"
                  }
                  sub={
                    item.floor_charged
                      ? "تم احتسابها"
                      : "غير محتسبة"
                  }
                />

                <SmallValue
                  label="الرصيد الحالي"
                  value={formatMoney(
                    Number(
                      item.user
                        ?.balance || 0
                    )
                  )}
                  sub="الرصيد الحالي"
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP */}

      <div className="hidden overflow-x-auto rounded-2xl border border-white/10 md:block">
        {users.length === 0 ? (
          <div className="p-10">
            <EmptyState text="لا توجد بيانات مستخدمين لهذا الأسبوع." />
          </div>
        ) : (
          <table className="w-full min-w-[850px] text-right">
            <thead className="bg-white/[0.025]">
              <tr className="border-b border-white/10">
                <th className="px-5 py-4 text-[10px] font-black text-white/35">
                  المستخدم
                </th>

                <th className="px-5 py-4 text-[10px] font-black text-white/35">
                  الحالة
                </th>

                <th className="px-5 py-4 text-[10px] font-black text-white/35">
                  الإنتاج
                </th>

                <th className="px-5 py-4 text-[10px] font-black text-white/35">
                  الاستهلاك
                </th>

                <th className="px-5 py-4 text-[10px] font-black text-white/35">
                  الأرضية
                </th>

                <th className="px-5 py-4 text-[10px] font-black text-white/35">
                  الرصيد
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.06]">
              {users.map((item) => (
                <tr
                  key={item.id}
                  className="transition hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-4">
                    <p className="text-xs font-black text-white">
                      {item.user
                        ?.full_name ||
                        "مستخدم"}
                    </p>

                    <p className="mt-1 text-[9px] text-white/30">
                      {item.user?.phone ||
                        "—"}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[9px] font-black ${
                        item.is_active
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-white/5 text-white/30"
                      }`}
                    >
                      {item.is_active
                        ? "نشط"
                        : "غير نشط"}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-xs font-black text-white">
                      {formatMoney(
                        Number(
                          item.produced_total
                        )
                      )}
                    </p>

                    <p className="mt-1 text-[9px] text-white/25">
                      {item.produced_count}{" "}
                      عملية
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-xs font-black text-white">
                      {formatMoney(
                        Number(
                          item.consumed_total
                        )
                      )}
                    </p>

                    <p className="mt-1 text-[9px] text-white/25">
                      {item.consumed_count}{" "}
                      عملية
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    {item.floor_charged ? (
                      <span className="rounded-full bg-[#d6a84f]/10 px-2.5 py-1 text-[9px] font-black text-[#d6a84f]">
                        1 د.أ
                      </span>
                    ) : (
                      <span className="text-[9px] text-white/25">
                        غير محتسبة
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-xs font-black text-white">
                    {formatMoney(
                      Number(
                        item.user?.balance ||
                          0
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* =========================
   ORDERS TAB
========================= */

function OrdersTab({
  orders,
}: {
  orders: any[];
}) {
  if (orders.length === 0) {
    return (
      <EmptyState text="لا توجد طلبات مسجلة لهذا الأسبوع." />
    );
  }

  return (
    <div>
      {/* MOBILE */}

      <div className="space-y-2 md:hidden">
        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black text-white">
                #{order.order_number}
              </p>

              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[8px] font-black text-white/40">
                {getOrderStatusLabel(
                  order.status
                )}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <SmallValue
                label="النوع"
                value={getOrderTypeLabel(
                  order.order_type
                )}
                sub=""
              />

              <SmallValue
                label="المبلغ"
                value={formatMoney(
                  Number(
                    order.amount || 0
                  )
                )}
                sub=""
              />

              <SmallValue
                label="العمولة"
                value={formatMoney(
                  Number(
                    order.commission_amount ||
                      0
                  )
                )}
                sub={`${Number(
                  order.commission_rate ||
                    0
                )}%`}
              />

              <SmallValue
                label="التاريخ"
                value={formatDate(
                  order.created_at
                )}
                sub=""
              />
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP */}

      <div className="hidden overflow-x-auto rounded-2xl border border-white/10 md:block">
        <table className="w-full min-w-[850px] text-right">
          <thead className="bg-white/[0.025]">
            <tr className="border-b border-white/10">
              <th className="px-5 py-4 text-[10px] font-black text-white/35">
                رقم الطلب
              </th>

              <th className="px-5 py-4 text-[10px] font-black text-white/35">
                النوع
              </th>

              <th className="px-5 py-4 text-[10px] font-black text-white/35">
                المبلغ
              </th>

              <th className="px-5 py-4 text-[10px] font-black text-white/35">
                العمولة
              </th>

              <th className="px-5 py-4 text-[10px] font-black text-white/35">
                الحالة
              </th>

              <th className="px-5 py-4 text-[10px] font-black text-white/35">
                التاريخ
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.06]">
            {orders.map((order) => (
              <tr
                key={order.id}
                className="transition hover:bg-white/[0.02]"
              >
                <td className="px-5 py-4 text-xs font-black text-white">
                  #{order.order_number}
                </td>

                <td className="px-5 py-4 text-xs text-white/50">
                  {getOrderTypeLabel(
                    order.order_type
                  )}
                </td>

                <td className="px-5 py-4 text-xs font-black text-white">
                  {formatMoney(
                    Number(
                      order.amount || 0
                    )
                  )}
                </td>

                <td className="px-5 py-4">
                  <p className="text-xs font-black text-white">
                    {formatMoney(
                      Number(
                        order.commission_amount ||
                          0
                      )
                    )}
                  </p>

                  <p className="mt-1 text-[9px] text-white/25">
                    {Number(
                      order.commission_rate ||
                        0
                    )}
                    %
                  </p>
                </td>

                <td className="px-5 py-4">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-black text-white/40">
                    {getOrderStatusLabel(
                      order.status
                    )}
                  </span>
                </td>

                <td className="px-5 py-4 text-[10px] text-white/30">
                  {formatDate(
                    order.created_at
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================
   TRANSACTIONS TAB
========================= */

function TransactionsTab({
  transactions,
}: {
  transactions: any[];
}) {
  if (transactions.length === 0) {
    return (
      <EmptyState text="لا توجد معاملات مالية لهذا الأسبوع." />
    );
  }

  return (
    <div>
      {/* MOBILE */}

      <div className="space-y-2 md:hidden">
        {transactions.map(
          (transaction) => {
            const amount = Number(
              transaction.amount || 0
            );

            return (
              <div
                key={transaction.id}
                className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[8px] font-black text-white/40">
                      {getTransactionLabel(
                        transaction.transaction_type
                      )}
                    </span>

                    <p className="mt-3 text-[10px] text-white/35">
                      {transaction.description ||
                        "بدون وصف"}
                    </p>
                  </div>

                  <p
                    className={`text-sm font-black ${
                      amount >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {amount >= 0
                      ? "+"
                      : ""}
                    {formatMoney(
                      amount
                    )}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <SmallValue
                    label="قبل"
                    value={formatMoney(
                      Number(
                        transaction.balance_before ||
                          0
                      )
                    )}
                    sub=""
                  />

                  <SmallValue
                    label="بعد"
                    value={formatMoney(
                      Number(
                        transaction.balance_after ||
                          0
                      )
                    )}
                    sub=""
                  />
                </div>

                <p className="mt-3 text-[9px] text-white/20">
                  {formatDate(
                    transaction.created_at
                  )}
                </p>
              </div>
            );
          }
        )}
      </div>

      {/* DESKTOP */}

      <div className="hidden overflow-x-auto rounded-2xl border border-white/10 md:block">
        <table className="w-full min-w-[850px] text-right">
          <thead className="bg-white/[0.025]">
            <tr className="border-b border-white/10">
              <th className="px-5 py-4 text-[10px] font-black text-white/35">
                النوع
              </th>

              <th className="px-5 py-4 text-[10px] font-black text-white/35">
                المبلغ
              </th>

              <th className="px-5 py-4 text-[10px] font-black text-white/35">
                قبل
              </th>

              <th className="px-5 py-4 text-[10px] font-black text-white/35">
                بعد
              </th>

              <th className="px-5 py-4 text-[10px] font-black text-white/35">
                الوصف
              </th>

              <th className="px-5 py-4 text-[10px] font-black text-white/35">
                التاريخ
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.06]">
            {transactions.map(
              (transaction) => {
                const amount = Number(
                  transaction.amount || 0
                );

                return (
                  <tr
                    key={transaction.id}
                    className="transition hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-4">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-black text-white/40">
                        {getTransactionLabel(
                          transaction.transaction_type
                        )}
                      </span>
                    </td>

                    <td
                      className={`px-5 py-4 text-xs font-black ${
                        amount >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {amount >= 0
                        ? "+"
                        : ""}
                      {formatMoney(
                        amount
                      )}
                    </td>

                    <td className="px-5 py-4 text-xs text-white/35">
                      {formatMoney(
                        Number(
                          transaction.balance_before ||
                            0
                        )
                      )}
                    </td>

                    <td className="px-5 py-4 text-xs font-black text-white">
                      {formatMoney(
                        Number(
                          transaction.balance_after ||
                            0
                        )
                      )}
                    </td>

                    <td className="max-w-[300px] px-5 py-4 text-[10px] text-white/35">
                      <div className="truncate">
                        {transaction.description ||
                          "—"}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-[10px] text-white/25">
                      {formatDate(
                        transaction.created_at
                      )}
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================
   SMALL VALUE
========================= */

function SmallValue({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
      <p className="text-[8px] font-bold text-white/25">
        {label}
      </p>

      <p className="mt-1 truncate text-[10px] font-black text-white/70">
        {value}
      </p>

      {sub && (
        <p className="mt-1 truncate text-[8px] text-white/20">
          {sub}
        </p>
      )}
    </div>
  );
}

/* =========================
   EMPTY STATE
========================= */

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
      <FileText
        size={24}
        className="mx-auto text-white/15"
      />

      <p className="mt-3 text-xs font-bold text-white/35">
        {text}
      </p>
    </div>
  );
}

/* =========================
   LOADING
========================= */

function LoadingCard({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-[#0a0a0a]">
      <RefreshCw
        size={21}
        className="animate-spin text-[#d6a84f]"
      />

      <p className="mt-3 text-xs font-bold text-white/30">
        {text}
      </p>
    </div>
  );
}