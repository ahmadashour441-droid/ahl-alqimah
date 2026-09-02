"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CircleAlert,
  CircleCheck,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Settings,
  UserCog,
  Users,
  Wallet,
  X,
  ShieldCheck,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type AdminData = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export default function AdminSettingsPage() {
  const [admin, setAdmin] = useState<AdminData | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        window.location.href = "/";
        return;
      }

      const response = await fetch("/api/admin/settings", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const contentType =
        response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        throw new Error("استجابة غير صحيحة من السيرفر");
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "فشل تحميل إعدادات الحساب"
        );
      }

      setAdmin(data.admin);
      setFullName(data.admin.full_name || "");
      setEmail(data.admin.email || "");
    } catch (err) {
      console.error("LOAD SETTINGS ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل الإعدادات"
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);
      setMessage("");
      setError("");

      if (!fullName.trim()) {
        setError("يرجى إدخال الاسم");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        window.location.href = "/";
        return;
      }

      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
        }),
      });

      const contentType =
        response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        throw new Error("استجابة غير صحيحة من السيرفر");
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "فشل تحديث بيانات الحساب"
        );
      }

      setAdmin(data.admin);
      setFullName(data.admin.full_name || "");
      setEmail(data.admin.email || "");

      setMessage("تم حفظ التعديلات بنجاح");

      setTimeout(() => {
        setMessage("");
      }, 4000);
    } catch (err) {
      console.error("SAVE SETTINGS ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء حفظ التعديلات"
      );
    } finally {
      setSaving(false);
    }
  }

  function formatDate(date: string | null) {
    if (!date) return "-";

    try {
      return new Date(date).toLocaleDateString(
        "ar-JO",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      );
    } catch {
      return date;
    }
  }

  function goTo(path: string) {
    window.location.href = path;
  }

  async function logout() {
    await supabase.auth.signOut();

    localStorage.removeItem("user");
    localStorage.removeItem("access_token");

    window.location.href = "/";
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#050505] text-white"
      >
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-5">
          <div className="flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d6a84f]/20 bg-[#d6a84f]/5">
              <RefreshCw
                size={21}
                className="animate-spin text-[#d6a84f]"
              />
            </div>

            <p className="mt-4 text-xs font-bold text-white/40">
              جاري تحميل الإعدادات...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#050505] text-white"
    >
      {/* OVERLAY */}

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* SIDE MENU */}

      <aside
        className={`fixed right-0 top-0 z-50 h-full w-[285px] border-l border-white/10 bg-[#090909] shadow-2xl transition-transform duration-300 ${
          menuOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* MENU HEADER */}

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
              onClick={() => setMenuOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* MENU */}

          <nav className="flex-1 overflow-y-auto p-4">
            <div className="mb-2 px-3 text-[10px] font-bold text-white/30">
              الرئيسية
            </div>

            <MenuItem
              icon={<LayoutDashboard size={18} />}
              label="لوحة التحكم"
              onClick={() => goTo("/admin")}
            />

            <MenuItem
              icon={<Bell size={18} />}
              label="الإشعارات"
              onClick={() =>
                goTo("/admin/notifications")
              }
            />

            <div className="mb-2 mt-6 px-3 text-[10px] font-bold text-white/30">
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
              icon={<ClipboardList size={18} />}
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
                goTo("/admin/withdrawals")
              }
            />

            <MenuItem
              icon={<Wallet size={18} />}
              label="الحركات المالية"
              onClick={() =>
                goTo("/admin/transactions")
              }
            />

            <MenuItem
              icon={<CalendarDays size={18} />}
              label="الأسابيع"
              onClick={() =>
                goTo("/admin/weeks")
              }
            />

            <div className="mb-2 mt-6 px-3 text-[10px] font-bold text-white/30">
              الحساب
            </div>

            <MenuItem
              icon={<Settings size={18} />}
              label="الإعدادات"
              active
              onClick={() =>
                setMenuOpen(false)
              }
            />
          </nav>

          {/* LOGOUT */}

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

      {/* PAGE */}

      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        {/* HEADER */}

        <header className="mb-6 flex items-center justify-between">
          <button
            onClick={() => setMenuOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#0d0d0d] text-white/70 transition hover:border-[#d6a84f]/30 hover:text-[#d6a84f]"
            aria-label="فتح القائمة"
          >
            <Menu size={20} />
          </button>

          <div className="text-center">
            <h1 className="text-lg font-black tracking-wide text-[#d6a84f]">
              أهل القمة
            </h1>

            <p className="mt-0.5 text-[11px] text-white/40">
              الإعدادات
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d6a84f]/20 bg-[#d6a84f]/5">
            <Settings
              size={19}
              className="text-[#d6a84f]"
            />
          </div>
        </header>

        {/* PAGE TITLE */}

        <section className="mb-5">
          <h2 className="text-2xl font-black tracking-tight text-white">
            إعدادات الحساب
          </h2>

          <p className="mt-1 text-xs text-white/40">
            إدارة بيانات حساب مدير النظام
          </p>
        </section>

        {/* MESSAGES */}

        {message && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-emerald-300">
            <CircleCheck
              size={18}
              className="mt-0.5 shrink-0"
            />

            <p className="text-xs font-bold leading-6">
              {message}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-red-300">
            <CircleAlert
              size={18}
              className="mt-0.5 shrink-0"
            />

            <p className="text-xs font-bold leading-6">
              {error}
            </p>
          </div>
        )}

        {/* PROFILE HEADER */}

        <section className="mb-5 overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a]">
          <div className="h-20 bg-gradient-to-l from-[#d6a84f]/15 via-[#d6a84f]/5 to-transparent" />

          <div className="px-5 pb-5">
            <div className="-mt-8 flex items-end justify-between gap-4">
              <div className="flex items-end gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-[#0a0a0a] bg-[#d6a84f]/10 text-[#d6a84f] shadow-xl">
                  <UserCog size={25} />
                </div>

                <div className="pb-1">
                  <h3 className="text-base font-black text-white">
                    {admin?.full_name ||
                      "مدير النظام"}
                  </h3>

                  <p className="mt-1 text-[10px] text-white/35">
                    مدير النظام
                  </p>
                </div>
              </div>

              <div
                className={`mb-1 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black ${
                  admin?.is_active
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    admin?.is_active
                      ? "bg-emerald-400"
                      : "bg-red-400"
                  }`}
                />

                {admin?.is_active
                  ? "الحساب نشط"
                  : "الحساب غير نشط"}
              </div>
            </div>
          </div>
        </section>

        {/* ACCOUNT DATA */}

        <section className="mb-5 rounded-3xl border border-white/10 bg-[#0a0a0a] p-5 shadow-2xl shadow-black/10">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
              <UserCog size={17} />
            </div>

            <div>
              <h3 className="text-sm font-black text-white">
                بيانات الحساب
              </h3>

              <p className="mt-1 text-[10px] text-white/35">
                البيانات الشخصية الخاصة بالأدمن
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* NAME */}

            <DarkInput
              label="الاسم"
              value={fullName}
              onChange={setFullName}
              placeholder="اسم الأدمن"
            />

            {/* PHONE */}

            <div>
              <label className="mb-2 block text-[11px] font-bold text-white/55">
                رقم الهاتف
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={admin?.phone || ""}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/35 outline-none"
                />

                <ShieldCheck
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20"
                />
              </div>

              <p className="mt-1.5 text-[9px] text-white/25">
                رقم الهاتف لا يمكن تغييره من هنا
              </p>
            </div>

            {/* EMAIL */}

            <DarkInput
              label="البريد الإلكتروني"
              value={email}
              onChange={setEmail}
              placeholder="البريد الإلكتروني"
              type="email"
              dir="ltr"
            />

            {/* ROLE */}

            <div>
              <label className="mb-2 block text-[11px] font-bold text-white/55">
                الصلاحية
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d6a84f]/10 text-[#d6a84f]">
                  <ShieldCheck size={15} />
                </div>

                <div>
                  <p className="text-xs font-bold text-white">
                    مدير النظام
                  </p>

                  <p className="mt-0.5 text-[9px] text-white/30">
                    صلاحيات إدارية كاملة
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SAVE */}

          <div className="mt-5 flex justify-start">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#d6a84f] px-6 py-3 text-xs font-black text-black transition hover:bg-[#e3bb68] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw
                    size={15}
                    className="animate-spin"
                  />

                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Check size={15} />

                  حفظ التعديلات
                </>
              )}
            </button>
          </div>
        </section>

        {/* ACCOUNT INFORMATION */}

        <section className="mb-5 rounded-3xl border border-white/10 bg-[#0a0a0a] p-5 shadow-2xl shadow-black/10">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
              <ShieldCheck size={17} />
            </div>

            <div>
              <h3 className="text-sm font-black text-white">
                معلومات الحساب
              </h3>

              <p className="mt-1 text-[10px] text-white/35">
                معلومات النظام الخاصة بحساب الأدمن
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {/* STATUS */}

            <InfoCard
              icon={<CircleCheck size={16} />}
              label="حالة الحساب"
              value={
                admin?.is_active
                  ? "نشط"
                  : "غير نشط"
              }
              valueClass={
                admin?.is_active
                  ? "text-emerald-400"
                  : "text-red-400"
              }
            />

            {/* BALANCE */}

            <InfoCard
              icon={<Wallet size={16} />}
              label="رصيد الحساب"
              value={`${Number(
                admin?.balance || 0
              ).toFixed(2)} JD`}
              valueClass="text-[#d6a84f]"
            />

            {/* CREATED */}

            <InfoCard
              icon={<CalendarDays size={16} />}
              label="تاريخ إنشاء الحساب"
              value={formatDate(
                admin?.created_at || null
              )}
              valueClass="text-white"
            />
          </div>
        </section>

        {/* SECURITY */}

        <section className="mb-5 rounded-3xl border border-white/10 bg-[#0a0a0a] p-5 shadow-2xl shadow-black/10">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
              <ShieldCheck size={17} />
            </div>

            <div>
              <h3 className="text-sm font-black text-white">
                الأمان
              </h3>

              <p className="mt-1 text-[10px] text-white/35">
                إعدادات أمان الحساب
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/50">
                <ShieldCheck size={17} />
              </div>

              <div>
                <h4 className="text-xs font-black text-white">
                  كلمة المرور
                </h4>

                <p className="mt-1 text-[10px] leading-5 text-white/35">
                  تغيير كلمة المرور الخاصة بحساب الأدمن
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setError(
                  "قسم تغيير كلمة المرور سيتم تفعيله في الخطوة القادمة"
                );
                setMessage("");
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-black text-white/60 transition hover:border-[#d6a84f]/30 hover:text-[#d6a84f]"
            >
              <ShieldCheck size={14} />

              تغيير كلمة المرور
            </button>
          </div>
        </section>

        {/* BACK */}

        <button
          onClick={() => window.history.back()}
          className="mx-auto flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-bold text-white/40 transition hover:border-[#d6a84f]/30 hover:text-[#d6a84f]"
        >
          <ArrowRight size={14} />

          العودة
        </button>

        {/* FOOTER */}

        <div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-white/20">
          <Settings size={11} />

          <span>
            أهل القمة • إعدادات لوحة الإدارة
          </span>
        </div>
      </div>
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
  icon: React.ReactNode;
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

function DarkInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  dir = "rtl",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold text-white/55">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        dir={dir}
        className="w-full rounded-xl border border-white/10 bg-[#0e0e0e] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-[#d6a84f]/40 focus:ring-1 focus:ring-[#d6a84f]/10"
      />
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-center gap-2 text-white/35">
        {icon}

        <span className="text-[10px] font-bold">
          {label}
        </span>
      </div>

      <p
        className={`mt-3 text-sm font-black ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}