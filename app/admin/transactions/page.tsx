"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileText,
  Filter,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Receipt,
  Search,
  Settings,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
  CircleDollarSign,
  ArrowUpRight,
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

type User = {
  id: string;
  full_name: string;
  phone: string;
  role: string;
  balance: number;
  is_active: boolean;
};

type Transaction = {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  order_id: string | null;
  week_id: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  user: User | null;
};

type Stats = {
  totalTransactions: number;
  totalPositive: number;
  totalNegative: number;
  typeStats: Record<string, number>;
};

const TYPE_OPTIONS = [
  ["all", "جميع الأنواع"],
  ["production", "إنتاج"],
  ["consumption", "استهلاك"],
  ["floor", "أرضية"],
  ["withdrawal", "سحب"],
  ["withdrawal_reversal", "إرجاع سحب"],
  ["adjustment", "تعديل"],
];

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("ar-JO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))} د.أ`;
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ar-JO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Amman",
  }).format(new Date(dateString));
}

function formatWeekDate(dateString: string) {
  return new Intl.DateTimeFormat("ar-JO", {
    dateStyle: "medium",
    timeZone: "Asia/Amman",
  }).format(new Date(dateString));
}

function getTransactionLabel(type: string) {
  const labels: Record<string, string> = {
    production: "إنتاج",
    consumption: "استهلاك",
    floor: "أرضية",
    withdrawal: "سحب",
    withdrawal_reversal: "إرجاع سحب",
    adjustment: "تعديل",
  };

  return labels[type] || type;
}

function getTransactionIcon(type: string) {
  switch (type) {
    case "production":
      return <TrendingUp size={15} />;

    case "consumption":
      return <TrendingDown size={15} />;

    case "floor":
      return <CircleDollarSign size={15} />;

    case "withdrawal":
      return <ArrowUpRight size={15} />;

    case "withdrawal_reversal":
      return <RefreshCw size={15} />;

    case "adjustment":
      return <Receipt size={15} />;

    default:
      return <Receipt size={15} />;
  }
}

