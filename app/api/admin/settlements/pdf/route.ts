import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import React from "react";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";

/* =========================================================
   SUPABASE ADMIN
========================================================= */

function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

/* =========================================================
   ARABIC FONT
   لا يحتاج ملف داخل المشروع
========================================================= */

let arabicFontLoaded = false;

async function loadArabicFont() {
  if (arabicFontLoaded) {
    return;
  }

  const fontUrl =
    "https://raw.githubusercontent.com/google/fonts/main/ofl/notonaskharabic/NotoNaskhArabic%5Bwght%5D.ttf";

  const response = await fetch(fontUrl, {
    cache: "force-cache",
  });

  if (!response.ok) {
    throw new Error(
      `تعذر تحميل الخط العربي: ${response.status}`
    );
  }
const fontArrayBuffer =
  await response.arrayBuffer();

const fontBuffer = Buffer.from(
  fontArrayBuffer
);

const fontBase64 =
  fontBuffer.toString("base64");

Font.register({
  family: "NotoArabic",
  src: `data:font/ttf;base64,${fontBase64}`,
  fontWeight: 400,
  fontStyle: "normal",
});
  arabicFontLoaded = true;
}

/* =========================================================
   ADMIN AUTH
========================================================= */

async function getAdminUser(request: NextRequest) {
  try {
    const authHeader =
      request.headers.get("authorization");

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return null;
    }

    const token = authHeader
      .replace("Bearer ", "")
      .trim();

    if (!token) {
      return null;
    }

    const {
      data: { user },
      error,
    } = await supabaseAuth.auth.getUser(
      token
    );

    if (error || !user) {
      return null;
    }

    const supabaseAdmin =
      createSupabaseAdmin();

    const {
      data: admin,
      error: adminError,
    } = await supabaseAdmin
      .from("users")
      .select(`
        id,
        full_name,
        phone,
        role,
        is_active,
        deleted_at
      `)
      .eq("id", user.id)
      .eq("role", "admin")
      .eq("is_active", true)
      .is("deleted_at", null)
      .single();

    if (adminError || !admin) {
      return null;
    }

    return admin;
  } catch (error) {
    console.error(
      "GET ADMIN USER ERROR:",
      error
    );

    return null;
  }
}

/* =========================================================
   TYPES
========================================================= */

type SettlementRow = {
  id: string;
  full_name: string;
  phone: string;
  previous_week_net: number;
  amount: number;
};

type WeekData = {
  id: string;
  start_at: string;
  end_at: string;
  is_closed: boolean;
};

/* =========================================================
   HELPERS
========================================================= */

function money(value: number) {
  return `${Number(value || 0).toFixed(2)} د.أ`;
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "ar-JO",
    {
      timeZone: "Asia/Amman",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(new Date(value));
}

function formatFileDate(
  value: string
) {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "date";
  }

  const year =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "Asia/Amman",
        year: "numeric",
      }
    ).format(date);

  const month =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "Asia/Amman",
        month: "2-digit",
      }
    ).format(date);

  const day =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "Asia/Amman",
        day: "2-digit",
      }
    ).format(date);

  return `${year}-${month}-${day}`;
}

/* =========================================================
   PDF STYLES
========================================================= */

