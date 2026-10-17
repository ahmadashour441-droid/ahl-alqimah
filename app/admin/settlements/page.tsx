"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Home,
  Users,
  ClipboardList,
  Wallet,
  ArrowDownCircle,
  Activity,
  CalendarDays,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Phone,
  Search,
  FileDown,
  Trash2,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type SettlementUser = {
  id: string;
  full_name: string;
  phone: string;
  amount: number;
  current_balance: number;
  previous_week_net?: number;
  balance_after_settlement?: number;
  settlement_status?: string;
};

type PreviousWeek = {
  id: string;
  start_at: string;
  end_at: string;
};

export default function AdminSettlementsPage() {
  const [users, setUsers] = useState<SettlementUser[]>([]);
  const [previousWeek, setPreviousWeek] =
    useState<PreviousWeek | null>(null);

  const [total, setTotal] = useState(0);

  const [loading, setLoading] =
    useState(true);

  const [clearingQueue, setClearingQueue] = useState(false);

  const [downloadingPdf, setDownloadingPdf] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [search, setSearch] =
    useState("");

  async function token() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function load() {
    try {
      setLoading(true);
      setError("");

      const t = await token();

      if (!t) {
        window.location.href = "/";
        return;
      }

      const response = await fetch(
        "/api/admin/settlements",
        {
          headers: {
            Authorization: `Bearer ${t}`,
          },
          cache: "no-store",
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "تعذر تحميل التسويات"
        );
      }

      setUsers(data.users || []);

      setPreviousWeek(
        data.previousWeek || null
      );

      setTotal(
        Number(data.total || 0)
      );
    } catch (e: any) {
      setError(
        e.message ||
          "حدث خطأ أثناء تحميل التسويات"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function clearCurrentQueue() {
    const confirmed = window.confirm(
      "سيتم إخفاء قائمة مستحقات الأسابيع المغلقة السابقة من هذه الصفحة فقط. لن تتغير أرصدة أي مستخدم ولن تُحذف أي حركة مالية. ستظهر المستحقات من جديد بعد إغلاق الأسبوع القادم. هل تريد المتابعة؟"
    );
    if (!confirmed) return;

    try {
      setClearingQueue(true);
      setError("");
      setSuccess("");
      const t = await token();
      if (!t) {
        window.location.href = "/";
        return;
      }

      const response = await fetch("/api/admin/settlements", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "تعذر تفريغ القائمة");
      }
      setSuccess(data.message || "تم تفريغ القائمة دون تغيير الأرصدة");
      await load();
    } catch (e: any) {
      setError(e.message || "تعذر تفريغ القائمة");
    } finally {
      setClearingQueue(false);
    }
  }

  /*
  ========================================================
  تحميل PDF
  ========================================================
  
  مهم:
  الـ API الخاص بالـ PDF يجب أن يعيد فقط المستخدمين
  الموجودين في قائمة تسويات الأسبوع السابق.
  ========================================================
  */

  async function downloadPdf() {
    try {
      setDownloadingPdf(true);
      setError("");
      setSuccess("");

      if (!previousWeek) {
        throw new Error(
          "لا يوجد أسبوع سابق لإنشاء الكشف"
        );
      }

      if (users.length === 0) {
        throw new Error(
          "لا يوجد مستخدمون في قائمة تسويات الأسبوع السابق"
        );
      }

      const t = await token();

      if (!t) {
        window.location.href = "/";
        return;
      }

      /*
      نرسل IDs الموجودين حاليًا في القائمة فقط
      */

      const userIds = users.map(
        (user) => user.id
      );

      const response = await fetch(
        "/api/admin/settlements/pdf",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization: `Bearer ${t}`,
          },

          body: JSON.stringify({
            weekId: previousWeek.id,
            userIds,
          }),
        }
      );

      if (!response.ok) {
        let message =
          "فشل إنشاء ملف PDF";

        try {
          const data =
            await response.json();

          message =
            data.message || message;
        } catch {
          // ignore
        }

        throw new Error(message);
      }

      const blob =
        await response.blob();

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `تسويات-الأسبوع-السابق-${formatDateForFile(
          previousWeek.end_at
        )}.pdf`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

      setSuccess(
        "تم تحميل كشف تسويات الأسبوع السابق بنجاح"
      );
    } catch (e: any) {
      setError(
        e.message ||
          "فشل تحميل كشف PDF"
      );
    } finally {
      setDownloadingPdf(false);
    }
  }

  function money(value: number) {
    return `${Number(
      value || 0
    ).toFixed(2)} د.أ`;
  }

  function formatDate(
    value: string
  ) {
    if (!value) return "-";

    return new Intl.DateTimeFormat(
      "ar-JO",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(new Date(value));
  }

  function formatDateForFile(
    value: string
  ) {
    if (!value) {
      return "week";
    }

    const date =
      new Date(value);

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        date.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function go(path: string) {
    window.location.href = path;
  }

  /*
  ========================================================
  SEARCH
  ========================================================
  */

  const filteredUsers =
    users.filter(
      (user) => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (!query) {
          return true;
        }

        return (
          user.full_name
            ?.toLowerCase()
            .includes(query) ||
          user.phone
            ?.toLowerCase()
            .includes(query)
        );
      }
    );

  const MenuItem = ({
    icon,
    title,
    active,
    onClick,
  }: {
    icon: React.ReactNode;
    title: string;
    active?: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-sm font-bold transition ${
        active
          ? "bg-[#d6a84f]/15 text-[#d6a84f]"
          : "text-[#a1a1aa]/60 hover:bg-[#15191f] hover:text-[#f3f4f6]"
      }`}
    >
      {icon}

      <span>{title}</span>
    </button>
  );

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#0b0d10] text-[#f3f4f6]"
    >
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={() =>
            setMenuOpen(false)
          }
        />
      )}

      {/* Mobile menu */}

      <aside
        className={`fixed right-0 top-0 z-50 h-full w-[84%] max-w-[350px] border-l border-[#292d33] bg-[#101317] text-[#f3f4f6] shadow-2xl transition-transform ${
          menuOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-4">
          <div className="flex items-center justify-between border-b border-[#292d33] pb-4">
            <img
              src="/logo.svg"
              alt="أهل القمة"
              className="h-14 w-44 object-contain"
            />

            <button
              onClick={() =>
                setMenuOpen(false)
              }
              className="rounded-xl bg-[#15191f] p-2 text-[#a1a1aa]/60"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mt-5 flex-1">
            <MenuItem
              icon={<Home size={18} />}
              title="الرئيسية"
              onClick={() =>
                go("/admin")
              }
            />

            <MenuItem
              icon={<Users size={18} />}
              title="المستخدمون"
              onClick={() =>
                go("/admin/users")
              }
            />

            <MenuItem
              icon={
                <ClipboardList
                  size={18}
                />
              }
              title="الطلبات"
              onClick={() =>
                go("/admin/orders")
              }
            />

            <MenuItem
              icon={<Wallet size={18} />}
              title="الأرصدة"
              onClick={() =>
                go("/admin/balances")
              }
            />

            <MenuItem
              icon={
                <CheckCircle2
                  size={18}
                />
              }
              title="تسويات الأسبوع السابق"
              active
              onClick={() =>
                go(
                  "/admin/settlements"
                )
              }
            />

            <MenuItem
              icon={
                <ArrowDownCircle
                  size={18}
                />
              }
              title="طلبات السحب"
              onClick={() =>
                go("/admin/withdrawals")
              }
            />

            <MenuItem
              icon={
                <Activity size={18} />
              }
              title="الحركات المالية"
              onClick={() =>
                go(
                  "/admin/transactions"
                )
              }
            />

            <MenuItem
              icon={
                <CalendarDays
                  size={18}
                />
              }
              title="الأسابيع"
              onClick={() =>
                go("/admin/weeks")
              }
            />

            <MenuItem
              icon={<Bell size={18} />}
              title="الإشعارات"
              onClick={() =>
                go(
                  "/admin/notifications"
                )
              }
            />

            <MenuItem
              icon={
                <Settings
                  size={18}
                />
              }
              title="الإعدادات"
              onClick={() =>
                go("/admin/settings")
              }
            />
          </div>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              go("/");
            }}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-red-300"
          >
            <LogOut size={18} />

            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Header */}

      <header className="sticky top-0 z-30 border-b border-[#292d33] bg-[#0b0d10]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                setMenuOpen(true)
              }
              className="rounded-xl bg-[#15191f] p-2 md:hidden"
            >
              <Menu size={20} />
            </button>

            <img
              src="/logo.svg"
              alt="أهل القمة"
              className="h-11 w-36 object-contain"
            />
          </div>

          <div className="hidden items-center gap-2 text-sm text-[#a1a1aa]/50 md:flex">
            <ShieldCheck
              size={17}
              className="text-[#d6a84f]"
            />

            تسويات الأسبوع السابق
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">

        {/* Desktop sidebar */}

        <aside className="hidden w-60 shrink-0 md:block">
          <div className="sticky top-24 rounded-2xl border border-[#292d33] bg-[#101317] p-3 text-[#f3f4f6]">

            <MenuItem
              icon={<Home size={18} />}
              title="الرئيسية"
              onClick={() =>
                go("/admin")
              }
            />

            <MenuItem
              icon={<Users size={18} />}
              title="المستخدمون"
              onClick={() =>
                go("/admin/users")
              }
            />

            <MenuItem
              icon={
                <ClipboardList
                  size={18}
                />
              }
              title="الطلبات"
              onClick={() =>
                go("/admin/orders")
              }
            />

            <MenuItem
              icon={<Wallet size={18} />}
              title="الأرصدة"
              onClick={() =>
                go("/admin/balances")
              }
            />

            <MenuItem
              icon={
                <CheckCircle2
                  size={18}
                />
              }
              title="تسويات الأسبوع السابق"
              active
              onClick={() =>
                go(
                  "/admin/settlements"
                )
              }
            />

            <MenuItem
              icon={
                <ArrowDownCircle
                  size={18}
                />
              }
              title="طلبات السحب"
              onClick={() =>
                go("/admin/withdrawals")
              }
            />

            <MenuItem
              icon={
                <Activity size={18} />
              }
              title="الحركات المالية"
              onClick={() =>
                go(
                  "/admin/transactions"
                )
              }
            />

            <MenuItem
              icon={
                <CalendarDays
                  size={18}
                />
              }
              title="الأسابيع"
              onClick={() =>
                go("/admin/weeks")
              }
            />

            <MenuItem
              icon={<Bell size={18} />}
              title="الإشعارات"
              onClick={() =>
                go(
                  "/admin/notifications"
                )
              }
            />

            <MenuItem
              icon={
                <Settings
                  size={18}
                />
              }
              title="الإعدادات"
              onClick={() =>
                go("/admin/settings")
              }
            />

          </div>
        </aside>

        {/* Main */}

        <section className="min-w-0 flex-1">

          <div className="mb-6 flex flex-col gap-4">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

              <div>
                <p className="text-xs font-bold text-[#d6a84f]">
                  الإدارة
                </p>

                <h1 className="mt-1 text-2xl font-black">
                  تسويات الأسبوع السابق
                </h1>

                <p className="mt-1 text-sm text-[#a1a1aa]/50">
                  تعرض مستحقات آخر أسبوع مغلق فقط. تفريغ القائمة لا يغيّر أرصدة المستخدمين ولا يحذف الحركات المالية.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">

                <button
                  onClick={clearCurrentQueue}
                  disabled={loading || clearingQueue}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {clearingQueue ? <RefreshCw size={17} className="animate-spin" /> : <Trash2 size={17} />}
                  {clearingQueue ? "جاري تفريغ القائمة..." : "تفريغ القائمة الحالية"}
                </button>

                <button
                  onClick={downloadPdf}
                  disabled={
                    loading ||
                    downloadingPdf ||
                    users.length === 0
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d6a84f] px-4 py-3 text-sm font-black text-[#0b0d10] transition hover:bg-[#e8c36f] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {downloadingPdf ? (
                    <RefreshCw
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <FileDown
                      size={17}
                    />
                  )}

                  {downloadingPdf
                    ? "جاري تجهيز الكشف..."
                    : "تحميل كشف PDF"}
                </button>

                <button
                  onClick={load}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#292d33] bg-[#15191f] text-[#f3f4f6] px-4 py-3 text-sm font-black transition hover:bg-[#20252d] disabled:opacity-50"
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

            {/* Search */}

            <div className="relative w-full sm:max-w-md">

              <Search
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]/40"
              />

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="بحث بالاسم أو رقم الهاتف..."
                className="w-full rounded-xl border border-[#292d33] bg-[#15191f] text-[#f3f4f6] py-3 pr-10 pl-4 text-sm font-bold outline-none transition placeholder:text-[#a1a1aa]/40 focus:border-[#d6a84f] focus:ring-2 focus:ring-[#d6a84f]/10"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#a1a1aa]/50 transition hover:bg-[#15191f] hover:text-[#d6a84f]"
                >
                  <X size={16} />
                </button>
              )}

            </div>

          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm font-bold text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
              {success}
            </div>
          )}

          {/* Week info */}

          {previousWeek && (
            <div className="mb-5 grid gap-4 sm:grid-cols-3">

              <div className="rounded-2xl border border-[#292d33] bg-[#101317] p-5 text-[#f3f4f6]">
                <p className="text-xs font-bold text-[#a1a1aa]/40">
                  الأسبوع السابق
                </p>

                <p className="mt-2 font-black">
                  {formatDate(
                    previousWeek.start_at
                  )}{" "}
                  →
                  {" "}
                  {formatDate(
                    previousWeek.end_at
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-5">
                <p className="text-xs font-bold text-red-300/70">
                  إجمالي المستحق
                </p>

                <p className="mt-2 text-2xl font-black text-red-300">
                  {money(total)}
                </p>
              </div>

              <div className="rounded-2xl border border-[#292d33] bg-[#101317] p-5 text-[#f3f4f6]">
                <p className="text-xs font-bold text-[#a1a1aa]/40">
                  عدد غير المسددين
                </p>

                <p className="mt-2 text-2xl font-black text-[#f3f4f6]">
                  {users.length}
                </p>
              </div>

            </div>
          )}

          {/* Loading */}

          {loading ? (

            <div className="rounded-2xl border border-[#292d33] bg-[#101317] p-12 text-center text-sm font-bold text-[#a1a1aa]/40">
              جاري تحميل التسويات...
            </div>

          ) : users.length === 0 ? (

            <div className="rounded-2xl border border-emerald-500/25 bg-[#101317] p-12 text-center text-[#f3f4f6]">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                <CheckCircle2 size={30} />
              </div>

              <h2 className="mt-4 text-lg font-black">
                لا توجد مستحقات غير مسددة
              </h2>

              <p className="mt-2 text-sm text-[#a1a1aa]/50">
                جميع المستخدمين مسددون من
                الأسبوع السابق.
              </p>

            </div>

          ) : filteredUsers.length === 0 ? (

            <div className="rounded-2xl border border-[#292d33] bg-[#101317] p-12 text-center text-[#f3f4f6]">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#15191f] text-[#d6a84f]">
                <Search size={28} />
              </div>

              <h2 className="mt-4 text-lg font-black">
                لا توجد نتائج
              </h2>

              <p className="mt-2 text-sm text-[#a1a1aa]/50">
                لم يتم العثور على مستخدم يطابق البحث.
              </p>

            </div>

          ) : (

            <div className="overflow-hidden rounded-2xl border border-[#292d33] bg-[#101317] text-[#f3f4f6]">

              {/* Desktop heading */}

              <div className="hidden grid-cols-5 gap-4 border-b border-[#292d33] px-5 py-4 text-xs font-bold text-[#a1a1aa]/40 md:grid">

                <span className="col-span-2">
                  المستخدم
                </span>

                <span>
                  الهاتف
                </span>

                <span>
                  مستحق الأسبوع السابق
                </span>

                <span>
                  الإجراء
                </span>

              </div>

              {filteredUsers.map(
                (user) => (

                  <div
                    key={user.id}
                    className="grid gap-4 border-b border-[#292d33] px-5 py-5 last:border-0 md:grid-cols-5 md:items-center"
                  >

                    <div className="flex min-w-0 items-center gap-3 md:col-span-2">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 font-black text-red-300">
                        {user.full_name
                          .split(" ")
                          .map(
                            (part) =>
                              part[0]
                          )
                          .slice(0, 2)
                          .join("")}
                      </div>

                      <div className="min-w-0">

                        <p className="truncate font-black">
                          {user.full_name}
                        </p>

                        <p className="mt-1 text-xs text-[#a1a1aa]/40">
                          الرصيد الحالي:{" "}
                          {money(
                            user.current_balance
                          )}
                        </p>

                      </div>

                    </div>

                    <div className="flex items-center gap-2 text-sm text-[#a1a1aa]/60">

                      <Phone size={15} />

                      {user.phone}

                    </div>

                    <div>

                      <span className="block text-[10px] font-bold text-[#a1a1aa]/40">
                        مستحق الأسبوع السابق
                      </span>

                      <strong className="mt-1 block text-xl font-black text-red-300">
                        {money(
                          user.amount
                        )}
                      </strong>

                      <div className="mt-2 text-xs font-bold text-[#a1a1aa]/50">
                        الرصيد الحالي (لن يتغير):
                      </div>

                      <div className="mt-1 text-sm font-black text-[#d6a84f]">
                        {money(user.current_balance)}
                      </div>

                    </div>

                    <div className="rounded-xl border border-[#d6a84f]/25 bg-[#d6a84f]/10 px-3 py-3 text-center text-xs font-bold text-[#d6a84f]">
                      عرض فقط
                      <div className="mt-1 font-medium text-[#a1a1aa]">لا يتم تعديل الرصيد من هنا</div>
                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>
      </div>
    </main>
  );
}