"use client";

import { useEffect, useMemo, useState } from "react";
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
  Plus,
  Pencil,
  RotateCcw,
  Search,
  Save,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type User = {
  id: string;
  full_name: string;
  phone: string;
  role: "user" | "admin";
  balance: number;
  is_active: boolean;
};

export default function AdminBalancesPage() {
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const [selected, setSelected] = useState<User | null>(null);
  const [amount, setAmount] = useState("");

  const [mode, setMode] = useState<
    "add" | "set" | "zero"
  >("add");

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

      const r = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${t}`,
        },
        cache: "no-store",
      });

      const data = await r.json();

      if (!r.ok || !data.success) {
        throw new Error(
          data.message || "تعذر تحميل المستخدمين"
        );
      }

      setUsers(data.users || []);
    } catch (e: any) {
      setError(
        e.message ||
          "حدث خطأ أثناء تحميل الأرصدة"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveBalance() {
    if (!selected) return;

    const current = Number(
      selected.balance || 0
    );

    let next = current;

    if (mode === "zero") {
      next = 0;
    } else {
      const n = Number(amount);

      if (!Number.isFinite(n)) {
        setError("أدخل مبلغًا صحيحًا");
        return;
      }

      next =
        mode === "add"
          ? current + n
          : n;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const t = await token();

      if (!t) {
        window.location.href = "/";
        return;
      }

      const r = await fetch(
        "/api/admin/users",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${t}`,
          },

          body: JSON.stringify({
            id: selected.id,
            full_name: selected.full_name,
            phone: selected.phone,
            role: selected.role,
            is_active: selected.is_active,
            balance: Number(
              next.toFixed(2)
            ),
          }),
        }
      );

      const data = await r.json();

      if (!r.ok || !data.success) {
        throw new Error(
          data.message ||
            "تعذر تحديث الرصيد"
        );
      }

      setSuccess(
        mode === "zero"
          ? "تم تصفير الرصيد الحالي بنجاح"
          : "تم تحديث الرصيد بنجاح"
      );

      setSelected(null);
      setAmount("");

      await load();
    } catch (e: any) {
      setError(
        e.message ||
          "تعذر تحديث الرصيد"
      );
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search
      .trim()
      .toLowerCase();

    if (!q) return users;

    return users.filter((u) =>
      [
        u.full_name,
        u.phone,
        u.role,
        String(u.balance),
      ].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [users, search]);

  const go = (path: string) => {
    window.location.href = path;
  };

  const money = (n: number) =>
    `${Number(n || 0).toFixed(2)} د.أ`;

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

      {/* Mobile Sidebar */}
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-[84%] max-w-[350px] border-l border-[#292d33] bg-white shadow-2xl transition-transform ${
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
              active
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
              onClick={() =>
                go("/admin/settlements")
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
                go("/admin/transactions")
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
                go("/admin/notifications")
              }
            />

            <MenuItem
              icon={
                <Settings size={18} />
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
      <header className="sticky top-0 z-30 border-b border-[#292d33] bg-[#11151a]/95 backdrop-blur-xl">
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
            إدارة الأرصدة
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        {/* Desktop Sidebar */}
        <aside className="hidden w-60 shrink-0 md:block">
          <div className="sticky top-24 rounded-2xl border border-[#292d33] bg-white p-3">
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
              active
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
              onClick={() =>
                go("/admin/settlements")
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
                go("/admin/transactions")
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
                go("/admin/notifications")
              }
            />

            <MenuItem
              icon={
                <Settings size={18} />
              }
              title="الإعدادات"
              onClick={() =>
                go("/admin/settings")
              }
            />
          </div>
        </aside>

        {/* Main Content */}
        <section className="min-w-0 flex-1">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold text-[#d6a84f]">
                الإدارة
              </p>

              <h1 className="mt-1 text-2xl font-black">
                الأرصدة
              </h1>

              <p className="mt-1 text-sm text-[#a1a1aa]/40">
                إضافة الرصيد وتعديله أو تصفير رصيد المستخدمين
              </p>
            </div>

            <button
              onClick={() => {
                setSelected({
                  id: "",
                  full_name: "",
                  phone: "",
                  role: "user",
                  balance: 0,
                  is_active: true,
                });

                setMode("add");
                setAmount("");
                setError("");
                setSuccess("");
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d6a84f] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#650016]/20 transition hover:bg-[#741026]"
            >
              <Plus size={18} />
              إضافة رصيد
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-400/20 bg-red-50 p-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
              {success}
            </div>
          )}

          {/* Search */}
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#292d33] bg-white p-3">
            <Search
              size={18}
              className="text-[#a1a1aa]/30"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="ابحث بالاسم أو رقم الهاتف أو الرصيد"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#a1a1aa]/25"
            />
          </div>

          {/* Users */}
          {loading ? (
            <div className="rounded-2xl border border-[#292d33] bg-white p-10 text-center text-sm font-bold text-[#a1a1aa]/40">
              جاري تحميل الأرصدة...
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#292d33] bg-white">
              <div className="hidden grid-cols-6 gap-3 border-b border-[#292d33] px-5 py-4 text-xs font-bold text-[#a1a1aa]/35 md:grid">
                <span>#</span>

                <span className="col-span-2">
                  المستخدم
                </span>

                <span>
                  الهاتف
                </span>

                <span>
                  الرصيد
                </span>

                <span>
                  الإجراءات
                </span>
              </div>

              {filtered.map((u, i) => (
                <div
                  key={u.id}
                  className="grid gap-3 border-b border-[#292d33] px-4 py-4 last:border-0 md:grid-cols-6 md:items-center md:px-5"
                >
                  <span className="text-xs text-[#a1a1aa]/30">
                    {i + 1}
                  </span>

                  <div className="md:col-span-2">
                    <p className="font-bold">
                      {u.full_name}
                    </p>

                    <p className="text-[11px] text-[#a1a1aa]/30">
                      {u.role === "admin"
                        ? "أدمن"
                        : "مستخدم"}
                    </p>
                  </div>

                  <span className="text-xs text-[#a1a1aa]/45">
                    {u.phone}
                  </span>

                  <span
                    className={`font-black ${
                      u.balance < 0
                        ? "text-red-500"
                        : u.balance > 0
                        ? "text-[#d6a84f]"
                        : "text-[#a1a1aa]/50"
                    }`}
                  >
                    {money(u.balance)}
                  </span>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setSelected(u);
                        setMode("set");
                        setAmount(
                          String(u.balance)
                        );
                        setError("");
                        setSuccess("");
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#15191f] px-3 py-2 text-xs font-bold transition hover:bg-[#f0ece7]"
                    >
                      <Pencil size={14} />
                      تعديل
                    </button>

                    <button
                      onClick={() => {
                        setSelected(u);
                        setMode("zero");
                        setAmount("0");
                        setError("");
                        setSuccess("");
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
                    >
                      <RotateCcw
                        size={14}
                      />
                      تصفير
                    </button>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="p-10 text-center text-sm text-[#a1a1aa]/35">
                  لا توجد نتائج.
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Balance Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"
          onClick={() =>
            !saving &&
            setSelected(null)
          }
        >
          <div
            className="w-full max-w-md rounded-3xl border border-[#292d33] bg-white p-5 shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">
                  {selected.id
                    ? "تعديل الرصيد"
                    : "إضافة رصيد"}
                </h2>

                <p className="mt-1 text-xs text-[#a1a1aa]/35">
                  {selected.id
                    ? selected.full_name
                    : "اختر المستخدم لإضافة الرصيد"}
                </p>
              </div>

              <button
                onClick={() =>
                  setSelected(null)
                }
                className="rounded-xl bg-[#15191f] p-2"
              >
                <X size={18} />
              </button>
            </div>

            {selected.id ? (
              <div className="mb-4 rounded-2xl bg-[#15191f] p-4">
                <p className="text-xs text-[#a1a1aa]/35">
                  الرصيد الحالي
                </p>

                <p className="mt-1 text-2xl font-black text-[#d6a84f]">
                  {money(
                    selected.balance
                  )}
                </p>
              </div>
            ) : (
              <div className="mb-4">
                <label className="mb-2 block text-xs font-bold text-[#a1a1aa]/50">
                  المستخدم
                </label>

                <select
                  onChange={(e) => {
                    const u =
                      users.find(
                        (x) =>
                          x.id ===
                          e.target.value
                      );

                    if (u) {
                      setSelected(u);
                      setMode("add");
                      setAmount("");
                    }
                  }}
                  className="w-full rounded-xl border border-[#292d33] bg-[#fffaf0] px-4 py-3 text-sm outline-none"
                >
                  <option value="">
                    اختر المستخدم
                  </option>

                  {users
                    .filter(
                      (u) =>
                        u.role !== "admin"
                    )
                    .map((u) => (
                      <option
                        key={u.id}
                        value={u.id}
                      >
                        {u.full_name} —{" "}
                        {u.phone}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {selected.id && (
              <>
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      setMode("add")
                    }
                    className={`rounded-xl px-3 py-3 text-xs font-bold ${
                      mode === "add"
                        ? "bg-[#d6a84f] text-white"
                        : "bg-[#15191f] text-[#a1a1aa]/50"
                    }`}
                  >
                    إضافة مبلغ
                  </button>

                  <button
                    onClick={() =>
                      setMode("set")
                    }
                    className={`rounded-xl px-3 py-3 text-xs font-bold ${
                      mode === "set"
                        ? "bg-[#d6a84f] text-white"
                        : "bg-[#15191f] text-[#a1a1aa]/50"
                    }`}
                  >
                    تحديد الرصيد
                  </button>
                </div>

                <label className="mb-2 block text-xs font-bold text-[#a1a1aa]/50">
                  {mode === "add"
                    ? "المبلغ المراد إضافته"
                    : mode === "set"
                    ? "الرصيد الجديد"
                    : "تصفير الرصيد الحالي"}
                </label>

                {mode !== "zero" && (
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) =>
                      setAmount(
                        e.target.value
                      )
                    }
                    placeholder="0.00"
                    className="mb-4 w-full rounded-xl border border-[#292d33] bg-[#fffaf0] px-4 py-3 text-lg font-bold outline-none focus:border-[#d6a84f]"
                  />
                )}

                {mode === "zero" && (
                  <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    سيتم تصفير الرصيد الحالي فقط.
                    <br />
                    لا علاقة لهذه العملية
                    بتسوية الأسبوع السابق.
                  </div>
                )}

                <button
                  onClick={saveBalance}
                  disabled={
                    saving ||
                    !selected.id
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#d6a84f] px-4 py-3 font-black text-white transition hover:bg-[#741026] disabled:opacity-50"
                >
                  <Save size={17} />

                  {saving
                    ? "جاري الحفظ..."
                    : mode === "zero"
                    ? "تصفير الرصيد الحالي"
                    : "حفظ الرصيد"}
                </button>
              </>
            )}

            {!selected.id && (
              <button
                disabled
                className="w-full rounded-xl bg-[#15191f] px-4 py-3 text-sm font-bold text-[#a1a1aa]/30"
              >
                اختر مستخدمًا أولًا
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}