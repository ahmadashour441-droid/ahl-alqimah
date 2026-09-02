"use client";

import { useEffect, useState } from "react";
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
  RefreshCw,
  Pencil,
  Trash2,
  UserRound,
  Phone,
  Search,
  CircleCheck,
  CircleX,
  AlertCircle,
  Plus,
  Car,
  Package,
  UserCheck,
  Calculator,
  FileText,
  ChevronLeft,
  Clock,
  Ban,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type User = {
  id: string;
  full_name: string;
  phone: string;
  balance: number;
  is_active: boolean;
  role: string;
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
  created_by: string;
  created_at: string;
  updated_at: string;
  financially_processed: boolean;
  producer?: User | null;
  consumer?: User | null;
};

export default function AdminOrdersPage() {
    const thClass =
  "px-4 py-3 text-right text-xs font-bold text-white/50 whitespace-nowrap";
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [orderType, setOrderType] =
    useState<"passenger" | "order">("passenger");

  const [amount, setAmount] = useState("");
  const [producerId, setProducerId] = useState("");
  const [consumerId, setConsumerId] = useState("");
  const [notes, setNotes] = useState("");

  const [producerSearch, setProducerSearch] = useState("");
  const [consumerSearch, setConsumerSearch] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [editingOrder, setEditingOrder] =
    useState<Order | null>(null);

  const [editOrderType, setEditOrderType] =
    useState<"passenger" | "order">("passenger");

  const [editAmount, setEditAmount] = useState("");
  const [editProducerId, setEditProducerId] =
    useState("");
  const [editConsumerId, setEditConsumerId] =
    useState("");
  const [editNotes, setEditNotes] = useState("");

  const [editProducerSearch, setEditProducerSearch] =
    useState("");

  const [editConsumerSearch, setEditConsumerSearch] =
    useState("");

  const [menuOpen, setMenuOpen] = useState(false);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadUsers() {
    try {
      setLoadingUsers(true);

      const token = await getToken();

      if (!token) {
        setError(
          "انتهت جلسة الدخول، يرجى تسجيل الدخول مرة أخرى."
        );
        return;
      }

      const response = await fetch(
        "/api/admin/users/create",
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
        console.error(
          "USERS API ERROR:",
          result
        );

        setError(
          result.error ||
            "تعذر تحميل المستخدمين."
        );

        return;
      }

      setUsers(
        Array.isArray(result.users)
          ? result.users
          : []
      );
    } catch (err) {
      console.error(
        "LOAD USERS ERROR:",
        err
      );

      setError(
        "تعذر تحميل قائمة الكباتن والمنتجين."
      );
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadOrders() {
    try {
      setLoadingOrders(true);

      const token = await getToken();

      if (!token) {
        setError(
          "انتهت جلسة الدخول، يرجى تسجيل الدخول مرة أخرى."
        );
        return;
      }

      const response = await fetch(
        "/api/admin/orders",
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

      setOrders(
        Array.isArray(result.orders)
          ? result.orders
          : []
      );
    } catch (err) {
      console.error(
        "LOAD ORDERS ERROR:",
        err
      );

      setError(
        "تعذر تحميل الطلبات."
      );
    } finally {
      setLoadingOrders(false);
    }
  }

  async function loadData() {
    setError("");

    await Promise.all([
      loadUsers(),
      loadOrders(),
    ]);
  }

  useEffect(() => {
    loadData();
  }, []);

  /* =====================================================
     إنشاء طلب
  ===================================================== */

  async function createOrder() {
    try {
      setCreating(true);
      setMessage("");
      setError("");

      if (!producerId) {
        setError("يجب اختيار المنتج.");
        return;
      }

      if (!consumerId) {
        setError("يجب اختيار الكابتن.");
        return;
      }

      if (producerId === consumerId) {
        setError(
          "لا يمكن أن يكون المنتج هو نفسه الكابتن."
        );
        return;
      }

      const numericAmount = Number(amount);

      if (
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0
      ) {
        setError(
          "أدخل قيمة صحيحة للطلب."
        );
        return;
      }

      const producer = users.find(
        (user) => user.id === producerId
      );

      const consumer = users.find(
        (user) => user.id === consumerId
      );

      if (!producer) {
        setError(
          "المنتج المختار غير موجود."
        );
        return;
      }

      if (!producer.is_active) {
        setError(
          "المنتج المختار غير نشط."
        );
        return;
      }

      if (!consumer) {
        setError(
          "الكابتن المختار غير موجود."
        );
        return;
      }

      if (!consumer.is_active) {
        setError(
          "الكابتن المختار غير نشط."
        );
        return;
      }

      const token = await getToken();

      if (!token) {
        setError(
          "انتهت جلسة الدخول."
        );
        return;
      }

      const response = await fetch(
        "/api/admin/orders",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            orderType,
            amount: numericAmount,
            producerId,
            consumerId,
            notes:
              notes.trim() || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "تعذر إنشاء الطلب."
        );
        return;
      }

      setMessage(
        result.message ||
          "تم إنشاء الطلب بنجاح."
      );

      setAmount("");
      setProducerId("");
      setConsumerId("");
      setNotes("");
      setProducerSearch("");
      setConsumerSearch("");
      setOrderType("passenger");

      await loadOrders();
    } catch (err) {
      console.error(
        "CREATE ORDER ERROR:",
        err
      );

      setError(
        "حدث خطأ أثناء إنشاء الطلب."
      );
    } finally {
      setCreating(false);
    }
  }

  /* =====================================================
     فتح نافذة التعديل
  ===================================================== */

  function openEditModal(order: Order) {
    setError("");
    setMessage("");

    setEditingOrder(order);

    setEditOrderType(
      order.order_type
    );

    setEditAmount(
      String(order.amount)
    );

    setEditProducerId(
      order.producer_id
    );

    setEditConsumerId(
      order.consumer_id || ""
    );

    setEditNotes(
      order.notes || ""
    );

    const producer = users.find(
      (user) =>
        user.id === order.producer_id
    );

    const consumer = users.find(
      (user) =>
        user.id === order.consumer_id
    );

    setEditProducerSearch(
      producer
        ? `${producer.full_name || "بدون اسم"} — ${producer.phone}`
        : ""
    );

    setEditConsumerSearch(
      consumer
        ? `${consumer.full_name || "بدون اسم"} — ${consumer.phone}`
        : ""
    );
  }

  /* =====================================================
     إغلاق نافذة التعديل
  ===================================================== */

  function closeEditModal() {
    if (updating) {
      return;
    }

    setEditingOrder(null);
    setEditOrderType("passenger");
    setEditAmount("");
    setEditProducerId("");
    setEditConsumerId("");
    setEditNotes("");
    setEditProducerSearch("");
    setEditConsumerSearch("");
  }

  /* =====================================================
     تعديل الطلب
  ===================================================== */

  async function updateOrder() {
    if (!editingOrder) {
      return;
    }

    try {
      setUpdating(true);
      setError("");
      setMessage("");

      if (!editProducerId) {
        setError(
          "يجب اختيار المنتج."
        );
        return;
      }

      if (!editConsumerId) {
        setError(
          "يجب اختيار الكابتن."
        );
        return;
      }

      if (
        editProducerId ===
        editConsumerId
      ) {
        setError(
          "لا يمكن أن يكون المنتج هو نفسه الكابتن."
        );
        return;
      }

      const numericAmount =
        Number(editAmount);

      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {
        setError(
          "أدخل قيمة صحيحة للطلب."
        );
        return;
      }

      const producer =
        users.find(
          (user) =>
            user.id ===
            editProducerId
        );

      const consumer =
        users.find(
          (user) =>
            user.id ===
            editConsumerId
        );

      if (!producer) {
        setError(
          "المنتج المختار غير موجود."
        );
        return;
      }

      if (!producer.is_active) {
        setError(
          "المنتج المختار غير نشط."
        );
        return;
      }

      if (!consumer) {
        setError(
          "الكابتن المختار غير موجود."
        );
        return;
      }

      if (!consumer.is_active) {
        setError(
          "الكابتن المختار غير نشط."
        );
        return;
      }

      const token =
        await getToken();

      if (!token) {
        setError(
          "انتهت جلسة الدخول."
        );
        return;
      }

      const response =
        await fetch(
          "/api/admin/orders",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
            body: JSON.stringify({
              orderId:
                editingOrder.id,
              orderType:
                editOrderType,
              amount:
                numericAmount,
              producerId:
                editProducerId,
              consumerId:
                editConsumerId,
              notes:
                editNotes.trim() ||
                null,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "تعذر تعديل الطلب."
        );
        return;
      }

      setMessage(
        result.message ||
          "تم تعديل الطلب بنجاح."
      );

      closeEditModal();

      await loadOrders();
    } catch (err) {
      console.error(
        "UPDATE ORDER ERROR:",
        err
      );

      setError(
        "حدث خطأ أثناء تعديل الطلب."
      );
    } finally {
      setUpdating(false);
    }
  }

  /* =====================================================
     إلغاء الطلب
  ===================================================== */

  async function cancelOrder(
    order: Order
  ) {
    const confirmed =
      window.confirm(
        `هل أنت متأكد من إلغاء الطلب #${order.order_number}؟\n\nسيتم عكس العمولة والحسابات المالية الخاصة بالطلب.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setMessage("");

      const token =
        await getToken();

      if (!token) {
        setError(
          "انتهت جلسة الدخول."
        );
        return;
      }

      const response =
        await fetch(
          "/api/admin/orders",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
            body: JSON.stringify({
              orderId:
                order.id,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "تعذر إلغاء الطلب."
        );
        return;
      }

      setMessage(
        result.message ||
          "تم إلغاء الطلب."
      );

      await loadOrders();
    } catch (err) {
      console.error(
        "CANCEL ORDER ERROR:",
        err
      );

      setError(
        "حدث خطأ أثناء إلغاء الطلب."
      );
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

  function getOrderType(
    type: string
  ) {
    if (
      type ===
      "passenger"
    ) {
      return "راكب";
    }

    if (
      type === "order"
    ) {
      return "أوردر";
    }

    return type;
  }

  const activeUsers =
    users.filter(
      (user) =>
        user.is_active
    );

  const publishedCount =
    orders.filter(
      (order) =>
        order.status ===
        "published"
    ).length;

  const assignedCount =
    orders.filter(
      (order) =>
        order.status ===
        "assigned"
    ).length;

  const cancelledCount =
    orders.filter(
      (order) =>
        order.status ===
        "cancelled"
    ).length;

  const passengerCount =
    orders.filter(
      (order) =>
        order.order_type ===
        "passenger"
    ).length;

  const orderCount =
    orders.filter(
      (order) =>
        order.order_type ===
        "order"
    ).length;

  const commissionRate =
    orderType ===
    "passenger"
      ? 15
      : 20;

  const commissionPreview =
    Number(amount) > 0
      ? (
          Number(amount) *
          commissionRate /
          100
        ).toFixed(2)
      : "0.00";

  const editCommissionRate =
    editOrderType ===
    "passenger"
      ? 15
      : 20;

  const editCommissionPreview =
    Number(editAmount) > 0
      ? (
          Number(editAmount) *
          editCommissionRate /
          100
        ).toFixed(2)
      : "0.00";

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#0b0d10] text-white"
    >
      {/* =====================================================
          OVERLAY
      ===================================================== */}

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() =>
            setMenuOpen(false)
          }
        />
      )}

      {/* =====================================================
          SIDE MENU
      ===================================================== */}

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
              onClick={() =>
                goTo("/admin")
              }
            />

            <MenuItem
              icon={
                <Users
                  size={18}
                  strokeWidth={1.8}
                />
              }
              title="المستخدمون"
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
              active
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

      {/* =====================================================
          MAIN
      ===================================================== */}

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
              إدارة الطلبات
            </p>

          </div>

          <button
            onClick={loadData}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#12151a] text-white/60 transition hover:border-[#d6a84f]/30 hover:text-[#d6a84f]"
          >
            <RefreshCw
              size={18}
              strokeWidth={1.8}
            />
          </button>

        </header>

        {/* MESSAGES */}

        {message && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-emerald-300">

            <CircleCheck
              size={19}
              className="mt-0.5 shrink-0"
              strokeWidth={1.8}
            />

            <p className="text-sm font-medium">
              {message}
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
              <ClipboardList
                size={21}
                strokeWidth={1.7}
              />
            </div>

            <div className="min-w-0">

              <p className="text-[11px] text-white/35">
                إدارة العمليات
              </p>

              <h2 className="mt-1 text-lg font-bold">
                الطلبات
              </h2>

              <p className="mt-1 text-[10px] text-white/30">
                إنشاء ومتابعة وإدارة الطلبات والحسابات المرتبطة بها
              </p>

            </div>

          </div>

        </section>

        {/* STATS */}

        <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">

          <StatCard
            icon={
              <ClipboardList
                size={18}
                strokeWidth={1.8}
              />
            }
            title="الإجمالي"
            value={orders.length}
          />

          <StatCard
            icon={
              <Clock
                size={18}
                strokeWidth={1.8}
              />
            }
            title="منشورة"
            value={publishedCount}
          />

          <StatCard
            icon={
              <UserCheck
                size={18}
                strokeWidth={1.8}
              />
            }
            title="تم أخذها"
            value={assignedCount}
          />

          <StatCard
            icon={
              <Ban
                size={18}
                strokeWidth={1.8}
              />
            }
            title="ملغاة"
            value={cancelledCount}
          />

          <StatCard
            icon={
              <Car
                size={18}
                strokeWidth={1.8}
              />
            }
            title="راكب"
            value={passengerCount}
          />

          <StatCard
            icon={
              <Package
                size={18}
                strokeWidth={1.8}
              />
            }
            title="أوردر"
            value={orderCount}
          />

        </section>

        {/* CREATE ORDER */}

        <section className="mb-5 rounded-[26px] border border-white/10 bg-[#12151a] p-5">

          <div className="mb-5 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
              <Plus
                size={19}
                strokeWidth={1.9}
              />
            </div>

            <div>

              <h2 className="text-sm font-bold">
                إنشاء طلب جديد
              </h2>

              <p className="mt-1 text-[10px] text-white/30">
                إضافة طلب وتحديد المنتج والكابتن
              </p>

            </div>

          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

            {/* TYPE */}

            <DarkSelect
              label="نوع الطلب"
              value={orderType}
              onChange={(value) =>
                setOrderType(
                  value as
                    | "passenger"
                    | "order"
                )
              }
              icon={
                orderType === "passenger" ? (
                  <Car
                    size={16}
                    strokeWidth={1.8}
                  />
                ) : (
                  <Package
                    size={16}
                    strokeWidth={1.8}
                  />
                )
              }
              options={[
                {
                  value: "passenger",
                  label: "راكب — 15%",
                },
                {
                  value: "order",
                  label: "أوردر — 20%",
                },
              ]}
            />

            {/* AMOUNT */}

            <DarkInput
              label="قيمة الطلب"
              value={amount}
              onChange={setAmount}
              placeholder="مثال: 15"
              type="number"
              icon={
                <Wallet
                  size={16}
                  strokeWidth={1.8}
                />
              }
              dir="ltr"
            />

            {/* PRODUCER */}

            <SearchUserSelect
              label="المنتج"
              placeholder="ابحث بالاسم أو الهاتف..."
              users={users}
              value={producerId}
              search={producerSearch}
              setSearch={setProducerSearch}
              onChange={setProducerId}
              disabled={
                loadingUsers ||
                creating
              }
              excludeId={consumerId}
            />

            {/* CONSUMER */}

            <SearchUserSelect
              label="الكابتن الذي سيأخذ الطلب"
              placeholder="ابحث بالاسم أو الهاتف..."
              users={users}
              value={consumerId}
              search={consumerSearch}
              setSearch={setConsumerSearch}
              onChange={setConsumerId}
              disabled={
                loadingUsers ||
                creating
              }
              excludeId={producerId}
            />

          </div>

          {/* COMMISSION */}

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

            <div className="rounded-2xl border border-[#d6a84f]/15 bg-[#d6a84f]/5 p-4">

              <div className="flex items-center gap-2 text-[#d6a84f]">

                <Calculator
                  size={16}
                  strokeWidth={1.8}
                />

                <span className="text-[11px] font-semibold">
                  العمولة
                </span>

              </div>

              <div className="mt-2 flex items-end gap-2">

                <p className="text-2xl font-black text-white">
                  {commissionPreview}
                </p>

                <span className="mb-1 text-[11px] text-white/35">
                  د.أ
                </span>

              </div>

              <p className="mt-1 text-[10px] text-white/30">
                نسبة العمولة: {commissionRate}%
              </p>

            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">

              <div className="flex items-center gap-2 text-white/45">

                <Users
                  size={16}
                  strokeWidth={1.8}
                />

                <span className="text-[11px] font-semibold">
                  المستخدمون النشطون
                </span>

              </div>

              <p className="mt-2 text-2xl font-black text-white">
                {activeUsers.length}
              </p>

              <p className="mt-1 text-[10px] text-white/25">
                يمكن اختيارهم كمنتج أو كابتن
              </p>

            </div>

          </div>

          {/* NOTES */}

          <div className="mt-4">

            <DarkTextarea
              label="ملاحظات"
              value={notes}
              onChange={setNotes}
              placeholder="ملاحظات اختيارية..."
              icon={
                <FileText
                  size={16}
                  strokeWidth={1.8}
                />
              }
            />

          </div>

          <div className="mt-4 flex justify-end">

            <button
              onClick={createOrder}
              disabled={
                creating ||
                loadingUsers
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#d6a84f] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#e2b860] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >

              <Plus
                size={17}
                strokeWidth={2}
              />

              {creating
                ? "جاري إنشاء الطلب..."
                : "إنشاء الطلب"}

            </button>

          </div>

        </section>

        {/* ORDERS */}

        <section className="overflow-hidden rounded-[26px] border border-white/10 bg-[#12151a]">

          <div className="border-b border-white/10 p-5">

            <div className="flex items-center justify-between gap-3">

              <div>

                <h2 className="text-sm font-bold">
                  جميع الطلبات
                </h2>

                <p className="mt-1 text-[10px] text-white/30">
                  {orders.length} طلب مسجل
                </p>

              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">

                <ClipboardList
                  size={17}
                  strokeWidth={1.8}
                />

              </div>

            </div>

          </div>

          {loadingOrders ? (
            <div className="flex min-h-[260px] items-center justify-center">

              <div className="text-center">

                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#d6a84f]" />

                <p className="text-sm text-white/35">
                  جاري تحميل الطلبات...
                </p>

              </div>

            </div>
          ) : orders.length === 0 ? (
            <div className="p-14 text-center">

              <ClipboardList
                size={32}
                className="mx-auto mb-4 text-white/10"
                strokeWidth={1.4}
              />

              <p className="text-sm text-white/30">
                لا توجد طلبات حتى الآن
              </p>

            </div>
          ) : (
            <>
              {/* MOBILE */}

              <div className="block p-3 lg:hidden">

                {orders.map(
                  (order) => (
                    <MobileOrderCard
                      key={order.id}
                      order={order}
                      onEdit={() =>
                        openEditModal(
                          order
                        )
                      }
                      onCancel={() =>
                        cancelOrder(
                          order
                        )
                      }
                    />
                  )
                )}

              </div>

              {/* DESKTOP */}

              <div className="hidden overflow-x-auto lg:block">

                <table className="w-full text-sm">

                  <thead className="border-b border-white/10 bg-[#0f1216]">

                    <tr>

                      <th className={thClass}>
                        الطلب
                      </th>

                      <th className={thClass}>
                        النوع
                      </th>

                      <th className={thClass}>
                        القيمة
                      </th>

                      <th className={thClass}>
                        العمولة
                      </th>

                      <th className={thClass}>
                        المنتج
                      </th>

                      <th className={thClass}>
                        الكابتن
                      </th>

                      <th className={thClass}>
                        الحالة
                      </th>

                      <th className={thClass}>
                        التاريخ
                      </th>

                      <th className={thClass}>
                        إجراء
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {orders.map(
                      (order) => (
                        <DesktopOrderRow
                          key={order.id}
                          order={order}
                          onEdit={() =>
                            openEditModal(
                              order
                            )
                          }
                          onCancel={() =>
                            cancelOrder(
                              order
                            )
                          }
                          formatDate={
                            formatDate
                          }
                          getOrderType={
                            getOrderType
                          }
                        />
                      )
                    )}

                  </tbody>

                </table>

              </div>
            </>
          )}

        </section>

      </div>

      {/* =====================================================
          EDIT MODAL
      ===================================================== */}

      {editingOrder && (
        <div
          onClick={closeEditModal}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 p-3 backdrop-blur-sm sm:items-center"
        >

          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#12151a] shadow-2xl"
          >

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#12151a] p-5">

              <div>

                <p className="text-[10px] text-white/30">
                  تعديل بيانات الطلب
                </p>

                <h2 className="mt-1 text-lg font-bold">
                  الطلب #{editingOrder.order_number}
                </h2>

              </div>

              <button
                onClick={
                  closeEditModal
                }
                disabled={updating}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                <X
                  size={18}
                  strokeWidth={1.8}
                />
              </button>

            </div>

            {error && (
              <div className="mx-5 mt-5 flex items-start gap-3 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-red-300">

                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                />

                <p className="text-xs font-medium">
                  {error}
                </p>

              </div>
            )}

            <div className="space-y-4 p-5">

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                <DarkSelect
                  label="نوع الطلب"
                  value={editOrderType}
                  onChange={(value) =>
                    setEditOrderType(
                      value as
                        | "passenger"
                        | "order"
                    )
                  }
                  disabled={updating}
                  icon={
                    editOrderType ===
                    "passenger" ? (
                      <Car
                        size={16}
                        strokeWidth={1.8}
                      />
                    ) : (
                      <Package
                        size={16}
                        strokeWidth={1.8}
                      />
                    )
                  }
                  options={[
                    {
                      value:
                        "passenger",
                      label:
                        "راكب — 15%",
                    },
                    {
                      value:
                        "order",
                      label:
                        "أوردر — 20%",
                    },
                  ]}
                />

                <DarkInput
                  label="قيمة الطلب"
                  value={
                    editAmount
                  }
                  onChange={
                    setEditAmount
                  }
                  placeholder="قيمة الطلب"
                  type="number"
                  dir="ltr"
                  disabled={updating}
                  icon={
                    <Wallet
                      size={16}
                      strokeWidth={1.8}
                    />
                  }
                />

                <SearchUserSelect
                  label="المنتج"
                  placeholder="ابحث بالاسم أو الهاتف..."
                  users={users}
                  value={
                    editProducerId
                  }
                  search={
                    editProducerSearch
                  }
                  setSearch={
                    setEditProducerSearch
                  }
                  onChange={
                    setEditProducerId
                  }
                  disabled={
                    updating
                  }
                  excludeId={
                    editConsumerId
                  }
                />

                <SearchUserSelect
                  label="الكابتن الذي سيأخذ الطلب"
                  placeholder="ابحث بالاسم أو الهاتف..."
                  users={users}
                  value={
                    editConsumerId
                  }
                  search={
                    editConsumerSearch
                  }
                  setSearch={
                    setEditConsumerSearch
                  }
                  onChange={
                    setEditConsumerId
                  }
                  disabled={
                    updating
                  }
                  excludeId={
                    editProducerId
                  }
                />

              </div>

              <div className="rounded-2xl border border-[#d6a84f]/15 bg-[#d6a84f]/5 p-4">

                <div className="flex items-center gap-2 text-[#d6a84f]">

                  <Calculator
                    size={16}
                    strokeWidth={1.8}
                  />

                  <span className="text-[11px] font-semibold">
                    العمولة الجديدة
                  </span>

                </div>

                <div className="mt-2 flex items-end gap-2">

                  <p className="text-2xl font-black">
                    {
                      editCommissionPreview
                    }
                  </p>

                  <span className="mb-1 text-[11px] text-white/30">
                    د.أ
                  </span>

                </div>

                <p className="mt-1 text-[10px] text-white/30">
                  نسبة العمولة:{" "}
                  {editCommissionRate}%
                </p>

              </div>

              <DarkTextarea
                label="ملاحظات"
                value={
                  editNotes
                }
                onChange={
                  setEditNotes
                }
                placeholder="ملاحظات اختيارية..."
                disabled={updating}
                icon={
                  <FileText
                    size={16}
                    strokeWidth={1.8}
                  />
                }
              />

              <div className="rounded-2xl border border-amber-400/10 bg-amber-400/5 p-4">

                <div className="flex items-start gap-3">

                  <AlertCircle
                    size={17}
                    className="mt-0.5 shrink-0 text-[#d6a84f]"
                  />

                  <p className="text-[11px] leading-6 text-white/45">
                    عند حفظ التعديل سيتم عكس العمولة السابقة وتطبيق العمولة الجديدة على المنتج والكابتن المختارين.
                  </p>

                </div>

              </div>

            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-white/10 p-5 sm:flex-row sm:justify-end">

              <button
                onClick={
                  closeEditModal
                }
                disabled={updating}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/55 transition hover:bg-white/5 hover:text-white"
              >
                إلغاء
              </button>

              <button
                onClick={
                  updateOrder
                }
                disabled={
                  updating
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-[#d6a84f] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#e2b860] disabled:opacity-50"
              >

                <Pencil
                  size={16}
                  strokeWidth={1.9}
                />

                {updating
                  ? "جاري الحفظ..."
                  : "حفظ التعديل"}

              </button>

            </div>

          </div>

        </div>
      )}
    </main>
  );
}

/* =========================================================
   SEARCH USER SELECT
========================================================= */

function SearchUserSelect({
  label,
  placeholder,
  users,
  value,
  search,
  setSearch,
  onChange,
  disabled,
  excludeId,
}: {
  label: string;
  placeholder: string;
  users: User[];
  value: string;
  search: string;
  setSearch: (value: string) => void;
  onChange: (value: string) => void;
  disabled?: boolean;
  excludeId?: string;
}) {
  const [open, setOpen] = useState(false);

  const selectedUser =
    users.find(
      (user) =>
        user.id === value
    ) || null;

  const searchText =
    search.trim().toLowerCase();

  const filteredUsers =
    users
      .filter(
        (user) =>
          user.is_active
      )
      .filter(
        (user) =>
          user.id !== excludeId
      )
      .filter((user) => {
        if (!searchText) {
          return true;
        }

        const name =
          (
            user.full_name || ""
          ).toLowerCase();

        const phone =
          (
            user.phone || ""
          ).toLowerCase();

        const id =
          (
            user.id || ""
          ).toLowerCase();

        return (
          name.includes(
            searchText
          ) ||
          phone.includes(
            searchText
          ) ||
          id.includes(
            searchText
          )
        );
      })
      .slice(0, 30);

  function selectUser(
    user: User
  ) {
    onChange(user.id);

    setSearch(
      `${user.full_name || "بدون اسم"} — ${user.phone}`
    );

    setOpen(false);
  }

  function clearSelection() {
    onChange("");
    setSearch("");
    setOpen(true);
  }

  return (
    <div className="relative">

      <label className="mb-2 block text-[11px] font-semibold text-white/50">
        {label}
      </label>

      <div className="relative">

        <Search
          size={15}
          strokeWidth={1.8}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#d6a84f]"
        />

        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(
              e.target.value
            );
            setOpen(true);

            if (
              value &&
              e.target.value !==
                `${selectedUser?.full_name || "بدون اسم"} — ${selectedUser?.phone || ""}`
            ) {
              onChange("");
            }
          }}
          onFocus={() =>
            setOpen(true)
          }
          placeholder={
            placeholder
          }
          disabled={disabled}
          className="w-full rounded-xl border border-white/10 bg-[#0e1115] py-3 pr-10 pl-10 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-[#d6a84f]/40"
        />

        {value && (
          <button
            type="button"
            onClick={
              clearSelection
            }
            disabled={disabled}
            className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-white/5 text-white/35 transition hover:bg-white/10 hover:text-white"
          >
            <X
              size={14}
              strokeWidth={1.8}
            />
          </button>
        )}

      </div>

      {open && !disabled && (
        <div className="absolute right-0 left-0 top-[calc(100%+5px)] z-[80] max-h-[260px] overflow-y-auto rounded-2xl border border-white/10 bg-[#15191e] shadow-2xl">

          {filteredUsers.length ===
          0 ? (
            <div className="p-5 text-center">

              <Search
                size={20}
                className="mx-auto mb-2 text-white/15"
              />

              <p className="text-xs text-white/30">
                لا يوجد مستخدم مطابق
              </p>

            </div>
          ) : (
            filteredUsers.map(
              (user) => (
                <button
                  key={
                    user.id
                  }
                  type="button"
                  onClick={() =>
                    selectUser(
                      user
                    )
                  }
                  className={`flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-right transition last:border-b-0 hover:bg-[#d6a84f]/5 ${
                    user.id ===
                    value
                      ? "bg-[#d6a84f]/5"
                      : ""
                  }`}
                >

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">

                    <UserRound
                      size={16}
                      strokeWidth={1.7}
                    />

                  </div>

                  <div className="min-w-0">

                    <p className="truncate text-xs font-bold text-white">
                      {user.full_name ||
                        "بدون اسم"}
                    </p>

                    <p
                      className="mt-1 text-[10px] text-white/35"
                      dir="ltr"
                    >
                      {user.phone}
                    </p>

                  </div>

                </button>
              )
            )
          )}

        </div>
      )}

      {selectedUser && (
        <div className="mt-1.5 flex items-center gap-1 text-[9px] font-semibold text-emerald-400">

          <CircleCheck
            size={12}
            strokeWidth={1.8}
          />

          تم اختيار:{" "}
          {selectedUser.full_name ||
            "بدون اسم"}

        </div>
      )}

    </div>
  );
}

/* =========================================================
   MOBILE ORDER CARD
========================================================= */

function MobileOrderCard({
  order,
  onEdit,
  onCancel,
}: {
  order: Order;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const status =
    getStatusData(
      order.status
    );

  return (
    <div className="mb-3 rounded-2xl border border-white/7 bg-[#0f1216] p-4">

      <div className="flex items-start justify-between gap-3">

        <div>

          <div className="flex items-center gap-2">

            <span className="text-base font-black text-[#d6a84f]">
              #{order.order_number}
            </span>

            <OrderTypeBadge
              type={
                order.order_type
              }
            />

          </div>

          <p className="mt-1 text-[9px] text-white/25">
            {formatDateSimple(
              order.created_at
            )}
          </p>

        </div>

        <StatusBadge
          status={order.status}
        />

      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">

        <InfoBox
          title="القيمة"
          value={`${Number(
            order.amount || 0
          ).toFixed(2)} د.أ`}
          valueClass="text-white"
        />

        <InfoBox
          title="العمولة"
          value={`${Number(
            order.commission_amount ||
              0
          ).toFixed(2)} د.أ`}
          valueClass="text-[#d6a84f]"
        />

        <InfoBox
          title="المنتج"
          value={
            order.producer
              ?.full_name ||
            "—"
          }
        />

        <InfoBox
          title="الكابتن"
          value={
            order.consumer
              ?.full_name ||
            "—"
          }
        />

      </div>

      {order.notes && (
        <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">

          <p className="text-[9px] text-white/25">
            ملاحظات
          </p>

          <p className="mt-1 text-[11px] leading-5 text-white/50">
            {order.notes}
          </p>

        </div>
      )}

      {order.status !==
        "cancelled" && (
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
            onClick={onCancel}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500/5 py-2.5 text-xs font-bold text-red-400"
          >

            <Trash2
              size={14}
              strokeWidth={1.8}
            />

            إلغاء

          </button>

        </div>
      )}

    </div>
  );
}

/* =========================================================
   DESKTOP ORDER ROW
========================================================= */

function DesktopOrderRow({
  order,
  onEdit,
  onCancel,
  formatDate,
  getOrderType,
}: {
  order: Order;
  onEdit: () => void;
  onCancel: () => void;
  formatDate: (
    date: string
  ) => string;
  getOrderType: (
    type: string
  ) => string;
}) {
  return (
    <tr className="border-b border-white/5 transition hover:bg-white/[0.02]">

      <td className="px-4 py-4">

        <span className="font-black text-[#d6a84f]">
          #{order.order_number}
        </span>

      </td>

      <td className="px-4 py-4">

        <OrderTypeBadge
          type={
            order.order_type
          }
        />

      </td>

      <td className="px-4 py-4">

        <span className="font-bold text-white">
          {Number(
            order.amount || 0
          ).toFixed(2)}
        </span>

        <span className="mr-1 text-[10px] text-white/30">
          د.أ
        </span>

      </td>

      <td className="px-4 py-4">

        <span className="font-bold text-[#d6a84f]">
          {Number(
            order.commission_amount ||
              0
          ).toFixed(2)}
        </span>

        <span className="mr-1 text-[9px] text-white/25">
          ({order.commission_rate}%)
        </span>

      </td>

      <td className="px-4 py-4">

        <div className="max-w-[150px]">

          <p className="truncate text-xs font-bold text-white">
            {order.producer
              ?.full_name ||
              "—"}
          </p>

          <p
            className="mt-1 text-[9px] text-white/30"
            dir="ltr"
          >
            {order.producer
              ?.phone ||
              ""}
          </p>

        </div>

      </td>

      <td className="px-4 py-4">

        <div className="max-w-[150px]">

          <p className="truncate text-xs font-bold text-white">
            {order.consumer
              ?.full_name ||
              "—"}
          </p>

          <p
            className="mt-1 text-[9px] text-white/30"
            dir="ltr"
          >
            {order.consumer
              ?.phone ||
              ""}
          </p>

        </div>

      </td>

      <td className="px-4 py-4">

        <StatusBadge
          status={
            order.status
          }
        />

      </td>

      <td className="px-4 py-4 text-[10px] text-white/30">
        {formatDate(
          order.created_at
        )}
      </td>

      <td className="px-4 py-4">

        {order.status !==
          "cancelled" && (
          <div className="flex items-center gap-2">

            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-xl bg-[#d6a84f]/10 px-3 py-2 text-[10px] font-bold text-[#d6a84f] transition hover:bg-[#d6a84f]/15"
            >

              <Pencil
                size={13}
                strokeWidth={1.8}
              />

              تعديل

            </button>

            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 rounded-xl bg-red-500/5 px-3 py-2 text-[10px] font-bold text-red-400 transition hover:bg-red-500/10"
            >

              <Trash2
                size={13}
                strokeWidth={1.8}
              />

              إلغاء

            </button>

          </div>
        )}

      </td>

    </tr>
  );
}

/* =========================================================
   ORDER TYPE BADGE
========================================================= */

function OrderTypeBadge({
  type,
}: {
  type: string;
}) {
  const passenger =
    type ===
    "passenger";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[9px] font-bold ${
        passenger
          ? "bg-sky-400/10 text-sky-300"
          : "bg-purple-400/10 text-purple-300"
      }`}
    >

      {passenger ? (
        <Car
          size={11}
          strokeWidth={1.8}
        />
      ) : (
        <Package
          size={11}
          strokeWidth={1.8}
        />
      )}

      {passenger
        ? "راكب"
        : "أوردر"}

    </span>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const data =
    getStatusData(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[9px] font-bold ${data.className}`}
    >

      {status ===
      "cancelled" ? (
        <CircleX
          size={11}
          strokeWidth={1.8}
        />
      ) : status ===
        "assigned" ? (
        <CircleCheck
          size={11}
          strokeWidth={1.8}
        />
      ) : (
        <Clock
          size={11}
          strokeWidth={1.8}
        />
      )}

      {data.text}

    </span>
  );
}

function getStatusData(
  status: string
) {
  if (
    status ===
    "published"
  ) {
    return {
      text: "منشور",
      className:
        "bg-sky-400/10 text-sky-300",
    };
  }

  if (
    status ===
    "assigned"
  ) {
    return {
      text: "تم أخذه",
      className:
        "bg-emerald-400/10 text-emerald-300",
    };
  }

  if (
    status ===
    "cancelled"
  ) {
    return {
      text: "ملغي",
      className:
        "bg-red-400/10 text-red-300",
    };
  }

  return {
    text: status,
    className:
      "bg-white/5 text-white/45",
  };
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#12151a] p-4">

      <div className="flex items-center justify-between">

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
          {icon}
        </div>

        <span className="text-[9px] text-white/25">
          إحصائية
        </span>

      </div>

      <p className="mt-3 text-[10px] text-white/30">
        {title}
      </p>

      <p className="mt-1 text-xl font-black text-white">
        {value}
      </p>

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
}: {
  title: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">

      <p className="text-[9px] text-white/25">
        {title}
      </p>

      <p
        className={`mt-1 truncate text-[11px] font-semibold ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   DARK INPUT
========================================================= */

function DarkInput({
  label,
  value,
  onChange,
  placeholder,
  icon,
  type = "text",
  dir,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder: string;
  icon: React.ReactNode;
  type?: string;
  dir?: "ltr" | "rtl";
  disabled?: boolean;
}) {
  return (
    <div>

      <label className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-white/50">
        <span className="text-[#d6a84f]">
          {icon}
        </span>
        {label}
      </label>

      <input
        type={type}
        min={
          type === "number"
            ? "0"
            : undefined
        }
        step={
          type === "number"
            ? "0.01"
            : undefined
        }
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        placeholder={placeholder}
        dir={dir}
        disabled={disabled}
        className="w-full rounded-xl border border-white/10 bg-[#0e1115] px-3 py-3 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-[#d6a84f]/40 disabled:opacity-50"
      />

    </div>
  );
}

/* =========================================================
   DARK SELECT
========================================================= */

function DarkSelect({
  label,
  value,
  onChange,
  options,
  icon,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  options: {
    value: string;
    label: string;
  }[];
  icon: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div>

      <label className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-white/50">

        <span className="text-[#d6a84f]">
          {icon}
        </span>

        {label}

      </label>

      <select
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        disabled={disabled}
        className="w-full appearance-none rounded-xl border border-white/10 bg-[#0e1115] px-3 py-3 text-sm text-white outline-none transition focus:border-[#d6a84f]/40 disabled:opacity-50"
      >

        {options.map(
          (option) => (
            <option
              key={
                option.value
              }
              value={
                option.value
              }
              className="bg-[#12151a] text-white"
            >
              {option.label}
            </option>
          )
        )}

      </select>

    </div>
  );
}

/* =========================================================
   DARK TEXTAREA
========================================================= */

function DarkTextarea({
  label,
  value,
  onChange,
  placeholder,
  icon,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder: string;
  icon: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div>

      <label className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-white/50">

        <span className="text-[#d6a84f]">
          {icon}
        </span>

        {label}

      </label>

      <textarea
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        placeholder={placeholder}
        rows={3}
        disabled={disabled}
        className="w-full resize-y rounded-xl border border-white/10 bg-[#0e1115] px-3 py-3 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-[#d6a84f]/40 disabled:opacity-50"
      />

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

function formatDateSimple(
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

function goTo(
  path: string
) {
  window.location.href =
    path;
}

async function logout() {
  const supabase =
    createClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

  await supabase.auth.signOut();

  localStorage.removeItem(
    "access_token"
  );

  localStorage.removeItem(
    "user"
  );

  localStorage.removeItem(
    "admin"
  );

  window.location.href =
    "/";
}