"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Settings,
  UserRound,
  Wallet,
  X,
  ArrowDownToLine,
  Activity,
  Plus,
  Clock3,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type User = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  balance: number;
  is_active: boolean;
};

type WeeklyStatementOrder = {
  id: string;
  order_number?: number;
  order_type?: string;
  amount: number;
  commission_amount: number;
  producer_name?: string | null;
  consumer_name?: string | null;
  counterparty_name?: string | null;
  notes?: string | null;
  created_at?: string;
};

type WeeklyStatement = {
  week: {
    id: string;
    start_at: string;
    end_at: string;
    is_closed: boolean;
    closed_at?: string | null;
  };
  production: WeeklyStatementOrder[];
  consumption: WeeklyStatementOrder[];
  productionCommission: number;
  consumptionCommission: number;
  floor: number;
  net: number;
};

type Order = {
  id: string;
  order_number?: number;
  order_type?: string;
  amount?: number;
  commission_amount?: number;
  status?: string;
  created_at?: string;
  relation?: "منتج" | "مستهلك";
  counterparty?: string | null;
};

type Data = {
  user?: User;

  stats?: {
    balance?: number;
    currentBalance?: number;
    totalBalance?: number;
    producedTotal?: number;
    consumedTotal?: number;
    producedCount?: number;
    consumedCount?: number;
    totalOrders?: number;
  };

  statistics?: {
    producedTotal?: number;
    consumedTotal?: number;
    producedCount?: number;
    consumedCount?: number;
    totalOperations?: number;
  };

  activity?: {
    floor_charged?: boolean;
    produced_total?: number;
    consumed_total?: number;
    produced_count?: number;
    consumed_count?: number;
  };

  currentWeek?: {
    id: string;
    start_at: string;
    end_at: string;
    is_closed: boolean;
  } | null;

  previousWeekStatement?: WeeklyStatement | null;

  recentOrders?: Order[];
};

function money(v: number) {
  return `${Number(v || 0).toFixed(2)} JD`;
}

function initials(n: string | null | undefined) {
  if (!n) return "ك";

  return n
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join("");
}

