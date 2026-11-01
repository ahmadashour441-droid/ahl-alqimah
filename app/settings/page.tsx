"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronLeft,
  CircleUserRound,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  LogOut,
  Phone,
  Save,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type UserData = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  role: string;
  balance: number;
  is_active: boolean;
};

export default function SettingsPage() {
  const [userData, setUserData] =
    useState<UserData | null>(null);

  const [fullName, setFullName] = useState("");

  const [currentPassword, setCurrentPassword] =
    useState("");
  const [newPassword, setNewPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);
  const [showNewPassword, setShowNewPassword] =
    useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] =
    useState(false);
  const [changingPassword, setChangingPassword] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        window.location.href = "/";
        return;
      }

      const response = await fetch(
        "/api/auth/me",
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.user) {
        throw new Error(
          result.message ||
            "تعذر تحميل بيانات المستخدم"
        );
      }

      setUserData(result.user);
      setFullName(result.user.full_name || "");
    } catch (err: any) {
      console.error(
        "SETTINGS LOAD ERROR:",
        err
      );

      setError(
        err.message ||
          "حدث خطأ أثناء تحميل البيانات"
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    try {
      setSavingProfile(true);
      setMessage("");
      setError("");

      if (!fullName.trim()) {
        setError("يرجى إدخال الاسم الكامل");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        window.location.href = "/";
        return;
      }

      const response = await fetch(
        "/api/settings/profile",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            full_name: fullName.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "فشل تحديث البيانات"
        );
      }

      setUserData(result.user);

      setMessage(
        "تم تحديث الاسم بنجاح"
      );
    } catch (err: any) {
      console.error(
        "PROFILE UPDATE ERROR:",
        err
      );

      setError(
        err.message ||
          "حدث خطأ أثناء تحديث البيانات"
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    try {
      setChangingPassword(true);
      setMessage("");
      setError("");

      if (!currentPassword) {
        setError(
          "أدخل كلمة المرور الحالية"
        );
        return;
      }

      if (!newPassword) {
        setError(
          "أدخل كلمة المرور الجديدة"
        );
        return;
      }

      if (newPassword.length < 6) {
        setError(
          "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"
        );
        return;
      }

      if (newPassword !== confirmPassword) {
        setError(
          "كلمتا المرور الجديدتان غير متطابقتين"
        );
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        window.location.href = "/";
        return;
      }

      const response = await fetch(
        "/api/settings/password",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "فشل تغيير كلمة المرور"
        );
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setMessage(
        "تم تغيير كلمة المرور بنجاح"
      );
    } catch (err: any) {
      console.error(
        "PASSWORD CHANGE ERROR:",
        err
      );

      setError(
        err.message ||
          "حدث خطأ أثناء تغيير كلمة المرور"
      );
    } finally {
      setChangingPassword(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();

    localStorage.removeItem(
      "access_token"
    );
    localStorage.removeItem("user");

    window.location.href = "/";
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#0b0d10] px-4"
      >
        <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#12151a] p-8 text-center shadow-2xl">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#d6a84f]/10 text-[#d6a84f]">
            <ShieldCheck size={30} />
          </div>

          <p className="mt-5 font-bold text-white">
            جاري تحميل الإعدادات...
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
      className="min-h-screen bg-[#0b0d10] text-white"
    >
      <div className="mx-auto w-full max-w-[1300px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">

        {/* HEADER */}

        <header className="mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-[#12151a] shadow-2xl">

          <div className="relative p-5 sm:p-7">

            <div className="absolute -left-16 -top-20 h-48 w-48 rounded-full bg-[#d6a84f]/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-4">

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#d6a84f]/20 bg-[#d6a84f]/10 text-[#d6a84f]">
                  <ShieldCheck size={27} />
                </div>

                <div>

                  <p className="text-xs font-bold text-[#d6a84f]">
                    حسابي
                  </p>

                  <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                    الإعدادات
                  </h1>

                  <p className="mt-1 text-sm text-white/40">
                    إدارة معلومات حسابك وإعداداتك الشخصية
                  </p>

                </div>

              </div>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#181b20] px-5 py-3 text-sm font-bold text-white transition hover:border-[#d6a84f]/40 hover:bg-[#d6a84f]/10"
              >
                <ArrowLeft size={17} />
                الرئيسية
              </Link>

            </div>

          </div>

        </header>

        {/* MESSAGES */}

        {message && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400">

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
              <Check size={18} />
            </div>

            <div>
              <p className="font-bold">
                تمت العملية بنجاح
              </p>

              <p className="mt-1 text-sm text-emerald-400/70">
                {message}
              </p>
            </div>

          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
              <XCircle size={18} />
            </div>

            <div>
              <p className="font-bold">
                تعذر تنفيذ العملية
              </p>

              <p className="mt-1 text-sm text-red-400/70">
                {error}
              </p>
            </div>

          </div>
        )}

        {/* ACCOUNT SUMMARY */}

        <section className="mb-6 overflow-hidden rounded-[28px] border border-[#d6a84f]/20 bg-[#12151a] shadow-2xl">

          <div className="relative p-5 sm:p-7">

            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#d6a84f]/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex items-center gap-4">

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#d6a84f] text-[#0b0d10] shadow-lg">
                  <CircleUserRound size={32} />
                </div>

                <div className="min-w-0">

                  <h2 className="truncate text-xl font-black text-white">
                    {userData?.full_name ||
                      "المستخدم"}
                  </h2>

                  <div className="mt-1 flex items-center gap-2 text-sm text-white/40">
                    <Phone size={14} />

                    <span dir="ltr">
                      {userData?.phone || "-"}
                    </span>
                  </div>

                </div>

              </div>

              <div className="grid grid-cols-2 gap-3">

                <div className="rounded-2xl border border-white/10 bg-[#181b20] px-4 py-4 sm:min-w-[170px] sm:px-5">

                  <p className="text-[11px] font-bold text-white/35">
                    الرصيد الحالي
                  </p>

                  <p className="mt-1 text-xl font-black text-[#d6a84f]">
                    {Number(
                      userData?.balance || 0
                    ).toFixed(2)}{" "}
                    <span className="text-xs text-white/40">
                      د.أ
                    </span>
                  </p>

                </div>

                <div className="rounded-2xl border border-white/10 bg-[#181b20] px-4 py-4 sm:min-w-[150px] sm:px-5">

                  <p className="text-[11px] font-bold text-white/35">
                    حالة الحساب
                  </p>

                  <div className="mt-2 flex items-center gap-2">

                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        userData?.is_active
                          ? "bg-emerald-400 shadow-lg shadow-emerald-400/30"
                          : "bg-red-400"
                      }`}
                    />

                    <span className="text-sm font-black text-white">
                      {userData?.is_active
                        ? "نشط"
                        : "غير نشط"}
                    </span>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* MAIN CARDS */}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* PERSONAL INFORMATION */}

          <section className="rounded-[28px] border border-white/10 bg-[#12151a] p-5 shadow-2xl sm:p-6">

            <div className="mb-6 flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
                <CircleUserRound size={21} />
              </div>

              <div>

                <h2 className="text-lg font-black text-white">
                  المعلومات الشخصية
                </h2>

                <p className="text-xs text-white/35">
                  تعديل الاسم فقط
                </p>

              </div>

            </div>

            <div className="space-y-5">

              {/* NAME */}

              <div>

                <label className="mb-2 block text-sm font-bold text-white/70">
                  الاسم الكامل
                </label>

                <div className="relative">

                  <CircleUserRound
                    size={17}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25"
                  />

                  <input
                    value={fullName}
                    onChange={(e) =>
                      setFullName(
                        e.target.value
                      )
                    }
                    className="w-full rounded-2xl border border-white/10 bg-[#181b20] py-3.5 pr-11 pl-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-[#d6a84f]/50 focus:ring-2 focus:ring-[#d6a84f]/10"
                    placeholder="الاسم الكامل"
                  />

                </div>

              </div>

              {/* PHONE */}

              <div>

                <label className="mb-2 block text-sm font-bold text-white/70">
                  رقم الهاتف
                </label>

                <div className="relative">

                  <Phone
                    size={17}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20"
                  />

                  <input
                    value={userData?.phone || ""}
                    disabled
                    readOnly
                    className="w-full cursor-not-allowed rounded-2xl border border-white/5 bg-[#181b20]/60 py-3.5 pr-11 pl-4 text-sm text-white/35 outline-none"
                    dir="ltr"
                  />

                </div>

                <p className="mt-2 text-[11px] leading-5 text-white/25">
                  رقم الهاتف تتم إدارته من قبل الإدارة ولا
                  يمكن تغييره من الحساب.
                </p>

              </div>

              {/* EMAIL */}

              <div>

                <label className="mb-2 block text-sm font-bold text-white/70">
                  البريد التقني
                </label>

                <div className="relative">

                  <FileText
                    size={17}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20"
                  />

                  <input
                    value={userData?.email || ""}
                    disabled
                    readOnly
                    className="w-full cursor-not-allowed rounded-2xl border border-white/5 bg-[#181b20]/60 py-3.5 pr-11 pl-4 text-sm text-white/35 outline-none"
                    dir="ltr"
                  />

                </div>

                <p className="mt-2 text-[11px] leading-5 text-white/25">
                  هذا البريد يستخدم داخليًا لتسجيل الدخول.
                </p>

              </div>

              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d6a84f] py-3.5 text-sm font-black text-[#0b0d10] shadow-lg shadow-[#d6a84f]/10 transition hover:bg-[#e2b962] disabled:cursor-not-allowed disabled:opacity-50"
              >

                <Save size={18} />

                {savingProfile
                  ? "جاري الحفظ..."
                  : "حفظ الاسم"}

              </button>

            </div>

          </section>

          {/* PASSWORD */}

          <section className="rounded-[28px] border border-white/10 bg-[#12151a] p-5 shadow-2xl sm:p-6">

            <div className="mb-6 flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
                <KeyRound size={21} />
              </div>

              <div>

                <h2 className="text-lg font-black text-white">
                  تغيير كلمة المرور
                </h2>

                <p className="text-xs text-white/35">
                  تحديث كلمة مرور الحساب
                </p>

              </div>

            </div>

            <div className="space-y-5">

              <PasswordInput
                label="كلمة المرور الحالية"
                value={currentPassword}
                onChange={setCurrentPassword}
                visible={
                  showCurrentPassword
                }
                onToggle={() =>
                  setShowCurrentPassword(
                    !showCurrentPassword
                  )
                }
              />

              <PasswordInput
                label="كلمة المرور الجديدة"
                value={newPassword}
                onChange={setNewPassword}
                visible={
                  showNewPassword
                }
                onToggle={() =>
                  setShowNewPassword(
                    !showNewPassword
                  )
                }
              />

              <PasswordInput
                label="تأكيد كلمة المرور الجديدة"
                value={confirmPassword}
                onChange={setConfirmPassword}
                visible={
                  showConfirmPassword
                }
                onToggle={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
              />

              <div className="rounded-2xl border border-white/5 bg-[#181b20] p-4">

                <div className="flex items-center gap-2">

                  <ShieldCheck
                    size={16}
                    className="text-[#d6a84f]"
                  />

                  <p className="text-sm font-bold text-white">
                    متطلبات كلمة المرور
                  </p>

                </div>

                <ul className="mt-3 space-y-2 text-xs text-white/35">

                  <li>
                    • يجب أن تكون 6 أحرف على الأقل.
                  </li>

                  <li>
                    • لا تشارك كلمة المرور مع أي شخص.
                  </li>

                </ul>

              </div>

              <button
                onClick={changePassword}
                disabled={changingPassword}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d6a84f] py-3.5 text-sm font-black text-[#0b0d10] shadow-lg shadow-[#d6a84f]/10 transition hover:bg-[#e2b962] disabled:cursor-not-allowed disabled:opacity-50"
              >

                <KeyRound size={18} />

                {changingPassword
                  ? "جاري التغيير..."
                  : "تغيير كلمة المرور"}

              </button>

            </div>

          </section>

        </div>

        {/* QUICK LINKS */}

        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#12151a] p-5 shadow-2xl sm:p-6">

          <div className="mb-5">

            <h2 className="text-lg font-black text-white">
              اختصارات الحساب
            </h2>

            <p className="mt-1 text-xs text-white/35">
              الوصول السريع إلى أهم أقسام حسابك
            </p>

          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <SettingsLink
              href="/finance"
              icon={<Wallet size={20} />}
              title="المالية"
              description="الرصيد والمعاملات"
            />

            <SettingsLink
              href="/notifications"
              icon={<Bell size={20} />}
              title="الإشعارات"
              description="عرض التنبيهات"
            />

            <SettingsLink
              href="/weeks"
              icon={<FileText size={20} />}
              title="الأسابيع"
              description="سجل الأسابيع السابقة"
            />

            <div className="rounded-2xl border border-white/5 bg-[#181b20] p-4">

              <div className="flex items-center justify-between">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
                  <ShieldCheck size={19} />
                </div>

                <span className="rounded-full border border-white/5 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-white/30">
                  الحساب
                </span>

              </div>

              <p className="mt-4 font-bold text-white">
                نوع الحساب
              </p>

              <p className="mt-1 text-xs text-white/35">
                {userData?.role === "admin"
                  ? "مدير النظام"
                  : "مستخدم"}
              </p>

            </div>

          </div>

        </section>

        {/* LOGOUT */}

        <section className="mb-10 mt-6">

          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 py-4 text-sm font-black text-red-400 transition hover:bg-red-500/10"
          >
            <LogOut size={18} />
            تسجيل الخروج
          </button>

        </section>

      </div>
    </main>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  visible,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-bold text-white/70">
        {label}
      </label>

      <div className="relative">

        <KeyRound
          size={17}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20"
        />

        <input
          type={
            visible
              ? "text"
              : "password"
          }
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          className="w-full rounded-2xl border border-white/10 bg-[#181b20] py-3.5 pr-11 pl-12 text-sm text-white outline-none transition placeholder:text-white/15 focus:border-[#d6a84f]/50 focus:ring-2 focus:ring-[#d6a84f]/10"
          placeholder="••••••••"
          dir="ltr"
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 transition hover:text-[#d6a84f]"
          aria-label={
            visible
              ? "إخفاء كلمة المرور"
              : "إظهار كلمة المرور"
          }
        >
          {visible ? (
            <EyeOff size={18} />
          ) : (
            <Eye size={18} />
          )}
        </button>

      </div>

    </div>
  );
}

function SettingsLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/5 bg-[#181b20] p-4 transition hover:border-[#d6a84f]/25 hover:bg-[#1c1f24]"
    >

      <div className="flex items-center justify-between">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
          {icon}
        </div>

        <ChevronLeft
          size={18}
          className="text-white/20 transition group-hover:text-[#d6a84f]"
        />

      </div>

      <p className="mt-4 font-black text-white">
        {title}
      </p>

      <p className="mt-1 text-xs text-white/35">
        {description}
      </p>

    </Link>
  );
}