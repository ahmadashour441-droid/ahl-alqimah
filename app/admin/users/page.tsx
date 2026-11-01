"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Menu,
  X,
  Home,
  Users,
  ClipboardList,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Activity,
  CalendarDays,
  Bell,
  Settings,
  LogOut,
  ShieldCheck,
  UserPlus,
  UserRound,
  Pencil,
  Trash2,
  RefreshCw,
  Save,
  CircleCheck,
  CircleX,
  KeyRound,
  Phone,
  ChevronLeft,
  AlertCircle,
  Search,
  SlidersHorizontal,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type User = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  role: "user" | "admin";
  balance: number;
  is_active: boolean;
  login_password: string | null;
  created_at: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const [selectedUser, setSelectedUser] =
    useState<User | null>(null);

  // البحث
  const [search, setSearch] = useState("");

  // إضافة مستخدم
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] =
    useState<"user" | "admin">("user");

  // تعديل مستخدم
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] =
    useState("");
  const [editRole, setEditRole] =
    useState<"user" | "admin">("user");
  const [editActive, setEditActive] =
    useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const token = await getToken();

      if (!token) {
        window.location.href = "/";
        return;
      }

      const response = await fetch(
        "/api/admin/users",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "فشل تحميل المستخدمين"
        );
      }

      setUsers(result.users || []);
    } catch (err: any) {
      console.error(
        "LOAD USERS ERROR:",
        err
      );

      setError(
        err.message ||
          "حدث خطأ أثناء تحميل المستخدمين"
      );
    } finally {
      setLoading(false);
    }
  }

  async function addUser() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!fullName.trim()) {
        setError("يرجى إدخال الاسم");
        return;
      }

      if (!/^07\d{8}$/.test(phone.trim())) {
        setError(
          "رقم الهاتف يجب أن يكون بصيغة 07XXXXXXXX"
        );
        return;
      }

      if (password.length < 6) {
        setError(
          "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
        );
        return;
      }

      const token = await getToken();

      if (!token) {
        window.location.href = "/";
        return;
      }

      const response = await fetch(
        "/api/admin/users",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            full_name: fullName.trim(),
            phone: phone.trim(),
            password,
            role,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "فشل إضافة المستخدم"
        );
      }

      setFullName("");
      setPhone("");
      setPassword("");
      setRole("user");

      setSuccess(
        "تم إضافة المستخدم بنجاح"
      );

      await loadUsers();
    } catch (err: any) {
      console.error(
        "ADD USER ERROR:",
        err
      );

      setError(
        err.message ||
          "حدث خطأ أثناء إضافة المستخدم"
      );
    } finally {
      setSaving(false);
    }
  }

  function openEdit(user: User) {
    setSelectedUser(user);

    setEditName(user.full_name || "");
    setEditPhone(user.phone || "");
    setEditPassword("");
    setEditRole(user.role);
    setEditActive(user.is_active);

    setError("");
    setSuccess("");

    setShowEdit(true);
  }

  async function saveEdit() {
    if (!selectedUser) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!editName.trim()) {
        setError("يرجى إدخال الاسم");
        return;
      }

      if (
        !/^07\d{8}$/.test(
          editPhone.trim()
        )
      ) {
        setError(
          "رقم الهاتف يجب أن يكون بصيغة 07XXXXXXXX"
        );
        return;
      }

      if (
        editPassword &&
        editPassword.length < 6
      ) {
        setError(
          "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
        );
        return;
      }

      const token = await getToken();

      if (!token) {
        window.location.href = "/";
        return;
      }

      const response = await fetch(
        "/api/admin/users",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: selectedUser.id,
            full_name: editName.trim(),
            phone: editPhone.trim(),
            password: editPassword,
            role: editRole,
            is_active: editActive,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "فشل تحديث المستخدم"
        );
      }

      setShowEdit(false);
      setSelectedUser(null);

      setSuccess(
        "تم تحديث بيانات المستخدم بنجاح"
      );

      await loadUsers();
    } catch (err: any) {
      console.error(
        "EDIT USER ERROR:",
        err
      );

      setError(
        err.message ||
          "حدث خطأ أثناء تحديث المستخدم"
      );
    } finally {
      setSaving(false);
    }
  }

  function openDelete(user: User) {
    setSelectedUser(user);

    setError("");
    setSuccess("");

    setShowDelete(true);
  }

  async function deleteUser() {
    if (!selectedUser) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const token = await getToken();

      if (!token) {
        window.location.href = "/";
        return;
      }

      const response = await fetch(
        "/api/admin/users",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: selectedUser.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "فشل حذف المستخدم"
        );
      }

      setShowDelete(false);
      setSelectedUser(null);

      setSuccess(
        "تم حذف المستخدم بنجاح"
      );

      await loadUsers();
    } catch (err: any) {
      console.error(
        "DELETE USER ERROR:",
        err
      );

      setError(
        err.message ||
          "حدث خطأ أثناء حذف المستخدم"
      );
    } finally {
      setSaving(false);
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(
      "ar-JO",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );
  }

  const normalUsers = users.filter(
    (user) => user.role === "user"
  );

  /*
   * البحث الشامل
   * يبحث في:
   * الاسم
   * الهاتف
   * ID
   * الدور
   * الرصيد
   * الحالة
   * الإيميل
   * كلمة المرور
   */
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return users;
    }

    const arabicQuery = query;

    return users.filter((user) => {
      const name =
        user.full_name?.toLowerCase() || "";

      const phone =
        user.phone?.toLowerCase() || "";

      const id =
        user.id?.toLowerCase() || "";

      const email =
        user.email?.toLowerCase() || "";

      const password =
        user.login_password?.toLowerCase() ||
        "";

      const role =
        user.role === "admin"
          ? "أدمن"
          : "مستخدم";

      const roleEnglish =
        user.role?.toLowerCase() || "";

      const balance =
        Number(user.balance || 0)
          .toFixed(2)
          .toLowerCase();

      const active =
        user.is_active
          ? "نشط"
          : "موقوف";

      const activeEnglish =
        user.is_active
          ? "active"
          : "inactive";

      const createdAt =
        formatDate(user.created_at);

      return (
        name.includes(query) ||
        phone.includes(query) ||
        id.includes(query) ||
        email.includes(query) ||
        password.includes(query) ||
        role.includes(arabicQuery) ||
        roleEnglish.includes(query) ||
        balance.includes(query) ||
        active.includes(arabicQuery) ||
        activeEnglish.includes(query) ||
        createdAt.includes(query)
      );
    });
  }, [users, search]);

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#0b0d10] text-white"
      >
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#d6a84f]" />

            <p className="text-sm text-white/45">
              جاري تحميل المستخدمين...
            </p>
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
      {/* OVERLAY */}

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* SIDE MENU */}

      <aside
        className={`fixed right-0 top-0 z-50 h-full w-[84%] max-w-[350px] border-l border-white/10 bg-[#101317] shadow-2xl transition-transform duration-300 ${
          menuOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">

          <div className="border-b border-white/10 p-5">

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d6a84f]/30 bg-[#d6a84f]/10 text-[#d6a84f]">
                  <ShieldCheck
                    size={21}
                    strokeWidth={1.7}
                  />
                </div>

                <div>
                  <h2 className="text-lg font-black tracking-wide text-[#d6a84f]">
                    أهل القمة
                  </h2>

                  <p className="mt-0.5 text-[10px] text-white/35">
                    لوحة إدارة النظام
                  </p>
                </div>

              </div>

              <button
                onClick={() =>
                  setMenuOpen(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/50"
              >
                <X
                  size={18}
                  strokeWidth={1.8}
                />
              </button>

            </div>

          </div>

          <div className="flex-1 overflow-y-auto p-3">

            <MenuItem
              icon={
                <Home
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="الرئيسية"
              onClick={() => goTo("/admin")}
            />

            <MenuItem
              icon={
                <Users
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="المستخدمون"
              active
              onClick={() =>
                goTo("/admin/users")
              }
            />

            <MenuItem
              icon={
                <ClipboardList
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="الطلبات"
              onClick={() =>
                goTo("/admin/orders")
              }
            />

            <MenuItem
              icon={
                <ArrowUpCircle
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="طلبات الشحن"
              onClick={() =>
                goTo("/admin/topups")
              }
            />

            <MenuItem
              icon={
                <ArrowDownCircle
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="طلبات السحب"
              onClick={() =>
                goTo("/admin/withdrawals")
              }
            />

            <MenuItem
              icon={
                <Activity
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="الحركات المالية"
              onClick={() =>
                goTo("/admin/transactions")
              }
            />

            <MenuItem
              icon={
                <CalendarDays
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="الأسابيع"
              onClick={() =>
                goTo("/admin/weeks")
              }
            />

            <MenuItem
              icon={
                <Bell
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="الإشعارات"
              onClick={() =>
                goTo("/admin/notifications")
              }
            />

            <MenuItem
              icon={
                <Settings
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="الإعدادات"
              onClick={() =>
                goTo("/admin/settings")
              }
            />

          </div>

          <div className="border-t border-white/10 p-3">

            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-right text-sm text-red-400 transition hover:bg-red-500/5"
            >

              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10">
                <LogOut
                  size={17}
                  strokeWidth={1.8}
                />
              </span>

              تسجيل الخروج

            </button>

          </div>

        </div>
      </aside>

      {/* MAIN */}

      <div className="mx-auto min-h-screen max-w-7xl px-4 pb-10 pt-4 sm:px-6">

        {/* HEADER */}

        <header className="mb-5 flex items-center justify-between">

          <button
            onClick={() =>
              setMenuOpen(true)
            }
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#12151a] text-white/70 transition hover:border-[#d6a84f]/30 hover:text-[#d6a84f]"
          >
            <Menu
              size={20}
              strokeWidth={1.8}
            />
          </button>

          <div className="text-center">

            <h1 className="text-lg font-black tracking-wide text-[#d6a84f]">
              أهل القمة
            </h1>

            <p className="mt-0.5 text-[11px] text-white/45">
              المستخدمون
            </p>

          </div>

          <button
            onClick={loadUsers}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#12151a] text-white/60 transition hover:border-[#d6a84f]/30 hover:text-[#d6a84f]"
          >
            <RefreshCw
              size={18}
              strokeWidth={1.8}
            />
          </button>

        </header>

        {/* MESSAGES */}

        {success && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-emerald-300">

            <CircleCheck
              size={19}
              className="mt-0.5 shrink-0"
              strokeWidth={1.8}
            />

            <p className="text-sm font-medium">
              {success}
            </p>

          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-red-300">

            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
              strokeWidth={1.8}
            />

            <p className="text-sm font-medium">
              {error}
            </p>

          </div>
        )}

        {/* PAGE INTRO */}

        <section className="mb-4 rounded-[26px] border border-white/10 bg-gradient-to-br from-[#171a20] to-[#101216] p-5">

          <div className="flex items-center gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#d6a84f]/30 bg-[#d6a84f]/10 text-[#d6a84f]">
              <Users
                size={21}
                strokeWidth={1.7}
              />
            </div>

            <div className="min-w-0">

              <p className="text-[11px] text-white/35">
                إدارة الحسابات
              </p>

              <h2 className="mt-1 text-lg font-bold">
                المستخدمون
              </h2>

              <p className="mt-1 text-[10px] text-white/30">
                {normalUsers.length} مستخدم
                مسجل في النظام
              </p>

            </div>

          </div>

        </section>

        {/* ADD USER */}

        <section className="mb-5 rounded-[26px] border border-white/10 bg-[#12151a] p-5">

          <div className="mb-5 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
              <UserPlus
                size={19}
                strokeWidth={1.8}
              />
            </div>

            <div>

              <h2 className="text-sm font-bold">
                إضافة مستخدم جديد
              </h2>

              <p className="mt-1 text-[10px] text-white/30">
                إنشاء حساب جديد للنظام
              </p>

            </div>

          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

            <InputField
              label="الاسم الكامل"
              value={fullName}
              onChange={setFullName}
              placeholder="مثال: أحمد محمد"
              icon={
                <UserRound
                  size={16}
                  strokeWidth={1.8}
                />
              }
            />

            <InputField
              label="رقم الهاتف"
              value={phone}
              onChange={setPhone}
              placeholder="079XXXXXXX"
              dir="ltr"
              icon={
                <Phone
                  size={16}
                  strokeWidth={1.8}
                />
              }
            />

            <InputField
              label="كلمة المرور"
              value={password}
              onChange={setPassword}
              placeholder="كلمة المرور"
              dir="ltr"
              type="text"
              icon={
                <KeyRound
                  size={16}
                  strokeWidth={1.8}
                />
              }
            />

            <div>

              <label className="mb-2 block text-[11px] font-semibold text-white/55">
                نوع الحساب
              </label>

              <div className="relative">

                <ShieldCheck
                  size={16}
                  strokeWidth={1.8}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#d6a84f]"
                />

                <select
                  value={role}
                  onChange={(e) =>
                    setRole(
                      e.target.value as
                        | "user"
                        | "admin"
                    )
                  }
                  className="w-full appearance-none rounded-xl border border-white/10 bg-[#0e1115] px-10 py-3 text-sm text-white outline-none transition focus:border-[#d6a84f]/40"
                >
                  <option value="user">
                    مستخدم
                  </option>

                  <option value="admin">
                    أدمن
                  </option>

                </select>

              </div>

            </div>

          </div>

          <div className="mt-4 flex justify-end">

            <button
              onClick={addUser}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-[#d6a84f] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#e2b860] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserPlus
                size={17}
                strokeWidth={1.9}
              />

              {saving
                ? "جاري الإضافة..."
                : "إضافة المستخدم"}

            </button>

          </div>

        </section>

        {/* USERS */}

        <section className="overflow-hidden rounded-[26px] border border-white/10 bg-[#12151a]">

          <div className="border-b border-white/10 p-5">

            <div className="mb-4 flex items-center justify-between gap-3">

              <div>

                <h2 className="text-sm font-bold">
                  قائمة المستخدمين
                </h2>

                <p className="mt-1 text-[10px] text-white/30">
                  {filteredUsers.length} من {users.length} حساب
                </p>

              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
                <Users
                  size={17}
                  strokeWidth={1.8}
                />
              </div>

            </div>

            {/* SEARCH */}

            <div className="relative">

              <Search
                size={18}
                strokeWidth={1.8}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#d6a84f]"
              />

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="بحث شامل: الاسم، الهاتف، ID، الرصيد، الصلاحية، الحالة..."
                className="w-full rounded-2xl border border-white/10 bg-[#0e1115] py-3.5 pr-11 pl-11 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-[#d6a84f]/40"
              />

              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-white/5 text-white/40 transition hover:bg-white/10 hover:text-white"
                  aria-label="مسح البحث"
                >
                  <X
                    size={14}
                    strokeWidth={1.8}
                  />
                </button>
              )}

            </div>

            {/* SEARCH STATUS */}

            {search.trim() && (
              <div className="mt-3 flex items-center gap-2 text-[10px] text-white/35">

                <SlidersHorizontal
                  size={13}
                  strokeWidth={1.8}
                />

                <span>
                  نتائج البحث عن:
                </span>

                <span className="font-semibold text-[#d6a84f]">
                  {search}
                </span>

              </div>
            )}

          </div>

          {/* MOBILE CARDS */}

          <div className="block p-3 lg:hidden">

            {filteredUsers.length === 0 ? (
              <div className="p-10 text-center">

                <Search
                  size={24}
                  className="mx-auto mb-3 text-white/15"
                  strokeWidth={1.5}
                />

                <p className="text-sm text-white/30">
                  {search
                    ? "لا توجد نتائج مطابقة للبحث."
                    : "لا يوجد مستخدمون."}
                </p>

              </div>
            ) : (
              filteredUsers.map((user) => (
                <MobileUserCard
                  key={user.id}
                  user={user}
                  onEdit={() =>
                    openEdit(user)
                  }
                  onDelete={() =>
                    openDelete(user)
                  }
                />
              ))
            )}

          </div>

          {/* DESKTOP TABLE */}

          <div className="hidden overflow-x-auto lg:block">

            <table className="w-full text-sm">

              <thead className="border-b border-white/10 bg-[#0f1216]">

                <tr>

                  <th className="px-5 py-4 text-right text-[11px] font-semibold text-white/45">
                    المستخدم
                  </th>

                  <th className="px-5 py-4 text-right text-[11px] font-semibold text-white/45">
                    الهاتف
                  </th>

                  <th className="px-5 py-4 text-right text-[11px] font-semibold text-white/45">
                    كلمة المرور
                  </th>

                  <th className="px-5 py-4 text-right text-[11px] font-semibold text-white/45">
                    الصلاحية
                  </th>

                  <th className="px-5 py-4 text-right text-[11px] font-semibold text-white/45">
                    الرصيد
                  </th>

                  <th className="px-5 py-4 text-right text-[11px] font-semibold text-white/45">
                    الحالة
                  </th>

                  <th className="px-5 py-4 text-right text-[11px] font-semibold text-white/45">
                    تاريخ الإنشاء
                  </th>

                  <th className="px-5 py-4 text-right text-[11px] font-semibold text-white/45">
                    الإجراءات
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredUsers.length === 0 ? (
                  <tr>

                    <td
                      colSpan={8}
                      className="p-14 text-center"
                    >

                      <Search
                        size={25}
                        className="mx-auto mb-3 text-white/15"
                        strokeWidth={1.5}
                      />

                      <p className="text-sm text-white/30">
                        {search
                          ? "لا توجد نتائج مطابقة للبحث."
                          : "لا يوجد مستخدمون."}
                      </p>

                    </td>

                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-white/5 transition hover:bg-white/[0.02]"
                    >

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d6a84f]/10 text-xs font-bold text-[#d6a84f]">
                            {getInitials(
                              user.full_name
                            )}
                          </div>

                          <div className="min-w-0">

                            <p className="max-w-[180px] truncate font-semibold">
                              {user.full_name}
                            </p>

                            <p className="mt-1 text-[9px] text-white/25">
                              ID: {user.id}
                            </p>

                          </div>

                        </div>

                      </td>

                      <td
                        className="px-5 py-4 text-white/60"
                        dir="ltr"
                      >
                        {user.phone}
                      </td>

                      <td
                        className="px-5 py-4 font-mono font-semibold text-[#d6a84f]"
                        dir="ltr"
                      >
                        {user.login_password || "—"}
                      </td>

                      <td className="px-5 py-4">

                        <RoleBadge
                          role={user.role}
                        />

                      </td>

                      <td
                        className={`px-5 py-4 font-bold ${
                          Number(user.balance) > 0
                            ? "text-emerald-400"
                            : Number(
                                user.balance
                              ) < 0
                            ? "text-red-400"
                            : "text-white/40"
                        }`}
                      >
                        {Number(
                          user.balance || 0
                        ).toFixed(2)}{" "}
                        د.أ
                      </td>

                      <td className="px-5 py-4">

                        <StatusBadge
                          active={
                            user.is_active
                          }
                        />

                      </td>

                      <td className="px-5 py-4 text-white/35">
                        {formatDate(
                          user.created_at
                        )}
                      </td>

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-2">

                          <button
                            onClick={() =>
                              openEdit(user)
                            }
                            className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-white/65 transition hover:bg-[#d6a84f]/10 hover:text-[#d6a84f]"
                          >
                            <Pencil
                              size={14}
                              strokeWidth={1.8}
                            />
                            تعديل
                          </button>

                          <button
                            onClick={() =>
                              openDelete(user)
                            }
                            className="flex items-center gap-1.5 rounded-xl bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
                          >
                            <Trash2
                              size={14}
                              strokeWidth={1.8}
                            />
                            حذف
                          </button>

                        </div>

                      </td>

                    </tr>
                  ))
                )}

              </tbody>

            </table>

          </div>

        </section>

      </div>

      {/* EDIT MODAL */}

      {showEdit && selectedUser && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center"
          onClick={() =>
            setShowEdit(false)
          }
        >

          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#12151a] shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#12151a] p-5">

              <div>

                <h2 className="text-lg font-bold">
                  تعديل المستخدم
                </h2>

                <p className="mt-1 text-[10px] text-white/30">
                  تعديل بيانات الحساب والصلاحيات
                </p>

              </div>

              <button
                onClick={() =>
                  setShowEdit(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/50"
              >
                <X
                  size={17}
                  strokeWidth={1.8}
                />
              </button>

            </div>

            <div className="space-y-5 p-5">

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                <InputField
                  label="الاسم الكامل"
                  value={editName}
                  onChange={setEditName}
                  placeholder="الاسم"
                  icon={
                    <UserRound
                      size={16}
                      strokeWidth={1.8}
                    />
                  }
                />

                <InputField
                  label="رقم الهاتف"
                  value={editPhone}
                  onChange={setEditPhone}
                  placeholder="079XXXXXXX"
                  dir="ltr"
                  icon={
                    <Phone
                      size={16}
                      strokeWidth={1.8}
                    />
                  }
                />

                <InputField
                  label="كلمة مرور جديدة"
                  value={editPassword}
                  onChange={setEditPassword}
                  placeholder="اتركها فارغة إذا لا تريد تغييرها"
                  dir="ltr"
                  type="text"
                  icon={
                    <KeyRound
                      size={16}
                      strokeWidth={1.8}
                    />
                  }
                />

                <div>

                  <label className="mb-2 block text-[11px] font-semibold text-white/55">
                    الصلاحية
                  </label>

                  <div className="relative">

                    <ShieldCheck
                      size={16}
                      strokeWidth={1.8}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#d6a84f]"
                    />

                    <select
                      value={editRole}
                      onChange={(e) =>
                        setEditRole(
                          e.target.value as
                            | "user"
                            | "admin"
                        )
                      }
                      className="w-full appearance-none rounded-xl border border-white/10 bg-[#0e1115] px-10 py-3 text-sm text-white outline-none focus:border-[#d6a84f]/40"
                    >
                      <option value="user">
                        مستخدم
                      </option>

                      <option value="admin">
                        أدمن
                      </option>

                    </select>

                  </div>

                </div>

              </div>

              {/* STATUS */}

              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">

                <div className="flex items-center justify-between gap-4">

                  <div>

                    <p className="text-sm font-semibold">
                      حالة الحساب
                    </p>

                    <p className="mt-1 text-[10px] text-white/30">
                      المستخدم الموقوف لا يستطيع استخدام النظام.
                    </p>

                  </div>

                  <button
                    onClick={() =>
                      setEditActive(
                        !editActive
                      )
                    }
                    className={`relative h-8 w-14 rounded-full transition ${
                      editActive
                        ? "bg-emerald-500"
                        : "bg-white/15"
                    }`}
                  >

                    <span
                      className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                        editActive
                          ? "right-1"
                          : "right-7"
                      }`}
                    />

                  </button>

                </div>

                <div className="mt-3 flex items-center gap-2">

                  {editActive ? (
                    <CircleCheck
                      size={16}
                      className="text-emerald-400"
                    />
                  ) : (
                    <CircleX
                      size={16}
                      className="text-red-400"
                    />
                  )}

                  <p
                    className={`text-xs font-semibold ${
                      editActive
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {editActive
                      ? "الحساب نشط"
                      : "الحساب موقوف"}
                  </p>

                </div>

              </div>

              {/* BALANCE */}

              <div className="rounded-2xl border border-white/8 bg-[#0e1115] p-4">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-[10px] text-white/30">
                      الرصيد الحالي
                    </p>

                    <p
                      className={`mt-1 text-2xl font-black ${
                        Number(
                          selectedUser.balance
                        ) > 0
                          ? "text-emerald-400"
                          : Number(
                              selectedUser.balance
                            ) < 0
                          ? "text-red-400"
                          : "text-white/40"
                      }`}
                    >
                      {Number(
                        selectedUser.balance ||
                          0
                      ).toFixed(2)}{" "}
                      د.أ
                    </p>

                  </div>

                  <Wallet
                    size={21}
                    className="text-[#d6a84f]"
                    strokeWidth={1.7}
                  />

                </div>

                <p className="mt-2 text-[9px] text-white/25">
                  تعديل الرصيد يتم من خلال الحركات المالية حتى يبقى السجل المالي صحيحًا.
                </p>

              </div>

            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 p-5">

              <button
                onClick={() =>
                  setShowEdit(false)
                }
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/60 transition hover:bg-white/5"
              >
                إلغاء
              </button>

              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-[#d6a84f] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#e2b860] disabled:opacity-50"
              >

                <Save
                  size={16}
                  strokeWidth={1.9}
                />

                {saving
                  ? "جاري الحفظ..."
                  : "حفظ التعديلات"}

              </button>

            </div>

          </div>

        </div>
      )}

      {/* DELETE MODAL */}

      {showDelete && selectedUser && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center"
          onClick={() =>
            setShowDelete(false)
          }
        >

          <div
            className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#12151a] p-6 shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                <Trash2
                  size={23}
                  strokeWidth={1.7}
                />
              </div>

              <h2 className="mt-5 text-lg font-bold">
                حذف المستخدم؟
              </h2>

              <p className="mt-2 text-sm text-white/40">
                هل أنت متأكد أنك تريد حذف:
              </p>

              <p className="mt-1 text-base font-bold">
                {selectedUser.full_name}
              </p>

              <p
                className="mt-1 text-xs text-white/35"
                dir="ltr"
              >
                {selectedUser.phone}
              </p>

              <div className="mt-5 rounded-2xl border border-red-400/10 bg-red-400/5 p-4 text-right text-xs leading-6 text-red-300">
                إذا كان لدى المستخدم بيانات
                مرتبطة بالنظام، سيتم رفض الحذف
                للحفاظ على السجل المالي.
              </div>

            </div>

            <div className="mt-6 flex gap-2">

              <button
                onClick={() =>
                  setShowDelete(false)
                }
                className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/60"
              >
                إلغاء
              </button>

              <button
                onClick={deleteUser}
                disabled={saving}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {saving
                  ? "جاري الحذف..."
                  : "نعم، حذف"}
              </button>

            </div>

          </div>

        </div>
      )}
    </main>
  );
}

/* =========================================================
   INPUT
========================================================= */

function InputField({
  label,
  value,
  onChange,
  placeholder,
  icon,
  type = "text",
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  type?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div>

      <label className="mb-2 block text-[11px] font-semibold text-white/55">
        {label}
      </label>

      <div className="relative">

        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#d6a84f]">
          {icon}
        </span>

        <input
          type={type}
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          placeholder={placeholder}
          dir={dir}
          className="w-full rounded-xl border border-white/10 bg-[#0e1115] px-10 py-3 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-[#d6a84f]/40"
        />

      </div>

    </div>
  );
}

/* =========================================================
   ROLE BADGE
========================================================= */

function RoleBadge({
  role,
}: {
  role: "user" | "admin";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold ${
        role === "admin"
          ? "bg-purple-400/10 text-purple-300"
          : "bg-[#d6a84f]/10 text-[#d6a84f]"
      }`}
    >

      <ShieldCheck
        size={12}
        strokeWidth={1.8}
      />

      {role === "admin"
        ? "أدمن"
        : "مستخدم"}

    </span>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold ${
        active
          ? "bg-emerald-400/10 text-emerald-300"
          : "bg-red-400/10 text-red-300"
      }`}
    >

      {active ? (
        <CircleCheck
          size={12}
          strokeWidth={1.8}
        />
      ) : (
        <CircleX
          size={12}
          strokeWidth={1.8}
        />
      )}

      {active ? "نشط" : "موقوف"}

    </span>
  );
}

/* =========================================================
   MOBILE USER CARD
========================================================= */

function MobileUserCard({
  user,
  onEdit,
  onDelete,
}: {
  user: User;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="mb-3 rounded-2xl border border-white/7 bg-[#0f1216] p-4">

      <div className="flex items-start justify-between gap-3">

        <div className="flex min-w-0 items-center gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d6a84f]/10 text-sm font-bold text-[#d6a84f]">
            {getInitials(
              user.full_name
            )}
          </div>

          <div className="min-w-0">

            <p className="truncate text-sm font-bold">
              {user.full_name}
            </p>

            <p
              className="mt-1 text-[10px] text-white/35"
              dir="ltr"
            >
              {user.phone}
            </p>

          </div>

        </div>

        <StatusBadge
          active={user.is_active}
        />

      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">

        <InfoBox
          title="الرصيد"
          value={`${Number(
            user.balance || 0
          ).toFixed(2)} د.أ`}
          valueClass={
            Number(user.balance) > 0
              ? "text-emerald-400"
              : Number(user.balance) < 0
              ? "text-red-400"
              : "text-white/40"
          }
        />

        <InfoBox
          title="الصلاحية"
          value={
            user.role === "admin"
              ? "أدمن"
              : "مستخدم"
          }
        />

        <InfoBox
          title="كلمة المرور"
          value={
            user.login_password || "—"
          }
          dir="ltr"
          mono
        />

        <InfoBox
          title="الإنشاء"
          value={new Date(
            user.created_at
          ).toLocaleDateString("ar-JO")}
        />

      </div>

      <div className="mt-3 flex gap-2">

        <button
          onClick={onEdit}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#d6a84f]/10 py-2.5 text-xs font-bold text-[#d6a84f]"
        >
          <Pencil
            size={14}
            strokeWidth={1.8}
          />
          تعديل
        </button>

        <button
          onClick={onDelete}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500/5 py-2.5 text-xs font-bold text-red-400"
        >
          <Trash2
            size={14}
            strokeWidth={1.8}
          />
          حذف
        </button>

      </div>

    </div>
  );
}

/* =========================================================
   INFO BOX
========================================================= */

function InfoBox({
  title,
  value,
  valueClass = "text-white/65",
  dir,
  mono,
}: {
  title: string;
  value: string;
  valueClass?: string;
  dir?: "ltr" | "rtl";
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">

      <p className="text-[9px] text-white/25">
        {title}
      </p>

      <p
        dir={dir}
        className={`mt-1 truncate text-[11px] font-semibold ${valueClass} ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   MENU ITEM
========================================================= */

function MenuItem({
  icon,
  title,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-right transition ${
        active
          ? "bg-[#d6a84f]/10 text-[#d6a84f]"
          : "text-white/55 hover:bg-white/5 hover:text-white"
      }`}
    >

      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          active
            ? "bg-[#d6a84f]/10"
            : "bg-white/[0.035]"
        }`}
      >
        {icon}
      </span>

      <span className="flex-1 text-sm font-medium">
        {title}
      </span>

      <ChevronLeft
        size={14}
        className="text-white/20"
      />

    </button>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function getInitials(
  name: string | null
) {
  if (!name) return "؟";

  const parts = name.trim().split(" ");

  if (parts.length === 1) {
    return parts[0].slice(0, 1);
  }

  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`;
}

function goTo(path: string) {
  window.location.href = path;
}

async function logout() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  await supabase.auth.signOut();

  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
  localStorage.removeItem("admin");

  window.location.href = "/";
}