const styles =
  StyleSheet.create({
    page: {
      paddingTop: 35,
      paddingBottom: 35,
      paddingLeft: 40,
      paddingRight: 40,
      fontFamily: "NotoArabic",
      fontSize: 10,
      backgroundColor: "#11151a",
    },

    /* =========================
       HEADER
    ========================= */

    header: {
      alignItems: "center",
      marginBottom: 20,
      paddingBottom: 14,
      borderBottomWidth: 2,
      borderBottomColor: "#d6a84f",
    },

    logo: {
      fontSize: 23,
      fontWeight: "bold",
      color: "#d6a84f",
      textAlign: "center",
      marginBottom: 5,
    },

    title: {
      fontSize: 17,
      fontWeight: "bold",
      color: "#222222",
      textAlign: "center",
    },

    weekText: {
      fontSize: 9,
      color: "#666666",
      textAlign: "center",
      marginTop: 6,
    },

    /* =========================
       TOTAL
    ========================= */

    totalBox: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",

      backgroundColor: "#faf7f8",

      borderWidth: 1,
      borderColor: "#eadde1",

      borderRadius: 7,

      paddingTop: 11,
      paddingBottom: 11,
      paddingLeft: 15,
      paddingRight: 15,

      marginBottom: 18,
    },

    totalLabel: {
      fontSize: 10,
      color: "#555555",
    },

    totalValue: {
      fontSize: 14,
      fontWeight: "bold",
      color: "#c62828",
    },

    /* =========================
       TABLE
    ========================= */

    table: {
      width: "100%",
      borderWidth: 1,
      borderColor: "#dddddd",
      borderRadius: 6,
      overflow: "hidden",
    },

    tableHeader: {
      flexDirection: "row",
      backgroundColor: "#d6a84f",
      minHeight: 38,
      alignItems: "center",
    },

    tableRow: {
      flexDirection: "row",
      minHeight: 37,
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: "#eeeeee",
    },

    tableRowAlt: {
      backgroundColor: "#fafafa",
    },

    headerText: {
      color: "#11151a",
      fontSize: 10,
      fontWeight: "bold",
      textAlign: "center",
    },

    cell: {
      fontSize: 10,
      color: "#222222",
      textAlign: "center",
    },

    nameCell: {
      width: "48%",
      paddingLeft: 7,
      paddingRight: 7,
    },

    phoneCell: {
      width: "27%",
      paddingLeft: 7,
      paddingRight: 7,
    },

    amountCell: {
      width: "25%",
      paddingLeft: 7,
      paddingRight: 7,
    },

    amountValue: {
      color: "#c62828",
      fontWeight: "bold",
    },

    /* =========================
       FOOTER
    ========================= */

    footer: {
      marginTop: 18,
      paddingTop: 9,
      borderTopWidth: 1,
      borderTopColor: "#dddddd",
      fontSize: 8,
      color: "#777777",
      textAlign: "center",
    },
  });

/* =========================================================
   PDF DOCUMENT
========================================================= */