function date(v: string | undefined) {
  if (!v) return "-";

  try {
    return new Date(v).toLocaleDateString("ar-JO", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "-";
  }
}

function statementDate(v: string | undefined) {
  if (!v) return "-";

  try {
    return new Date(v).toLocaleDateString("ar-JO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "-";
  }
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function statementType(value?: string) {
  if (!value) return "طلب";

  if (
    value === "passenger" ||
    value === "ride" ||
    value === "trip"
  ) {
    return "توصيلة";
  }

  return value;
}

export default function DashboardPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        location.replace("/");
        return;
      }

      const meR = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const me = await meR.json().catch(() => null);

      if (!meR.ok || !me?.user) {
        location.replace("/");
        return;
      }

      if (me.user.role === "admin") {
        location.replace("/admin");
        return;
      }

      const r = await fetch("/api/dashboard", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const j = await r.json();

      if (!r.ok || !j.success) {
        throw new Error(j.message || "فشل تحميل الحساب");
      }

      setData(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  function openWeeklyStatement() {
    const statement = data?.previousWeekStatement;

    if (!statement) {
      alert("لا يوجد كشف للأسبوع السابق حاليًا.");
      return;
    }

    const u = data?.user;

    const productionRows = statement.production.length
      ? statement.production
          .map(
            (order) => `
              <tr>
                <td>${escapeHtml(
                  order.producer_name || u?.full_name || "-"
                )}</td>
                <td>${escapeHtml(money(order.amount))}</td>
                <td>${escapeHtml(
                  statementDate(order.created_at)
                )}</td>
                <td>${escapeHtml(
                  order.notes || statementType(order.order_type)
                )}</td>
              </tr>
            `
          )
          .join("")
      : `
          <tr>
            <td colspan="4" class="empty">
              لا توجد عمليات إنتاج
            </td>
          </tr>
        `;

    const consumptionRows = statement.consumption.length
      ? statement.consumption
          .map(
            (order) => `
              <tr>
                <td>${escapeHtml(
                  order.consumer_name || u?.full_name || "-"
                )}</td>
                <td>${escapeHtml(money(order.amount))}</td>
                <td>${escapeHtml(
                  statementDate(order.created_at)
                )}</td>
                <td>${escapeHtml(
                  order.notes || statementType(order.order_type)
                )}</td>
              </tr>
            `
          )
          .join("")
      : `
          <tr>
            <td colspan="4" class="empty">
              لا توجد عمليات استهلاك
            </td>
          </tr>
        `;

    const win = window.open("", "_blank");

    if (!win) {
      alert(
        "يرجى السماح بالنوافذ المنبثقة للموقع حتى تتمكن من فتح الكشف."
      );
      return;
    }

    win.document.open();

    win.document.write(`
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
/>

<title>كشف حساب - أهل القمة</title>

<style>
@page {
  size: A4 landscape;
  margin: 12mm;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Tahoma, Arial, sans-serif;
  color: #262626;
  background: #fff;
  direction: rtl;
}

.page {
  max-width: 1120px;
  margin: 0 auto;
}

.header {
  border-bottom: 3px solid #8a0025;
  padding-bottom: 14px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.brand {
  color: #8a0025;
  font-size: 28px;
  font-weight: 900;
}

.subtitle {
  color: #777;
  font-size: 13px;
  margin-top: 5px;
}

.user {
  text-align: left;
  font-size: 14px;
  line-height: 1.8;
}

.user b {
  font-size: 18px;
  color: #222;
}

.period {
  background: #faf6e9;
  border: 1px solid #e6cf75;
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 16px;
  font-size: 13px;
}

.columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  direction: ltr;
}

.box {
  border: 1px solid #ddd;
  border-radius: 10px;
  overflow: hidden;
  direction: rtl;
}

.box h2 {
  margin: 0;
  padding: 11px 13px;
  background: #8a0025;
  color: #fff;
  font-size: 17px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

th {
  background: #f4f4f4;
  font-weight: 800;
}

th,
td {
  border-bottom: 1px solid #e7e7e7;
  padding: 7px 6px;
  text-align: right;
  vertical-align: top;
}

td:nth-child(2) {
  white-space: nowrap;
  font-weight: 700;
}

.empty {
  text-align: center;
  color: #888;
  padding: 22px;
}

.summary {
  margin-top: 18px;
  border: 2px solid #8a0025;
  border-radius: 12px;
  padding: 14px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.summary-item {
  background: #fafafa;
  border-radius: 8px;
  padding: 9px;
}

.summary-item span {
  display: block;
  color: #777;
  font-size: 11px;
  margin-bottom: 5px;
}

.summary-item b {
  font-size: 15px;
}

.net {
  margin-top: 12px;
  padding: 12px;
  border-radius: 9px;
  background: #faf6e9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 17px;
  font-weight: 900;
}

.print {
  position: fixed;
  left: 20px;
  top: 20px;
  border: 0;
  border-radius: 8px;
  padding: 10px 16px;
  background: #8a0025;
  color: #fff;
  cursor: pointer;
  font-weight: 800;
}

.footer {
  margin-top: 15px;
  color: #888;
  text-align: center;
  font-size: 10px;
}

@media (max-width: 760px) {
  .page {
    padding: 14px;
  }

  .columns {
    grid-template-columns: 1fr;
  }

  .summary-grid {
    grid-template-columns: 1fr 1fr;
  }

  .print {
    position: static;
    margin-bottom: 12px;
  }
}

@media print {
  .print {
    display: none;
  }
}
</style>
</head>

<body>

<div class="page">

<button
  class="print"
  onclick="window.print()"
>
  طباعة / حفظ PDF
</button>

<div class="header">

  <div>
    <div class="brand">أهل القمة</div>

    <div class="subtitle">
      كشف النشاط والحساب الأسبوعي
    </div>
  </div>

  <div class="user">
    <b>${escapeHtml(u?.full_name || "الكابتن")}</b>
    <br/>
    ${escapeHtml(u?.phone || "")}
  </div>

</div>

<div class="period">
  <b>الفترة:</b>
  ${escapeHtml(
    statementDate(statement.week.start_at)
  )}
  →
  ${escapeHtml(
    statementDate(statement.week.end_at)
  )}
</div>

<div class="columns">

<section class="box">

<h2>الإنتاج</h2>

<table>

<thead>
<tr>
<th>المنتج</th>
<th>القيمة</th>
<th>التاريخ</th>
<th>الوصف</th>
</tr>
</thead>

<tbody>
${productionRows}
</tbody>

</table>

</section>

<section class="box">

<h2>الاستهلاك</h2>

<table>

<thead>
<tr>
<th>المستهلك</th>
<th>القيمة</th>
<th>التاريخ</th>
<th>الوصف</th>
</tr>
</thead>

<tbody>
${consumptionRows}
</tbody>

</table>

</section>

</div>

<section class="summary">

<div class="summary-grid">

<div class="summary-item">
<span>عمولة الإنتاج</span>
<b>
${escapeHtml(
  money(statement.productionCommission)
)}
</b>
</div>

<div class="summary-item">
<span>عمولة الاستهلاك</span>
<b>
${escapeHtml(
  money(statement.consumptionCommission)
)}
</b>
</div>

<div class="summary-item">
<span>أرضية الأسبوع</span>
<b>
${escapeHtml(money(statement.floor))}
</b>
</div>

<div class="summary-item">
<span>عدد العمليات</span>
<b>
${
  statement.production.length +
  statement.consumption.length
}
</b>
</div>

</div>

<div class="net">
<span>صافي الأسبوع</span>

<span>
${escapeHtml(money(statement.net))}
</span>

</div>

</section>

<div class="footer">
أهل القمة — كشف آلي للأسبوع المغلق
</div>

</div>

<script>
window.addEventListener(
  "load",
  () => setTimeout(() => window.print(), 250)
);
</script>

</body>
</html>
`);

    win.document.close();
  }

  async function logout() {
    await supabase.auth.signOut();

    localStorage.clear();

    location.href = "/";
  }

  function go(p: string) {
    setMenu(false);
    location.href = p;
  }

  if (loading) {
    return (
      <main className="captain-pro" dir="rtl">
        <div className="vip-center">
          <div className="vip-spinner" />
          <span>جاري تحميل الحساب...</span>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="captain-pro" dir="rtl">
        <div className="vip-error">
          <h2>تعذر تحميل الحساب</h2>
          <p>{error}</p>
          <button onClick={load}>
            إعادة المحاولة
          </button>
        </div>
      </main>
    );
  }

  const u = data.user!;

  const balance = Number(
    u.balance ??
      data.stats?.balance ??
      data.stats?.currentBalance ??
      0
  );

  const produced = Number(
    data.statistics?.producedTotal ??
      data.stats?.producedTotal ??
      data.activity?.produced_total ??
      0
  );

  const consumed = Number(
    data.statistics?.consumedTotal ??
      data.stats?.consumedTotal ??
      data.activity?.consumed_total ??
      0
  );

  const producedCount = Number(
    data.statistics?.producedCount ??
      data.stats?.producedCount ??
      data.activity?.produced_count ??
      0
  );

  const consumedCount = Number(
    data.statistics?.consumedCount ??
      data.stats?.consumedCount ??
      data.activity?.consumed_count ??
      0
  );

  const totalOrders = Number(
    data.statistics?.totalOperations ??
      data.stats?.totalOrders ??
      producedCount + consumedCount
  );

  const floorCharged = Boolean(
    data.activity?.floor_charged
  );

  return (
    <main
      className="captain-pro"
      dir="rtl"
    >

      {menu && (
        <div
          className="captain-pro-overlay"
          onClick={() => setMenu(false)}
        />
      )}

      <aside
        className={`captain-pro-sidebar ${
          menu ? "open" : ""
        }`}
      >

        <div className="captain-pro-brand">

          <div className="vip-logo-box">
            <span>القمة</span>
          </div>

          <div>
            <b>
              أهل القمة
            </b>

            <small>
              بوابة الكابتن
            </small>
          </div>

          <button
            onClick={() => setMenu(false)}
          >
            <X />
          </button>

        </div>

        <div className="captain-pro-profile">

          <div className="captain-pro-avatar">
            {initials(u.full_name)}
          </div>

          <div>
            <b>
              {u.full_name || "الكابتن"}
            </b>

            <span>
              <i /> متصل الآن
            </span>
          </div>

        </div>

        <div className="captain-pro-caption">
          حسابي
        </div>

        <nav>

          <Side
            active
            icon={<Home />}
            label="الرئيسية"
            onClick={() =>
              go("/dashboard")
            }
          />

          <Side
            icon={<ClipboardList />}
            label="الطلبات"
            onClick={() =>
              go("/orders")
            }
          />

          <Side
            icon={<Wallet />}
            label="المحفظة"
            onClick={() =>
              go("/finance")
            }
          />

          <Side
            icon={<ArrowDownToLine />}
            label="طلبات السحب"
            onClick={() =>
              go("/finance/withdraw")
            }
          />

          <Side
            icon={<Activity />}
            label="الحركات"
            onClick={() =>
              go("/finance")
            }
          />

          <Side
            icon={<CalendarDays />}
            label="الأسبوع الحالي"
            onClick={() =>
              go("/weeks")
            }
          />

          <Side
            icon={<Bell />}
            label="الإشعارات"
            onClick={() =>
              go("/notifications")
            }
          />

          <Side
            icon={<UserRound />}
            label="حسابي"
            onClick={() =>
              go("/settings")
            }
          />

        </nav>

        <button
          className="captain-pro-logout"
          onClick={logout}
        >
          <LogOut />
          تسجيل الخروج
        </button>

      </aside>

      <section className="captain-pro-main">

        <header className="captain-pro-header">

          <button
            className="captain-header-menu"
            onClick={() => setMenu(true)}
          >
            <Menu />
          </button>

          <div className="captain-search">
            <span>
              ابحث في حسابك...
            </span>
          </div>

          <div className="captain-head-spacer" />

          <button
            className="captain-head-icon"
            onClick={() =>
              go("/notifications")
            }
          >
            <Bell />
          </button>

          <div className="captain-head-user">

            <div>
              {initials(u.full_name)}
            </div>

            <span>
              <b>
                {u.full_name || "الكابتن"}
              </b>

              <small>
                كابتن
              </small>
            </span>

            <ChevronLeft />

          </div>

        </header>

        <div className="captain-pro-content">

          <section className="captain-hero">

            <div>

              <span>
                مرحباً بك
              </span>

              <h1>
                {u.full_name || "الكابتن"}
              </h1>

              <p>
                إدارة طلباتك، متابعة رصيدك،
                ومعرفة أداء أسبوعك من مكان
                واحد.
              </p>

              <div className="captain-hero-actions">

                <button
                  onClick={() =>
                    go("/orders")
                  }
                >
                  <Plus />
                  الطلبات
                </button>

                <button
                  onClick={() =>
                    go("/finance")
                  }
                  className="light"
                >
                  <Wallet />
                  المحفظة
                </button>

              </div>

            </div>

            <div className="captain-hero-car">

              <div className="roadline" />

              <div className="hero-car">
                <i />
                <b />
                <span />
              </div>

            </div>

          </section>

          <section className="captain-metrics">

            <Metric
              icon={<Wallet />}
              label="الرصيد الحالي"
              value={money(balance)}
              tone={
                balance < 0
                  ? "negative"
                  : "gold"
              }
            />

            <Metric
              icon={<ClipboardList />}
              label="إجمالي الطلبات"
              value={totalOrders}
              tone="blue"
            />

            <Metric
              icon={<TrendingIcon up />}
              label="إجمالي المنتج"
              value={money(produced)}
              tone="teal"
            />

            <Metric
              icon={<TrendingIcon />}
              label="إجمالي المستهلك"
              value={money(consumed)}
              tone="red"
            />

          </section>

          {data.previousWeekStatement && (
            <section
              className="captain-settlement-card"
              dir="rtl"
            >

              <div className="captain-settlement-head">

                <div className="captain-settlement-icon">
                  <ClipboardList size={20} />
                </div>

                <div>
                  <h3>
                    كشف الأسبوع السابق
                  </h3>

                  <span>
                    {statementDate(
                      data.previousWeekStatement
                        .week.start_at
                    )}

                    {" → "}

                    {statementDate(
                      data.previousWeekStatement
                        .week.end_at
                    )}
                  </span>
                </div>

              </div>

              <div className="captain-settlement-note">
                كشف تفصيلي لنشاطك خلال الأسبوع السابق،
                يشمل الإنتاج والاستهلاك وصافي الحساب.
              </div>

              <button
                type="button"
                className="captain-copy-cliq"
                onClick={openWeeklyStatement}
              >
                <ArrowDownToLine size={17} />
                فتح / تحميل كشف PDF
              </button>

            </section>
          )}

          <section className="captain-grid">

            <div className="captain-panel captain-orders">

              <PanelHead
                title="آخر الطلبات"
                action="عرض الكل"
                onClick={() =>
                  go("/orders")
                }
              />

              {(data.recentOrders || []).length ===
              0 ? (
                <Empty />
              ) : (
                (data.recentOrders || [])
                  .slice(0, 5)
                  .map((o) => (
                    <div
                      className="captain-order-row"
                      key={o.id}
                    >

                      <div className="order-no">
                        #{o.order_number ?? "-"}
                      </div>

                      <div>

                        <b>
                          {o.order_type || "طلب"}
                        </b>

                        <small>
                          {o.relation || "طلب"}{" "}
                          {o.counterparty
                            ? `• ${o.counterparty}`
                            : ""}{" "}
                          • {date(o.created_at)}
                        </small>

                      </div>

                      <strong>
                        {money(
                          Number(o.amount || 0)
                        )}
                      </strong>

                      <span
                        className={`order-status ${
                          o.status || ""
                        }`}
                      >
                        {statusLabel(o.status)}
                      </span>

                      <ChevronLeft />

                    </div>
                  ))
              )}

            </div>

            <div className="captain-panel captain-week">

              <PanelHead
                title="الأسبوع الحالي"
                action="التفاصيل"
                onClick={() =>
                  go("/weeks")
                }
              />

              <div
                className={`week-circle ${
                  floorCharged
                    ? "charged"
                    : "pending"
                }`}
              >

                <div>

                  <b>
                    {floorCharged
                      ? "✓"
                      : "1"}
                  </b>

                  <span>
                    {floorCharged
                      ? "تم احتساب الأرضية"
                      : "أرضية الأسبوع"}
                  </span>

                </div>

              </div>

              <h3>

                {data.currentWeek
                  ? `${date(
                      data.currentWeek
                        .start_at
                    )} → ${date(
                      data.currentWeek
                        .end_at
                    )}`
                  : "الأسبوع الحالي"}

              </h3>

              <p>
                الأرضية الأسبوعية تُحتسب
                مرة واحدة فقط خلال الأسبوع.
              </p>

              <button
                onClick={() =>
                  go("/weeks")
                }
              >
                عرض تفاصيل الأسبوع
                <ChevronLeft />
              </button>

            </div>

          </section>

          <section className="captain-panel captain-actions">

            <PanelHead
              title="اختصارات"
              action=""
            />

            <div className="captain-action-grid">

              <Action
                icon={<ClipboardList />}
                title="الطلبات"
                text="استعرض طلباتك"
                onClick={() =>
                  go("/orders")
                }
              />

              <Action
                icon={<Wallet />}
                title="المحفظة"
                text="راجع حركاتك المالية"
                onClick={() =>
                  go("/finance")
                }
              />

              <Action
                icon={<CalendarDays />}
                title="الأسبوع"
                text="تابع الأسبوع الحالي"
                onClick={() =>
                  go("/weeks")
                }
              />

              <Action
                icon={<Settings />}
                title="حسابي"
                text="الإعدادات والبيانات"
                onClick={() =>
                  go("/settings")
                }
              />

            </div>

          </section>

          <div className="captain-week-strip">

            <Clock3 />

            <span>
              الأرضية الأسبوعية تعمل تلقائياً
            </span>

            <b>
              الجمعة → الخميس
            </b>

          </div>

        </div>

      </section>

      <div className="captain-pro-bottom">

        <Bottom
          active
          icon={<Home />}
          text="الرئيسية"
          onClick={() =>
            go("/dashboard")
          }
        />

        <Bottom
          icon={<ClipboardList />}
          text="الطلبات"
          onClick={() =>
            go("/orders")
          }
        />

        <Bottom
          icon={<Wallet />}
          text="المحفظة"
          onClick={() =>
            go("/finance")
          }
        />

        <Bottom
          icon={<CalendarDays />}
          text="الأسبوع"
          onClick={() =>
            go("/weeks")
          }
        />

        <Bottom
          icon={<Menu />}
          text="المزيد"
          onClick={() =>
            setMenu(true)
          }
        />

      </div>

    </main>
  );
}

function Side({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? "active" : ""}
      onClick={onClick}
    >
      <span>{icon}</span>
      <b>{label}</b>
      <ChevronLeft />
    </button>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className={`captain-metric ${tone}`}>
      <span>{icon}</span>

      <div>
        <small>{label}</small>
        <b>{value}</b>
      </div>
    </div>
  );
}

function PanelHead({
  title,
  action,
  onClick,
}: {
  title: string;
  action: string;
  onClick?: () => void;
}) {
  return (
    <div className="captain-panel-head">

      <h2>{title}</h2>

      {action && (
        <button onClick={onClick}>
          {action}
          <ChevronLeft />
        </button>
      )}

    </div>
  );
}

function Action({
  icon,
  title,
  text,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      className="captain-action"
      onClick={onClick}
    >

      <span>{icon}</span>

      <div>
        <b>{title}</b>
        <small>{text}</small>
      </div>

      <ChevronLeft />

    </button>
  );
}

function Bottom({
  icon,
  text,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  text: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? "active" : ""}
      onClick={onClick}
    >
      {icon}
      <span>{text}</span>
    </button>
  );
}

function statusLabel(status?: string) {
  if (
    status === "cancelled" ||
    status === "canceled"
  ) {
    return "ملغى";
  }

  if (status === "pending") {
    return "قيد الانتظار";
  }

  if (status === "processing") {
    return "قيد التنفيذ";
  }

  if (status === "completed") {
    return "مكتمل";
  }

  return status || "مكتمل";
}

function Empty() {
  return (
    <div className="captain-empty">

      <ClipboardList />

      <b>
        لا توجد طلبات حديثة
      </b>

      <small>
        ستظهر طلباتك هنا فور تسجيلها
      </small>

    </div>
  );
}

function TrendingIcon({
  up = false,
}: {
  up?: boolean;
}) {
  return (
    <span className="trend-mini">
      {up ? "↗" : "↘"}
    </span>
  );
}