function getTransactionClass(type: string) {
  const classes: Record<string, string> = {
    production:
      "border-emerald-400/20 bg-emerald-500/10 text-emerald-400",

    consumption:
      "border-red-400/20 bg-red-500/10 text-red-400",

    floor:
      "border-amber-400/20 bg-amber-500/10 text-amber-300",

    withdrawal:
      "border-purple-400/20 bg-purple-500/10 text-purple-300",

    withdrawal_reversal:
      "border-cyan-400/20 bg-cyan-500/10 text-cyan-300",

    adjustment:
      "border-[#292d33] bg-[#15191f] text-[#a1a1aa]/55",
  };

  return (
    classes[type] ||
    "border-[#292d33] bg-[#15191f] text-[#a1a1aa]/55"
  );
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [weeks, setWeeks] = useState<Week[]>([]);

  const [stats, setStats] = useState<Stats>({
    totalTransactions: 0,
    totalPositive: 0,
    totalNegative: 0,
    typeStats: {},
  });

  const [users, setUsers] = useState<User[]>([]);

  const [selectedWeekId, setSelectedWeekId] =
    useState<string>("current");

  const [selectedType, setSelectedType] =
    useState<string>("all");

  const [selectedUserId, setSelectedUserId] =
    useState<string>("all");

  const [search, setSearch] = useState<string>("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadWeeks() {
    try {
      const token = await getToken();

      if (!token) {
        setError("جلسة الدخول غير موجودة");
        return;
      }

      const response = await fetch("/api/admin/weeks", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error || "تعذر تحميل الأسابيع"
        );
        return;
      }

      setWeeks(result.weeks || []);
    } catch (err) {
      console.error(err);
      setError("تعذر تحميل الأسابيع");
    }
  }

  async function loadTransactions() {
    try {
      setLoading(true);
      setError("");

      const token = await getToken();

      if (!token) {
        setError("جلسة الدخول غير موجودة");
        return;
      }

      const params = new URLSearchParams();

      if (selectedWeekId === "all") {
        params.set("all", "true");
      } else if (selectedWeekId !== "current") {
        params.set("weekId", selectedWeekId);
      }

      if (selectedType !== "all") {
        params.set("type", selectedType);
      }

      if (selectedUserId !== "all") {
        params.set("userId", selectedUserId);
      }

      if (search.trim()) {
        params.set("search", search.trim());
      }

      params.set("limit", "1000");

      const response = await fetch(
        `/api/admin/transactions?${params.toString()}`,
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
            "تعذر تحميل الحركات المالية"
        );
        return;
      }

      const loadedTransactions =
        result.transactions || [];

      setTransactions(loadedTransactions);

      setStats(
        result.stats || {
          totalTransactions: 0,
          totalPositive: 0,
          totalNegative: 0,
          typeStats: {},
        }
      );

      const uniqueUsers = new Map<
        string,
        User
      >();

      loadedTransactions.forEach(
        (transaction: Transaction) => {
          if (
            transaction.user &&
            !uniqueUsers.has(
              transaction.user.id
            )
          ) {
            uniqueUsers.set(
              transaction.user.id,
              transaction.user
            );
          }
        }
      );

      setUsers(
        Array.from(uniqueUsers.values())
      );
    } catch (err) {
      console.error(err);

      setError(
        "حدث خطأ أثناء تحميل الحركات المالية"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWeeks();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [
    selectedWeekId,
    selectedType,
    selectedUserId,
    search,
  ]);

  const selectedWeek =
    selectedWeekId === "current"
      ? weeks.find(
          (week) => !week.is_closed
        )
      : weeks.find(
          (week) =>
            week.id === selectedWeekId
        );

  const weekLabel = selectedWeek
    ? `${formatWeekDate(
        selectedWeek.start_at
      )} — ${formatWeekDate(
        selectedWeek.end_at
      )}`
    : selectedWeekId === "all"
    ? "جميع الحركات المالية"
    : "الأسبوع الحالي";

  function goTo(path: string) {
    window.location.href = path;
  }

  async function logout() {
    await supabase.auth.signOut();

    localStorage.removeItem("user");
    localStorage.removeItem("access_token");

    window.location.href = "/";
  }

  const netAmount =
    stats.totalPositive -
    stats.totalNegative;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#0b0d10] text-[#f3f4f6]"
    >
      {/* =========================
          OVERLAY
      ========================== */}

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* =========================
          SIDE MENU
      ========================== */}

      <aside
        className={`fixed right-0 top-0 z-50 h-full w-[285px] border-l border-[#292d33] bg-[#11151a] shadow-2xl transition-transform duration-300 ${
          menuOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[#292d33] px-5 py-5">
            <div>
              <h2 className="text-lg font-black text-[#d6a84f]">
                أهل القمة
              </h2>

              <p className="mt-1 text-[11px] text-[#a1a1aa]/40">
                لوحة تحكم الإدارة
              </p>
            </div>

            <button
              onClick={() =>
                setMenuOpen(false)
              }
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#292d33] bg-[#15191f] text-[#a1a1aa]/60 transition hover:bg-white/10 hover:text-[#f3f4f6]"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4">
            <div className="mb-2 px-3 text-[10px] font-bold text-[#a1a1aa]/30">
              الرئيسية
            </div>

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
                goTo("/admin/notifications")
              }
            />

            <div className="mb-2 mt-6 px-3 text-[10px] font-bold text-[#a1a1aa]/30">
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
              icon={
                <ClipboardList size={18} />
              }
              label="الطلبات"
              onClick={() =>
                goTo("/admin/orders")
              }
            />

            

            <MenuItem
              icon={<Wallet size={18} strokeWidth={1.8} />}
              label="الأرصدة"
              onClick={() => goTo("/admin/balances")}
            /><MenuItem
              icon={<CreditCard size={18} />}
              label="طلبات السحب"
              onClick={() =>
                goTo("/admin/withdrawals")
              }
            />

            <MenuItem
              icon={<Receipt size={18} />}
              label="الحركات المالية"
              active
              onClick={() =>
                setMenuOpen(false)
              }
            />

            <MenuItem
              icon={
                <CalendarDays size={18} />
              }
              label="الأسابيع"
              onClick={() =>
                goTo("/admin/weeks")
              }
            />

            <div className="mb-2 mt-6 px-3 text-[10px] font-bold text-[#a1a1aa]/30">
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

          <div className="border-t border-[#292d33] p-4">
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
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#292d33] bg-[#0b1015] text-[#a1a1aa]/70 transition hover:border-[#d6a84f]/30 hover:text-[#d6a84f]"
            aria-label="فتح القائمة"
          >
            <Menu size={20} />
          </button>

          <div className="text-center">
            <h1 className="text-lg font-black tracking-wide text-[#d6a84f]">
              أهل القمة
            </h1>

            <p className="mt-0.5 text-[11px] text-[#a1a1aa]/40">
              الحركات المالية
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d6a84f]/20 bg-[#d6a84f]/5">
            <Receipt
              size={19}
              className="text-[#d6a84f]"
            />
          </div>
        </header>

        {/* TITLE */}

        <section className="mb-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[#f3f4f6]">
                الحركات المالية
              </h2>

              <p className="mt-1 text-xs text-[#a1a1aa]/40">
                سجل جميع الحركات المالية حسب الفترة
              </p>
            </div>

            <button
              onClick={loadTransactions}
              disabled={loading}
              className="flex h-10 items-center gap-2 rounded-xl border border-[#292d33] bg-[#15191f] px-3 text-xs font-bold text-[#a1a1aa]/70 transition hover:border-[#d6a84f]/30 hover:text-[#d6a84f] disabled:opacity-50"
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

        {/* =========================
            FILTERS
        ========================== */}

        <section className="mb-5 rounded-3xl border border-[#292d33] bg-[#11151a] p-4 shadow-2xl shadow-black/10 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
              <Filter size={17} />
            </div>

            <div>
              <h3 className="text-sm font-black text-[#f3f4f6]">
                تصفية الحركات
              </h3>

              <p className="mt-1 text-[10px] text-[#a1a1aa]/35">
                اختر الفترة ونوع الحركة والمستخدم
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <DarkSelect
              label="الفترة المالية"
              value={selectedWeekId}
              onChange={setSelectedWeekId}
              icon={
                <CalendarDays size={15} />
              }
            >
              <option value="current">
                الأسبوع الحالي
              </option>

              <option value="all">
                جميع الحركات
              </option>

              {weeks
                .filter(
                  (week) =>
                    week.is_closed
                )
                .map((week) => (
                  <option
                    key={week.id}
                    value={week.id}
                  >
                    {formatWeekDate(
                      week.start_at
                    )}{" "}
                    —{" "}
                    {formatWeekDate(
                      week.end_at
                    )}{" "}
                    — مغلق
                  </option>
                ))}
            </DarkSelect>

            <DarkSelect
              label="نوع الحركة"
              value={selectedType}
              onChange={setSelectedType}
              icon={
                <Receipt size={15} />
              }
            >
              {TYPE_OPTIONS.map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                )
              )}
            </DarkSelect>

            <DarkSelect
              label="المستخدم"
              value={selectedUserId}
              onChange={setSelectedUserId}
              icon={
                <User size={15} />
              }
            >
              <option value="all">
                جميع المستخدمين
              </option>

              {users.map((user) => (
                <option
                  key={user.id}
                  value={user.id}
                >
                  {user.full_name} —{" "}
                  {user.phone}
                </option>
              ))}
            </DarkSelect>
          </div>

          {/* SEARCH */}

          <div className="mt-3">
            <label className="mb-2 block text-[10px] font-bold text-[#a1a1aa]/45">
              بحث
            </label>

            <div className="relative">
              <Search
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]/25"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="اسم المستخدم، الهاتف، الوصف، رقم الطلب..."
                className="w-full rounded-xl border border-[#292d33] bg-[#15191f] py-3 pl-4 pr-10 text-xs text-[#f3f4f6] outline-none transition placeholder:text-[#a1a1aa]/20 focus:border-[#d6a84f]/40"
              />
            </div>
          </div>
        </section>

        {/* CURRENT PERIOD */}

        <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#d6a84f]/15 bg-[#d6a84f]/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[9px] font-bold text-[#a1a1aa]/30">
              الفترة المعروضة
            </p>

            <p className="mt-1 text-xs font-black text-[#f3f4f6]">
              {weekLabel}
            </p>
          </div>

          {selectedWeek && (
            <span
              className={`w-fit rounded-full px-2.5 py-1 text-[9px] font-black ${
                selectedWeek.is_closed
                  ? "bg-[#15191f] text-[#a1a1aa]/40"
                  : "bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {selectedWeek.is_closed
                ? "أسبوع مغلق"
                : "الأسبوع الحالي"}
            </span>
          )}
        </section>

        {/* =========================
            STATS
        ========================== */}

        <section className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <StatCard
            icon={<Receipt size={17} />}
            label="إجمالي الحركات"
            value={stats.totalTransactions}
          />

          <StatCard
            icon={
              <TrendingUp size={17} />
            }
            label="الإضافات"
            value={formatMoney(
              stats.totalPositive
            )}
            success
          />

          <StatCard
            icon={
              <TrendingDown size={17} />
            }
            label="الخصومات"
            value={formatMoney(
              stats.totalNegative
            )}
            danger
          />

          <StatCard
            icon={
              <CircleDollarSign size={17} />
            }
            label="صافي الحركة"
            value={`${netAmount >= 0 ? "+" : ""}${formatMoney(
              netAmount
            )}`}
            gold
          />
        </section>

        {/* TYPE COUNTERS */}

        <section className="mb-5 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {[
              ["production", "إنتاج"],
              ["consumption", "استهلاك"],
              ["floor", "أرضية"],
                          ["withdrawal", "سحب"],
              [
                "withdrawal_reversal",
                "إرجاع سحب",
              ],
              ["adjustment", "تعديل"],
            ].map(
              ([type, label]) => (
                <button
                  key={type}
                  onClick={() =>
                    setSelectedType(type)
                  }
                  className={`rounded-xl border px-3 py-2 text-[10px] font-bold transition ${
                    selectedType === type
                      ? "border-[#d6a84f]/30 bg-[#d6a84f]/10 text-[#d6a84f]"
                      : "border-[#292d33] bg-[#11151a] text-[#a1a1aa]/40 hover:text-[#f3f4f6]"
                  }`}
                >
                  {label}{" "}
                  <span className="mr-1 text-[#a1a1aa]/60">
                    {stats.typeStats[
                      type
                    ] || 0}
                  </span>
                </button>
              )
            )}
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-red-300">
            <CircleAlertIcon />

            <p className="text-xs font-bold leading-6">
              {error}
            </p>
          </div>
        )}

        {/* =========================
            TRANSACTIONS
        ========================== */}

        <section className="overflow-hidden rounded-3xl border border-[#292d33] bg-[#11151a] shadow-2xl shadow-black/20">
          <div className="border-b border-[#292d33] px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-[#f3f4f6]">
                  سجل الحركات
                </h3>

                <p className="mt-1 text-[10px] text-[#a1a1aa]/35">
                  {transactions.length} حركة معروضة
                </p>
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d6a84f]/10 text-[#d6a84f]">
                <FileText size={15} />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d6a84f]/20 bg-[#d6a84f]/5">
                <RefreshCw
                  size={19}
                  className="animate-spin text-[#d6a84f]"
                />
              </div>

              <p className="text-xs font-bold text-[#a1a1aa]/40">
                جاري تحميل الحركات المالية...
              </p>
            </div>
          ) : transactions.length ===
            0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-5 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-[#292d33] bg-[#15191f]">
                <Receipt
                  size={25}
                  className="text-[#a1a1aa]/25"
                />
              </div>

              <h3 className="mt-4 text-sm font-black text-[#a1a1aa]/60">
                لا توجد حركات مالية
              </h3>

              <p className="mt-1 text-[10px] text-[#a1a1aa]/30">
                لا توجد حركات ضمن الفلاتر المحددة
              </p>
            </div>
          ) : (
            <>
              {/* MOBILE */}

              <div className="divide-y divide-white/[0.06] md:hidden">
                {transactions.map(
                  (transaction) => {
                    const amount =
                      Number(
                        transaction.amount ||
                          0
                      );

                    return (
                      <button
                        key={
                          transaction.id
                        }
                        onClick={() =>
                          setSelectedTransaction(
                            transaction
                          )
                        }
                        className="block w-full p-4 text-right transition hover:bg-white/[0.02]"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${getTransactionClass(
                              transaction.transaction_type
                            )}`}
                          >
                            {getTransactionIcon(
                              transaction.transaction_type
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-black text-[#f3f4f6]">
                                  {transaction
                                    .user
                                    ?.full_name ||
                                    "مستخدم"}
                                </p>

                                <p className="mt-1 text-[9px] text-[#a1a1aa]/30">
                                  {transaction
                                    .user
                                    ?.phone ||
                                    "—"}
                                </p>
                              </div>

                              <span
                                className={`shrink-0 text-sm font-black ${
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
                              </span>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3">
                              <span
                                className={`rounded-full border px-2 py-1 text-[9px] font-black ${getTransactionClass(
                                  transaction.transaction_type
                                )}`}
                              >
                                {getTransactionLabel(
                                  transaction.transaction_type
                                )}
                              </span>

                              <span className="text-[9px] text-[#a1a1aa]/25">
                                {formatDate(
                                  transaction.created_at
                                )}
                              </span>
                            </div>

                            {transaction.description && (
                              <p className="mt-2 truncate text-[9px] text-[#a1a1aa]/30">
                                {
                                  transaction.description
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>

              {/* DESKTOP */}

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1100px] text-right">
                  <thead>
                    <tr className="border-b border-[#292d33] bg-white/[0.02]">
                      <th className="px-5 py-4 text-[10px] font-black text-[#a1a1aa]/35">
                        المستخدم
                      </th>

                      <th className="px-5 py-4 text-[10px] font-black text-[#a1a1aa]/35">
                        الحركة
                      </th>

                      <th className="px-5 py-4 text-[10px] font-black text-[#a1a1aa]/35">
                        المبلغ
                      </th>

                      <th className="px-5 py-4 text-[10px] font-black text-[#a1a1aa]/35">
                        قبل
                      </th>

                      <th className="px-5 py-4 text-[10px] font-black text-[#a1a1aa]/35">
                        بعد
                      </th>

                      <th className="px-5 py-4 text-[10px] font-black text-[#a1a1aa]/35">
                        الوصف
                      </th>

                      <th className="px-5 py-4 text-[10px] font-black text-[#a1a1aa]/35">
                        التاريخ
                      </th>

                      <th className="px-5 py-4 text-[10px] font-black text-[#a1a1aa]/35">
                        التفاصيل
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.06]">
                    {transactions.map(
                      (transaction) => {
                        const amount =
                          Number(
                            transaction.amount ||
                              0
                          );

                        return (
                          <tr
                            key={
                              transaction.id
                            }
                            className="transition hover:bg-white/[0.02]"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
                                  <User
                                    size={15}
                                  />
                                </div>

                                <div>
                                  <p className="text-xs font-black text-[#f3f4f6]">
                                    {transaction
                                      .user
                                      ?.full_name ||
                                      "مستخدم"}
                                  </p>

                                  <p className="mt-1 text-[9px] text-[#a1a1aa]/30">
                                    {transaction
                                      .user
                                      ?.phone ||
                                      "—"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black ${getTransactionClass(
                                  transaction.transaction_type
                                )}`}
                              >
                                {getTransactionIcon(
                                  transaction.transaction_type
                                )}

                                {getTransactionLabel(
                                  transaction.transaction_type
                                )}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <span
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
                              </span>
                            </td>

                            <td className="px-5 py-4 text-xs text-[#a1a1aa]/45">
                              {formatMoney(
                                Number(
                                  transaction.balance_before
                                )
                              )}
                            </td>

                            <td className="px-5 py-4 text-xs font-black text-[#f3f4f6]">
                              {formatMoney(
                                Number(
                                  transaction.balance_after
                                )
                              )}
                            </td>

                            <td className="max-w-[260px] px-5 py-4">
                              <div className="truncate text-[10px] text-[#a1a1aa]/40">
                                {transaction.description ||
                                  "—"}
                              </div>
                            </td>

                            <td className="px-5 py-4 text-[10px] text-[#a1a1aa]/30">
                              {formatDate(
                                transaction.created_at
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <button
                                onClick={() =>
                                  setSelectedTransaction(
                                    transaction
                                  )
                                }
                                className="flex items-center gap-1.5 rounded-lg border border-[#292d33] bg-[#15191f] px-3 py-2 text-[10px] font-bold text-[#a1a1aa]/55 transition hover:border-[#d6a84f]/30 hover:text-[#d6a84f]"
                              >
                                <FileText
                                  size={13}
                                />

                                تفاصيل
                              </button>
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

        {/* FOOTER */}

        <div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-[#a1a1aa]/20">
          <Receipt size={11} />

          <span>
            أهل القمة • الحركات المالية
          </span>
        </div>
      </div>

      {/* =========================
          DETAILS MODAL
      ========================== */}

      {selectedTransaction && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() =>
            setSelectedTransaction(null)
          }
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#292d33] bg-[#11151a] shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            {/* MODAL HEADER */}

            <div className="sticky top-0 z-10 border-b border-[#292d33] bg-[#11151a] px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-black text-[#f3f4f6]">
                    تفاصيل الحركة المالية
                  </h2>

                  <p className="mt-1 text-[10px] text-[#a1a1aa]/30">
                    {formatDate(
                      selectedTransaction.created_at
                    )}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setSelectedTransaction(null)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#292d33] bg-[#15191f] text-[#a1a1aa]/50 transition hover:text-[#f3f4f6]"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="space-y-3 p-5">
              {/* USER */}

              <div className="rounded-2xl border border-[#292d33] bg-white/[0.025] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
                    <User size={17} />
                  </div>

                  <div>
                    <p className="text-[9px] text-[#a1a1aa]/30">
                      المستخدم
                    </p>

                    <p className="mt-1 text-sm font-black text-[#f3f4f6]">
                      {selectedTransaction
                        .user?.full_name ||
                        "مستخدم"}
                    </p>

                    <p className="mt-1 text-[10px] text-[#a1a1aa]/35">
                      {selectedTransaction
                        .user?.phone ||
                        "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* AMOUNT */}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#292d33] bg-white/[0.025] p-4">
                  <p className="text-[9px] text-[#a1a1aa]/30">
                    نوع الحركة
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border ${getTransactionClass(
                        selectedTransaction.transaction_type
                      )}`}
                    >
                      {getTransactionIcon(
                        selectedTransaction.transaction_type
                      )}
                    </span>

                    <span className="text-xs font-black text-[#f3f4f6]">
                      {getTransactionLabel(
                        selectedTransaction.transaction_type
                      )}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#292d33] bg-white/[0.025] p-4">
                  <p className="text-[9px] text-[#a1a1aa]/30">
                    مبلغ الحركة
                  </p>

                  <p
                    className={`mt-2 text-xl font-black ${
                      Number(
                        selectedTransaction.amount
                      ) >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {Number(
                      selectedTransaction.amount
                    ) >= 0
                      ? "+"
                      : ""}
                    {formatMoney(
                      Number(
                        selectedTransaction.amount
                      )
                    )}
                  </p>
                </div>
              </div>

              {/* BALANCE */}

              <div className="grid gap-3 sm:grid-cols-2">
                <DetailCard
                  label="الرصيد قبل الحركة"
                  value={formatMoney(
                    Number(
                      selectedTransaction.balance_before
                    )
                  )}
                />

                <DetailCard
                  label="الرصيد بعد الحركة"
                  value={formatMoney(
                    Number(
                      selectedTransaction.balance_after
                    )
                  )}
                  gold
                />
              </div>

              {/* DESCRIPTION */}

              <div className="rounded-2xl border border-[#292d33] bg-white/[0.025] p-4">
                <p className="text-[9px] text-[#a1a1aa]/30">
                  الوصف
                </p>

                <p className="mt-2 text-xs leading-6 text-[#a1a1aa]/55">
                  {selectedTransaction.description ||
                    "لا يوجد وصف"}
                </p>
              </div>

              {/* ORDER */}

              {selectedTransaction.order_id && (
                <div className="rounded-2xl border border-[#292d33] bg-white/[0.025] p-4">
                  <p className="text-[9px] text-[#a1a1aa]/30">
                    معرف الطلب
                  </p>

                  <p className="mt-2 break-all font-mono text-[10px] text-[#a1a1aa]/45">
                    {
                      selectedTransaction.order_id
                    }
                  </p>
                </div>
              )}

              {/* WEEK */}

              {selectedTransaction.week_id && (
                <div className="rounded-2xl border border-[#292d33] bg-white/[0.025] p-4">
                  <p className="text-[9px] text-[#a1a1aa]/30">
                    معرف الأسبوع
                  </p>

                  <p className="mt-2 break-all font-mono text-[10px] text-[#a1a1aa]/45">
                    {
                      selectedTransaction.week_id
                    }
                  </p>
                </div>
              )}

              {/* TRANSACTION ID */}

              <div className="rounded-2xl border border-[#292d33] bg-white/[0.025] p-4">
                <p className="text-[9px] text-[#a1a1aa]/30">
                  معرف الحركة
                </p>

                <p className="mt-2 break-all font-mono text-[10px] text-[#a1a1aa]/45">
                  {selectedTransaction.id}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
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
          : "border border-transparent text-[#a1a1aa]/55 hover:bg-[#15191f] hover:text-[#f3f4f6]"
      }`}
    >
      <span
        className={
          active
            ? "text-[#d6a84f]"
            : "text-[#a1a1aa]/45"
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

function DarkSelect({
  label,
  value,
  onChange,
  icon,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-bold text-[#a1a1aa]/45">
        {label}
      </label>

      <div className="relative">
        <span className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 text-[#d6a84f]/60">
          {icon}
        </span>

        <select
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          className="w-full appearance-none rounded-xl border border-[#292d33] bg-[#15191f] py-3 pl-9 pr-10 text-xs text-[#f3f4f6] outline-none transition focus:border-[#d6a84f]/40"
        >
          {children}
        </select>

        <ChevronDown
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]/25"
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  danger = false,
  success = false,
  gold = false,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  danger?: boolean;
  success?: boolean;
  gold?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#292d33] bg-[#11151a] p-3 shadow-xl shadow-black/10 sm:p-4">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          danger
            ? "bg-red-500/10 text-red-400"
            : success
            ? "bg-emerald-500/10 text-emerald-400"
            : gold
            ? "bg-[#d6a84f]/10 text-[#d6a84f]"
            : "bg-[#15191f] text-[#a1a1aa]/50"
        }`}
      >
        {icon}
      </div>

      <p className="mt-3 text-[10px] font-bold text-[#a1a1aa]/35">
        {label}
      </p>

      <p
        className={`mt-1 text-base font-black sm:text-lg ${
          danger
            ? "text-red-400"
            : success
            ? "text-emerald-400"
            : gold
            ? "text-[#d6a84f]"
            : "text-[#f3f4f6]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function DetailCard({
  label,
  value,
  gold = false,
}: {
  label: string;
  value: string;
  gold?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#292d33] bg-white/[0.025] p-4">
      <p className="text-[9px] text-[#a1a1aa]/30">
        {label}
      </p>

      <p
        className={`mt-2 text-sm font-black ${
          gold
            ? "text-[#d6a84f]"
            : "text-[#f3f4f6]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function CircleAlertIcon() {
  return (
    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
      <X
        size={15}
        className="text-red-400"
      />
    </div>
  );
}