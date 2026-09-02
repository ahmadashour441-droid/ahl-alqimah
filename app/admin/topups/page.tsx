"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  CircleAlert,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Settings,
  Users,
  Wallet,
  X,
  ClipboardList,
  Receipt,
  XCircle,
  Banknote,
  Smartphone,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type TopUpRequest = {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  notes: string | null;
  status: string;
  created_at: string;
  user_name: string;
  user_phone: string;
};

export default function AdminTopUpsPage() {
  const [requests, setRequests] = useState<TopUpRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);

  async function loadRequests() {
    try {
      setLoading(true);
      setError("");

      const {
        data: sessionData,
      } = await supabase.auth.getSession();

      const token =
        sessionData.session?.access_token;

      if (!token) {
        throw new Error(
          "جلسة الدخول غير موجودة"
        );
      }

      const response = await fetch(
        "/api/admin/topups",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "تعذر تحميل طلبات الشحن"
        );
      }

      setRequests(result.requests || []);
    } catch (err) {
      console.error(
        "LOAD TOPUPS ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "تعذر تحميل طلبات الشحن"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleAction(
    id: string,
    action: "approve" | "reject"
  ) {
    const confirmMessage =
      action === "approve"
        ? "هل أنت متأكد من الموافقة؟ سيتم إضافة المبلغ إلى رصيد المستخدم."
        : "هل أنت متأكد من رفض طلب الشحن؟";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setProcessingId(id);
      setMessage("");
      setError("");

      const {
        data: sessionData,
      } = await supabase.auth.getSession();

      const token =
        sessionData.session?.access_token;

      if (!token) {
        throw new Error(
          "جلسة الدخول غير موجودة"
        );
      }

      const response = await fetch(
        "/api/admin/topups",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id,
            action,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "تعذر تنفيذ العملية"
        );
      }

      setMessage(
        action === "approve"
          ? "تمت الموافقة على طلب الشحن وإضافة المبلغ إلى رصيد المستخدم."
          : "تم رفض طلب الشحن."
      );

      await loadRequests();
    } catch (err) {
      console.error(
        "TOPUP ACTION ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "تعذر تنفيذ العملية"
      );
    } finally {
      setProcessingId(null);
    }
  }

  function paymentMethodLabel(
    method: string
  ) {
    switch (method) {
      case "cash":
        return "نقدي";

      case "bank_transfer":
        return "تحويل بنكي";

      case "wallet":
        return "محفظة إلكترونية";

      default:
        return method || "-";
    }
  }

  function paymentMethodIcon(
    method: string
  ) {
    switch (method) {
      case "cash":
        return <Banknote size={15} />;

      case "wallet":
        return <Smartphone size={15} />;

      case "bank_transfer":
        return <CreditCard size={15} />;

      default:
        return <CreditCard size={15} />;
    }
  }

  function statusLabel(status: string) {
    switch (status) {
      case "pending":
        return "قيد المراجعة";

      case "approved":
        return "مقبول";

      case "rejected":
        return "مرفوض";

      default:
        return status;
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString(
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

  function goTo(path: string) {
    window.location.href = path;
  }

  async function logout() {
    await supabase.auth.signOut();

    localStorage.removeItem("user");
    localStorage.removeItem("access_token");

    window.location.href = "/";
  }

  const pendingRequests =
    requests.filter(
      (item) =>
        item.status === "pending"
    );

  const approvedRequests =
    requests.filter(
      (item) =>
        item.status === "approved"
    );

  const rejectedRequests =
    requests.filter(
      (item) =>
        item.status === "rejected"
    );

  const pendingCount =
    pendingRequests.length;

  const completedCount =
    approvedRequests.length +
    rejectedRequests.length;

  const approvedAmount =
    approvedRequests.reduce(
      (total, item) =>
        total + Number(item.amount || 0),
      0
    );

  const pendingAmount =
    pendingRequests.reduce(
      (total, item) =>
        total + Number(item.amount || 0),
      0
    );

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
              جاري تحميل طلبات الشحن...
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
            <div className="mb-2 px-3 text-[10px] font-bold text-white/30">
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
              active
              onClick={() =>
                setMenuOpen(false)
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
              icon={<Receipt size={18} />}
              label="الحركات المالية"
              onClick={() =>
                goTo("/admin/transactions")
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

            <div className="mb-2 mt-6 px-3 text-[10px] font-bold text-white/30">
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
            onClick={() =>
              setMenuOpen(true)
            }
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
              طلبات الشحن
            </p>
          </div>

          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[#d6a84f]/20 bg-[#d6a84f]/5">
            <Wallet
              size={19}
              className="text-[#d6a84f]"
            />

            {pendingCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
                {pendingCount > 99
                  ? "99+"
                  : pendingCount}
              </span>
            )}
          </div>
        </header>

        {/* TITLE */}

        <section className="mb-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                طلبات شحن الرصيد
              </h2>

              <p className="mt-1 text-xs text-white/40">
                مراجعة طلبات شحن المستخدمين
              </p>
            </div>

            <button
              type="button"
              onClick={loadRequests}
              disabled={loading}
              className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white/70 transition hover:border-[#d6a84f]/30 hover:text-[#d6a84f] disabled:opacity-50"
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

        {/* STATS */}

        <section className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <StatCard
            icon={<Wallet size={17} />}
            label="إجمالي الطلبات"
            value={requests.length}
          />

          <StatCard
            icon={
              <CircleAlert size={17} />
            }
            label="قيد المراجعة"
            value={pendingCount}
            danger={pendingCount > 0}
          />

          <StatCard
            icon={
              <CheckCircle2 size={17} />
            }
            label="مكتملة"
            value={completedCount}
            success
          />

          <StatCard
            icon={<Banknote size={17} />}
            label="قيمة المعلّق"
            value={`${pendingAmount.toFixed(
              2
            )} د.أ`}
            gold
          />
        </section>

        {/* MESSAGES */}

        {message && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-emerald-300">
            <CheckCircle2
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

        {/* PENDING NOTICE */}

        {pendingCount > 0 && (
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#d6a84f]/15 bg-[#d6a84f]/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
                <Wallet size={17} />
              </div>

              <div>
                <p className="text-xs font-black text-white">
                  يوجد {pendingCount} طلب شحن بانتظار المراجعة
                </p>

                <p className="mt-1 text-[10px] text-white/35">
                  القيمة الإجمالية المعلقة{" "}
                  <span className="font-bold text-[#d6a84f]">
                    {pendingAmount.toFixed(
                      2
                    )}{" "}
                    د.أ
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* REQUESTS */}

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a] shadow-2xl shadow-black/20">
          <div className="border-b border-white/10 px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">
                  جميع طلبات الشحن
                </h3>

                <p className="mt-1 text-[10px] text-white/35">
                  مراجعة ومعالجة طلبات المستخدمين
                </p>
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d6a84f]/10 text-[#d6a84f]">
                <CreditCard size={15} />
              </div>
            </div>
          </div>

          {requests.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-5 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                <Wallet
                  size={25}
                  className="text-white/25"
                />
              </div>

              <h3 className="mt-4 text-sm font-black text-white/60">
                لا توجد طلبات شحن
              </h3>

              <p className="mt-1 text-[10px] text-white/30">
                ستظهر هنا طلبات الشحن الجديدة
              </p>
            </div>
          ) : (
            <>
              {/* MOBILE */}

              <div className="divide-y divide-white/[0.06] md:hidden">
                {requests.map(
                  (request) => (
                    <div
                      key={request.id}
                      className="p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
                            <Users size={17} />
                          </div>

                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-black text-white">
                              {request.user_name}
                            </h4>

                            <p
                              dir="ltr"
                              className="mt-1 text-right text-[10px] text-white/35"
                            >
                              {request.user_phone}
                            </p>
                          </div>
                        </div>

                        <StatusBadge
                          status={
                            request.status
                          }
                          label={statusLabel(
                            request.status
                          )}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                          <p className="text-[9px] text-white/30">
                            المبلغ
                          </p>

                          <p className="mt-1 text-sm font-black text-[#d6a84f]">
                            {Number(
                              request.amount
                            ).toFixed(2)}{" "}
                            د.أ
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                          <p className="text-[9px] text-white/30">
                            طريقة الدفع
                          </p>

                          <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-white/70">
                            {paymentMethodIcon(
                              request.payment_method
                            )}

                            {paymentMethodLabel(
                              request.payment_method
                            )}
                          </div>
                        </div>
                      </div>

                      {request.notes && (
                        <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                          <p className="text-[9px] text-white/30">
                            ملاحظات
                          </p>

                          <p className="mt-1 text-[10px] leading-5 text-white/55">
                            {request.notes}
                          </p>
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-[9px] text-white/25">
                          {formatDate(
                            request.created_at
                          )}
                        </span>

                        {request.status ===
                        "pending" ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={
                                processingId ===
                                request.id
                              }
                              onClick={() =>
                                handleAction(
                                  request.id,
                                  "approve"
                                )
                              }
                              className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-[10px] font-black text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
                            >
                              <Check
                                size={13}
                              />

                              {processingId ===
                              request.id
                                ? "..."
                                : "موافقة"}
                            </button>

                            <button
                              type="button"
                              disabled={
                                processingId ===
                                request.id
                              }
                              onClick={() =>
                                handleAction(
                                  request.id,
                                  "reject"
                                )
                              }
                              className="flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-2 text-[10px] font-black text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                            >
                              <XCircle
                                size={13}
                              />

                              رفض
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-white/25">
                            تم التعامل
                          </span>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* DESKTOP */}

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1050px] text-right">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      <th className="px-5 py-4 text-[10px] font-black text-white/35">
                        المستخدم
                      </th>

                      <th className="px-5 py-4 text-[10px] font-black text-white/35">
                        الهاتف
                      </th>

                      <th className="px-5 py-4 text-[10px] font-black text-white/35">
                        المبلغ
                      </th>

                      <th className="px-5 py-4 text-[10px] font-black text-white/35">
                        طريقة الدفع
                      </th>

                      <th className="px-5 py-4 text-[10px] font-black text-white/35">
                        الحالة
                      </th>

                      <th className="px-5 py-4 text-[10px] font-black text-white/35">
                        التاريخ
                      </th>

                      <th className="px-5 py-4 text-[10px] font-black text-white/35">
                        الإجراء
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.06]">
                    {requests.map(
                      (request) => (
                        <tr
                          key={
                            request.id
                          }
                          className="transition hover:bg-white/[0.02]"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
                                <Users
                                  size={15}
                                />
                              </div>

                              <div>
                                <p className="text-xs font-black text-white">
                                  {
                                    request.user_name
                                  }
                                </p>

                                {request.notes && (
                                  <p className="mt-1 max-w-[180px] truncate text-[9px] text-white/25">
                                    {
                                      request.notes
                                    }
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td
                            dir="ltr"
                            className="px-5 py-4 text-right text-[11px] text-white/50"
                          >
                            {
                              request.user_phone
                            }
                          </td>

                          <td className="px-5 py-4">
                            <span className="text-sm font-black text-[#d6a84f]">
                              {Number(
                                request.amount
                              ).toFixed(
                                2
                              )}{" "}
                              د.أ
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-[11px] font-bold text-white/55">
                              <span className="text-[#d6a84f]">
                                {paymentMethodIcon(
                                  request.payment_method
                                )}
                              </span>

                              {paymentMethodLabel(
                                request.payment_method
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={
                                request.status
                              }
                              label={statusLabel(
                                request.status
                              )}
                            />
                          </td>

                          <td className="px-5 py-4">
                            <span className="text-[10px] text-white/30">
                              {formatDate(
                                request.created_at
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            {request.status ===
                            "pending" ? (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={
                                    processingId ===
                                    request.id
                                  }
                                  onClick={() =>
                                    handleAction(
                                      request.id,
                                      "approve"
                                    )
                                  }
                                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-[10px] font-black text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
                                >
                                  <Check
                                    size={13}
                                  />

                                  {processingId ===
                                  request.id
                                    ? "..."
                                    : "موافقة"}
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    processingId ===
                                    request.id
                                  }
                                  onClick={() =>
                                    handleAction(
                                      request.id,
                                      "reject"
                                    )
                                  }
                                  className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-[10px] font-black text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                                >
                                  <XCircle
                                    size={13}
                                  />

                                  رفض
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-white/25">
                                تم التعامل
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* APPROVED TOTAL */}

        {approvedAmount > 0 && (
          <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-white/25">
            <CheckCircle2
              size={12}
              className="text-emerald-500/50"
            />

            إجمالي الطلبات المقبولة:{" "}
            <span className="font-black text-emerald-400/70">
              {approvedAmount.toFixed(2)} د.أ
            </span>
          </div>
        )}

        {/* FOOTER */}

        <div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-white/20">
          <Wallet size={11} />

          <span>
            أهل القمة • إدارة طلبات الشحن
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

function StatCard({
  icon,
  label,
  value,
  danger = false,
  success = false,
  gold = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  danger?: boolean;
  success?: boolean;
  gold?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-3 shadow-xl shadow-black/10 sm:p-4">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          danger
            ? "bg-red-500/10 text-red-400"
            : success
            ? "bg-emerald-500/10 text-emerald-400"
            : gold
            ? "bg-[#d6a84f]/10 text-[#d6a84f]"
            : "bg-white/5 text-white/50"
        }`}
      >
        {icon}
      </div>

      <p className="mt-3 text-[10px] font-bold text-white/35">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-black ${
          danger
            ? "text-red-400"
            : success
            ? "text-emerald-400"
            : gold
            ? "text-[#d6a84f]"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const pending =
    status === "pending";

  const approved =
    status === "approved";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black ${
        pending
          ? "bg-[#d6a84f]/10 text-[#d6a84f]"
          : approved
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-red-500/10 text-red-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          pending
            ? "bg-[#d6a84f]"
            : approved
            ? "bg-emerald-400"
            : "bg-red-400"
        }`}
      />

      {label}
    </span>
  );
}