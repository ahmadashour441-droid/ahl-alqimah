import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* =========================================================
   Supabase Admin
========================================================= */

function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

/* =========================================================
   Helpers
========================================================= */

function money(value: number) {
  return `${value.toFixed(2)} JD`;
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("ar-JO", {
    timeZone: "Asia/Amman",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("ar-JO", {
    timeZone: "Asia/Amman",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   GET
========================================================= */

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const userId = url.searchParams.get("userId");
    const weekId = url.searchParams.get("weekId");

    /* =====================================================
       التحقق من userId
    ===================================================== */

    if (!userId) {
      return NextResponse.json(
        {
          error: "userId مطلوب",
        },
        {
          status: 400,
        }
      );
    }

    const supabaseAdmin = createSupabaseAdmin();

    /* =====================================================
       المستخدم
    ===================================================== */

    const {
      data: user,
      error: userError,
    } = await supabaseAdmin
      .from("users")
      .select(
        "id, full_name, phone, role, is_active"
      )
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      console.error(
        "PREVIOUS WEEK HTML USER ERROR:",
        userError
      );

      return NextResponse.json(
        {
          error: "تعذر تحميل المستخدم",
          details: userError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          error: "المستخدم غير موجود",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       الأسبوع المغلق

       إذا أرسل weekId نستخدمه.
       إذا لم يرسل نأخذ أحدث أسبوع مغلق.
    ===================================================== */

    let weekQuery = supabaseAdmin
      .from("weekly_periods")
      .select(
        "id, start_at, end_at, is_closed, closed_at"
      )
      .eq("is_closed", true);

    if (weekId) {
      weekQuery = weekQuery.eq(
        "id",
        weekId
      );
    } else {
      weekQuery = weekQuery
        .order("end_at", {
          ascending: false,
        })
        .limit(1);
    }

    const {
      data: week,
      error: weekError,
    } = await weekQuery.maybeSingle();

    if (weekError) {
      console.error(
        "PREVIOUS WEEK HTML WEEK ERROR:",
        weekError
      );

      return NextResponse.json(
        {
          error:
            "تعذر تحميل الأسبوع المغلق",
          details: weekError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!week) {
      return NextResponse.json(
        {
          error: "لا يوجد أسبوع مغلق",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       الإنتاج
    ===================================================== */

    const {
      data: producedOrders,
      error: producedError,
    } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        order_number,
        order_type,
        amount,
        commission_rate,
        commission_amount,
        producer_id,
        consumer_id,
        status,
        notes,
        created_at,
        updated_at,
        financially_processed,
        processed_week_id,
        consumer:users!orders_consumer_id_fkey (
          id,
          full_name,
          phone
        )
      `)
      .eq(
        "producer_id",
        userId
      )
      .eq(
        "processed_week_id",
        week.id
      )
      .eq(
        "financially_processed",
        true
      )
      .neq(
        "status",
        "cancelled"
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (producedError) {
      console.error(
        "PREVIOUS WEEK HTML PRODUCED ERROR:",
        producedError
      );

      return NextResponse.json(
        {
          error:
            "تعذر تحميل الإنتاج",
          details:
            producedError.message,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       الاستهلاك
    ===================================================== */

    const {
      data: consumedOrders,
      error: consumedError,
    } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        order_number,
        order_type,
        amount,
        commission_rate,
        commission_amount,
        producer_id,
        consumer_id,
        status,
        notes,
        created_at,
        updated_at,
        financially_processed,
        processed_week_id,
        producer:users!orders_producer_id_fkey (
          id,
          full_name,
          phone
        )
      `)
      .eq(
        "consumer_id",
        userId
      )
      .eq(
        "processed_week_id",
        week.id
      )
      .eq(
        "financially_processed",
        true
      )
      .neq(
        "status",
        "cancelled"
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (consumedError) {
      console.error(
        "PREVIOUS WEEK HTML CONSUMED ERROR:",
        consumedError
      );

      return NextResponse.json(
        {
          error:
            "تعذر تحميل الاستهلاك",
          details:
            consumedError.message,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       النشاط الأسبوعي
    ===================================================== */

    const {
      data: activity,
      error: activityError,
    } = await supabaseAdmin
      .from("weekly_user_activity")
      .select(
        "floor_charged"
      )
      .eq(
        "week_id",
        week.id
      )
      .eq(
        "user_id",
        userId
      )
      .maybeSingle();

    if (activityError) {
      console.error(
        "PREVIOUS WEEK HTML ACTIVITY ERROR:",
        activityError
      );

      return NextResponse.json(
        {
          error:
            "تعذر تحميل رسوم الأسبوع السابق",
          details:
            activityError.message,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       الحسابات
    ===================================================== */

    const production =
      producedOrders || [];

    const consumption =
      consumedOrders || [];

    const productionCommission =
      production.reduce(
        (
          sum: number,
          order: any
        ) =>
          sum +
          Number(
            order.commission_amount || 0
          ),
        0
      );

    const consumptionCommission =
      consumption.reduce(
        (
          sum: number,
          order: any
        ) =>
          sum +
          Number(
            order.commission_amount || 0
          ),
        0
      );

    const floor =
      activity?.floor_charged
        ? 1
        : 0;

    const net =
      productionCommission -
      consumptionCommission -
      floor;

    /* =====================================================
       بناء صفوف الإنتاج
    ===================================================== */

    const productionRows =
      production.length === 0
        ? `
          <tr>
            <td colspan="6" class="empty">
              لا توجد طلبات منتجة
            </td>
          </tr>
        `
        : production
            .map(
              (order: any) => `
                <tr>
                  <td>
                    ${escapeHtml(
                      order.order_number || "-"
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      order.order_type || "-"
                    )}
                  </td>

                  <td>
                    ${money(
                      Number(
                        order.amount || 0
                      )
                    )}
                  </td>

                  <td>
                    ${Number(
                      order.commission_rate || 0
                    ).toFixed(0)}%
                  </td>

                  <td>
                    ${money(
                      Number(
                        order.commission_amount || 0
                      )
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      order.consumer?.full_name ||
                        "-"
                    )}
                  </td>
                </tr>
              `
            )
            .join("");

    /* =====================================================
       بناء صفوف الاستهلاك
    ===================================================== */

    const consumptionRows =
      consumption.length === 0
        ? `
          <tr>
            <td colspan="6" class="empty">
              لا توجد طلبات مستهلكة
            </td>
          </tr>
        `
        : consumption
            .map(
              (order: any) => `
                <tr>
                  <td>
                    ${escapeHtml(
                      order.order_number || "-"
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      order.order_type || "-"
                    )}
                  </td>

                  <td>
                    ${money(
                      Number(
                        order.amount || 0
                      )
                    )}
                  </td>

                  <td>
                    ${Number(
                      order.commission_rate || 0
                    ).toFixed(0)}%
                  </td>

                  <td>
                    ${money(
                      Number(
                        order.commission_amount || 0
                      )
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      order.producer?.full_name ||
                        "-"
                    )}
                  </td>
                </tr>
              `
            )
            .join("");

    /* =====================================================
       تحديد حالة الصافي
    ===================================================== */

    let netClass = "";

    if (net < 0) {
      netClass = "negative";
    } else if (net > 0) {
      netClass = "positive";
    }

    /* =====================================================
       HTML
    ===================================================== */

    const html = `
<!DOCTYPE html>

<html
  lang="ar"
  dir="rtl"
>
<head>

  <meta
    charset="UTF-8"
  />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>
    كشف حساب - ${escapeHtml(
      user.full_name || "مستخدم"
    )}
  </title>

  <style>

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 30px;
      background: #f3f5f7;
      color: #172033;
      font-family:
        Arial,
        "Tahoma",
        sans-serif;
      direction: rtl;
    }

    .page {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 35px;
      border-radius: 14px;
      box-shadow:
        0 8px 30px rgba(
          0,
          0,
          0,
          0.08
        );
    }

    .header {
      text-align: center;
      padding-bottom: 18px;
      margin-bottom: 22px;
      border-bottom: 3px solid #1e3a5f;
    }

    .logo {
      font-size: 34px;
      font-weight: 900;
      color: #1e3a5f;
      margin-bottom: 5px;
    }

    .title {
      font-size: 23px;
      font-weight: 800;
      margin-bottom: 5px;
    }

    .subtitle {
      color: #667085;
      font-size: 14px;
    }

    .user-info {
      display: grid;
      grid-template-columns:
        repeat(2, 1fr);
      gap: 10px;
      border: 1px solid #dfe3e8;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 25px;
      background: #fafbfc;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      gap: 15px;
      padding: 8px 10px;
      border-bottom: 1px solid #edf0f2;
    }

    .info-label {
      font-weight: 700;
      color: #475467;
    }

    .info-value {
      font-weight: 600;
    }

    .section {
      margin-top: 24px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 800;
      color: #1e3a5f;
      margin-bottom: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      overflow: hidden;
      border: 1px solid #dfe3e8;
    }

    th {
      background: #1e3a5f;
      color: white;
      padding: 11px 8px;
      font-size: 13px;
      font-weight: 700;
    }

    td {
      padding: 10px 8px;
      text-align: center;
      border-bottom: 1px solid #edf0f2;
      font-size: 12px;
    }

    tr:nth-child(even) td {
      background: #fafbfc;
    }

    .empty {
      padding: 18px;
      color: #667085;
      font-weight: 600;
    }

    .summary {
      margin-top: 25px;
      border: 1px solid #dfe3e8;
      border-radius: 12px;
      padding: 18px;
      background: #fafbfc;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 9px 0;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
    }

    .summary-row:last-child {
      border-bottom: none;
    }

    .summary-label {
      font-weight: 700;
      color: #475467;
    }

    .summary-value {
      font-weight: 800;
    }

    .net {
      margin-top: 10px;
      padding-top: 15px;
      border-top: 2px solid #1e3a5f;
      font-size: 20px;
    }

    .negative {
      color: #c62828;
    }

    .positive {
      color: #16803c;
    }

    .zero {
      color: #475467;
    }

    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      color: #667085;
      font-size: 11px;
    }

    .print-button {
      position: fixed;
      bottom: 20px;
      left: 20px;
      border: none;
      border-radius: 10px;
      padding: 12px 20px;
      background: #1e3a5f;
      color: white;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }

    .print-button:hover {
      opacity: 0.9;
    }

    @media print {

      body {
        background: white;
        padding: 0;
      }

      .page {
        max-width: none;
        box-shadow: none;
        border-radius: 0;
        padding: 15px;
      }

      .print-button {
        display: none;
      }

      @page {
        size: A4 landscape;
        margin: 10mm;
      }

      table {
        page-break-inside: auto;
      }

      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }

      .section {
        page-break-inside: avoid;
      }

    }

    @media (max-width: 700px) {

      body {
        padding: 10px;
      }

      .page {
        padding: 18px;
      }

      .user-info {
        grid-template-columns: 1fr;
      }

      table {
        font-size: 10px;
      }

      th,
      td {
        padding: 7px 4px;
      }

      .logo {
        font-size: 28px;
      }

      .title {
        font-size: 19px;
      }
    }

  </style>

</head>

<body>

  <div class="page">

    <!-- Header -->

    <div class="header">

      <div class="logo">
        أهل القمة
      </div>

      <div class="title">
        كشف الحساب الأسبوعي
      </div>

      <div class="subtitle">
        صادر من نظام أهل القمة
      </div>

    </div>

    <!-- User Information -->

    <div class="user-info">

      <div class="info-item">

        <span class="info-label">
          اسم المستخدم
        </span>

        <span class="info-value">
          ${escapeHtml(
            user.full_name || "-"
          )}
        </span>

      </div>

      <div class="info-item">

        <span class="info-label">
          رقم الهاتف
        </span>

        <span class="info-value">
          ${escapeHtml(
            user.phone || "-"
          )}
        </span>

      </div>

      <div class="info-item">

        <span class="info-label">
          بداية الأسبوع
        </span>

        <span class="info-value">
          ${formatDate(
            week.start_at
          )}
        </span>

      </div>

      <div class="info-item">

        <span class="info-label">
          نهاية الأسبوع
        </span>

        <span class="info-value">
          ${formatDate(
            week.end_at
          )}
        </span>

      </div>

      <div class="info-item">

        <span class="info-label">
          تاريخ الإغلاق
        </span>

        <span class="info-value">
          ${formatDateTime(
            week.closed_at
          )}
        </span>

      </div>

      <div class="info-item">

        <span class="info-label">
          حالة الأسبوع
        </span>

        <span class="info-value">
          ${
            week.is_closed
              ? "مغلق"
              : "مفتوح"
          }
        </span>

      </div>

    </div>

    <!-- Production -->

    <div class="section">

      <div class="section-title">
        الطلبات المنتجة
      </div>

      <table>

        <thead>

          <tr>

            <th>
              رقم الطلب
            </th>

            <th>
              النوع
            </th>

            <th>
              قيمة الطلب
            </th>

            <th>
              نسبة العمولة
            </th>

            <th>
              قيمة العمولة
            </th>

            <th>
              المستهلك
            </th>

          </tr>

        </thead>

        <tbody>

          ${productionRows}

        </tbody>

      </table>

    </div>

    <!-- Consumption -->

    <div class="section">

      <div class="section-title">
        الطلبات المستهلكة
      </div>

      <table>

        <thead>

          <tr>

            <th>
              رقم الطلب
            </th>

            <th>
              النوع
            </th>

            <th>
              قيمة الطلب
            </th>

            <th>
              نسبة العمولة
            </th>

            <th>
              قيمة العمولة
            </th>

            <th>
              المنتج
            </th>

          </tr>

        </thead>

        <tbody>

          ${consumptionRows}

        </tbody>

      </table>

    </div>

    <!-- Summary -->

    <div class="summary">

      <div class="summary-row">

        <span class="summary-label">
          عمولة الإنتاج
        </span>

        <span class="summary-value">
          ${money(
            productionCommission
          )}
        </span>

      </div>

      <div class="summary-row">

        <span class="summary-label">
          عمولة الاستهلاك
        </span>

        <span class="summary-value">
          ${money(
            consumptionCommission
          )}
        </span>

      </div>

      <div class="summary-row">

        <span class="summary-label">
          الأرضية الأسبوعية
        </span>

        <span class="summary-value">
          ${money(
            floor
          )}
        </span>

      </div>

      <div
        class="summary-row net"
      >

        <span class="summary-label">
          صافي الحساب
        </span>

        <span
          class="summary-value ${netClass}"
        >
          ${money(net)}
        </span>

      </div>

    </div>

    <!-- Footer -->

    <div class="footer">

      أهل القمة — كشف حساب صادر من النظام

    </div>

  </div>

  <button
    class="print-button"
    onclick="window.print()"
  >
    طباعة / حفظ PDF
  </button>

</body>

</html>
`;

    /* =====================================================
       Return HTML
    ===================================================== */

    return new NextResponse(
      html,
      {
        status: 200,

        headers: {
          "Content-Type":
            "text/html; charset=utf-8",

          "Cache-Control":
            "no-store, no-cache, must-revalidate",

          Pragma:
            "no-cache",
        },
      }
    );
  } catch (error) {
    console.error(
      "PREVIOUS WEEK STATEMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ أثناء إنشاء كشف الحساب",
      },
      {
        status: 500,
      }
    );
  }
}