function SettlementsPDF({
  week,
  rows,
  total,
}: {
  week: WeekData;
  rows: SettlementRow[];
  total: number;
}) {
  return React.createElement(
    Document,
    {
      title:
        "كشف مستحقات الأسبوع السابق",

      author: "أهل القمة",

      subject:
        "مستحقات الأسبوع السابق",
    },

    React.createElement(
      Page,
      {
        size: "A4",
        orientation: "portrait",
        style: styles.page,
      },

      /* =========================
         HEADER
      ========================= */

      React.createElement(
        View,
        {
          style: styles.header,
        },

        React.createElement(
          Text,
          {
            style: styles.logo,
          },
          "أهل القمة"
        ),

        React.createElement(
          Text,
          {
            style: styles.title,
          },
          "كشف مستحقات الأسبوع السابق"
        ),

        React.createElement(
          Text,
          {
            style: styles.weekText,
          },
          `${formatDate(
            week.start_at
          )} - ${formatDate(
            week.end_at
          )}`
        )
      ),

      /* =========================
         TOTAL
      ========================= */

      React.createElement(
        View,
        {
          style: styles.totalBox,
        },

        React.createElement(
          Text,
          {
            style: styles.totalLabel,
          },
          `عدد المستخدمين: ${rows.length}`
        ),

        React.createElement(
          Text,
          {
            style: styles.totalValue,
          },
          `إجمالي المستحق: ${money(
            total
          )}`
        )
      ),

      /* =========================
         TABLE
      ========================= */

      React.createElement(
        View,
        {
          style: styles.table,
        },

        /* TABLE HEADER */

        React.createElement(
          View,
          {
            style: styles.tableHeader,
          },

          React.createElement(
            Text,
            {
              style: [
                styles.headerText,
                styles.nameCell,
              ],
            },
            "اسم المستخدم"
          ),

          React.createElement(
            Text,
            {
              style: [
                styles.headerText,
                styles.phoneCell,
              ],
            },
            "رقم الهاتف"
          ),

          React.createElement(
            Text,
            {
              style: [
                styles.headerText,
                styles.amountCell,
              ],
            },
            "مستحقات الأسبوع السابق"
          )
        ),

        /* TABLE ROWS */

        ...rows.map(
          (row, index) =>
            React.createElement(
              View,
              {
                key: row.id,

                style: [
                  styles.tableRow,

                  index % 2 === 1
                    ? styles.tableRowAlt
                    : {},
                ],

                wrap: false,
              },

              React.createElement(
                Text,
                {
                  style: [
                    styles.cell,
                    styles.nameCell,
                  ],
                },
                row.full_name || "-"
              ),

              React.createElement(
                Text,
                {
                  style: [
                    styles.cell,
                    styles.phoneCell,
                  ],
                },
                row.phone || "-"
              ),

              React.createElement(
                Text,
                {
                  style: [
                    styles.cell,
                    styles.amountCell,
                    styles.amountValue,
                  ],
                },
                money(row.amount)
              )
            )
        )
      ),

      /* =========================
         FOOTER
      ========================= */

      React.createElement(
        Text,
        {
          style: styles.footer,
        },
        "أهل القمة — كشف مستحقات الأسبوع السابق"
      )
    )
  );
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    /* =========================
       LOAD ARABIC FONT
    ========================= */

    await loadArabicFont();

    /* =========================
       ADMIN AUTH
    ========================= */

    const admin =
      await getAdminUser(
        request
      );

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "غير مصرح بالدخول",
        },
        {
          status: 403,
        }
      );
    }

    /* =========================
       REQUEST BODY
    ========================= */

    const body =
      await request.json();

    const weekId = String(
      body?.weekId || ""
    ).trim();

    const requestedUserIds =
      Array.isArray(
        body?.userIds
      )
        ? body.userIds
            .map(
              (id: unknown) =>
                String(id).trim()
            )
            .filter(Boolean)
        : [];

    if (!weekId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "معرف الأسبوع مفقود",
        },
        {
          status: 400,
        }
      );
    }

    if (
      requestedUserIds.length ===
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "لا يوجد مستخدمون في قائمة التسويات",
        },
        {
          status: 400,
        }
      );
    }

    const supabaseAdmin =
      createSupabaseAdmin();

    /* =========================
       WEEK
    ========================= */

    const {
      data: week,
      error: weekError,
    } =
      await supabaseAdmin
        .from(
          "weekly_periods"
        )
        .select(
          "id, start_at, end_at, is_closed"
        )
        .eq(
          "id",
          weekId
        )
        .eq(
          "is_closed",
          true
        )
        .maybeSingle();

    if (
      weekError ||
      !week
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "الأسبوع غير موجود أو غير مغلق",
        },
        {
          status: 400,
        }
      );
    }

    /* =========================
       ORDERS
    ========================= */

    const {
      data: orders,
      error: ordersError,
    } =
      await supabaseAdmin
        .from("orders")
        .select(`
          producer_id,
          consumer_id,
          commission_amount
        `)
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
        );

    if (ordersError) {
      console.error(
        "SETTLEMENT PDF ORDERS ERROR:",
        ordersError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "تعذر تحميل طلبات الأسبوع",
          error:
            ordersError.message,
        },
        {
          status: 500,
        }
      );
    }

    /* =========================
       WEEKLY FLOOR
    ========================= */

    const {
      data: activities,
      error: activityError,
    } =
      await supabaseAdmin
        .from(
          "weekly_user_activity"
        )
        .select(
          "user_id, floor_charged"
        )
        .eq(
          "week_id",
          week.id
        );

    if (activityError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "تعذر تحميل الأرضية الأسبوعية",
          error:
            activityError.message,
        },
        {
          status: 500,
        }
      );
    }

    /* =========================
       PREVIOUS SETTLEMENTS
    ========================= */

    const {
      data: settlements,
      error: settlementsError,
    } =
      await supabaseAdmin
        .from("transactions")
        .select(
          "user_id"
        )
        .eq(
          "week_id",
          week.id
        )
        .eq(
          "transaction_type",
          "previous_week_settlement"
        );

    if (settlementsError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "تعذر تحميل التسويات السابقة",
          error:
            settlementsError.message,
        },
        {
          status: 500,
        }
      );
    }

    const settledUsers =
      new Set(
        (
          settlements || []
        ).map(
          (item) =>
            String(
              item.user_id
            )
        )
      );

    /* =========================
       CALCULATE NET
    ========================= */

    const netByUser =
      new Map<
        string,
        number
      >();

    for (
      const order of
        orders || []
    ) {
      const commission =
        Number(
          order.commission_amount ||
            0
        );

      /* المنتج + العمولة */

      if (
        order.producer_id
      ) {
        const id =
          String(
            order.producer_id
          );

        netByUser.set(
          id,
          Number(
            (
              (
                netByUser.get(
                  id
                ) || 0
              ) +
              commission
            ).toFixed(2)
          )
        );
      }

      /* المستهلك - العمولة */

      if (
        order.consumer_id
      ) {
        const id =
          String(
            order.consumer_id
          );

        netByUser.set(
          id,
          Number(
            (
              (
                netByUser.get(
                  id
                ) || 0
              ) -
              commission
            ).toFixed(2)
          )
        );
      }
    }

    /* =========================
       WEEKLY FLOOR = 1 JD
    ========================= */

    for (
      const activity of
        activities || []
    ) {
      if (
        activity.floor_charged ===
        true
      ) {
        const id =
          String(
            activity.user_id
          );

        netByUser.set(
          id,
          Number(
            (
              (
                netByUser.get(
                  id
                ) || 0
              ) - 1
            ).toFixed(2)
          )
        );
      }
    }

    /* =========================
       USERS
    ========================= */

    const {
      data: users,
      error: usersError,
    } =
      await supabaseAdmin
        .from("users")
        .select(`
          id,
          full_name,
          phone,
          balance,
          role,
          is_active,
          deleted_at
        `)
        .in(
          "id",
          requestedUserIds
        )
        .eq(
          "is_active",
          true
        )
        .neq(
          "role",
          "admin"
        )
        .is(
          "deleted_at",
          null
        );

    if (usersError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "تعذر تحميل المستخدمين",
          error:
            usersError.message,
        },
        {
          status: 500,
        }
      );
    }

    /* =========================
       BUILD PDF ROWS
    ========================= */

    const rows: SettlementRow[] =
      [];

    for (
      const user of
        users || []
    ) {
      const userId =
        String(user.id);

      if (
        !requestedUserIds.includes(
          userId
        )
      ) {
        continue;
      }

      if (
        settledUsers.has(
          userId
        )
      ) {
        continue;
      }

      const net =
        Number(
          netByUser.get(
            userId
          ) || 0
        );

      /* فقط من عليه مستحق */

      if (net >= 0) {
        continue;
      }

      const amount =
        Number(
          Math.abs(
            net
          ).toFixed(2)
        );

      rows.push({
        id: userId,

        full_name:
          user.full_name ||
          "بدون اسم",

        phone:
          user.phone ||
          "-",

        previous_week_net:
          Number(
            net.toFixed(2)
          ),

        amount,
      });
    }

    /* =========================
       SORT
    ========================= */

    rows.sort(
      (a, b) =>
        b.amount -
        a.amount
    );

    if (
      rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "لا توجد تسويات غير مسددة في القائمة الحالية",
        },
        {
          status: 400,
        }
      );
    }

    /* =========================
       TOTAL
    ========================= */

    const total =
      Number(
        rows
          .reduce(
            (
              sum,
              row
            ) =>
              sum +
              Number(
                row.amount ||
                  0
              ),
            0
          )
          .toFixed(2)
      );

    /* =========================
       CREATE PDF
    ========================= */

    const pdfElement =
      React.createElement(
        SettlementsPDF,
        {
          week:
            week as WeekData,
          rows,
          total,
        }
      );

    const pdfBuffer =
      await renderToBuffer(
        pdfElement as any
      );

    /* =========================
       FILE NAME
    ========================= */

    const filename =
      `تسويات-الأسبوع-السابق-${formatFileDate(
        week.end_at
      )}.pdf`;

    /* =========================
       RETURN PDF
    ========================= */

    return new NextResponse(
      Buffer.from(
        pdfBuffer
      ),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename*=UTF-8''${encodeURIComponent(
              filename
            )}`,

          "Content-Length":
            String(
              pdfBuffer.length
            ),

          "Cache-Control":
            "no-store, no-cache, must-revalidate",

          Pragma:
            "no-cache",
        },
      }
    );
  } catch (error: any) {
    console.error(
      "SETTLEMENTS PDF ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "حدث خطأ أثناء إنشاء كشف تسويات الأسبوع السابق",

        error:
          error?.message ||
          "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}