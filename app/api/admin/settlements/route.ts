import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

/*
=========================================================
ADMIN AUTH
=========================================================
*/

async function getAdminUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabaseAuth.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  const { data: admin, error: adminError } =
    await supabaseAdmin
      .from("users")
      .select(
        "id, full_name, phone, email, role, balance, is_active, deleted_at"
      )
      .eq("id", user.id)
      .eq("role", "admin")
      .eq("is_active", true)
      .is("deleted_at", null)
      .single();

  if (adminError || !admin) {
    return null;
  }

  return admin;
}

/*
=========================================================
GET
تسويات الأسبوع السابق غير المسددة
=========================================================
*/

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "غير مصرح بالدخول",
        },
        { status: 403 }
      );
    }

    /*
    -------------------------------------------------------
    آخر أسبوع مغلق
    -------------------------------------------------------
    */

    const {
      data: previousWeek,
      error: previousWeekError,
    } = await supabaseAdmin
      .from("weekly_periods")
      .select("id, start_at, end_at, is_closed")
      .eq("is_closed", true)
      .order("end_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previousWeekError) {
      console.error(
        "SETTLEMENT PREVIOUS WEEK ERROR:",
        previousWeekError
      );

      return NextResponse.json(
        {
          success: false,
          message: "تعذر تحديد الأسبوع السابق",
          error: previousWeekError.message,
        },
        { status: 500 }
      );
    }

    if (!previousWeek) {
      return NextResponse.json({
        success: true,
        previousWeek: null,
        users: [],
        total: 0,
      });
    }

    /*
    -------------------------------------------------------
    نقطة بداية قائمة التسويات الجديدة
    لا نحذف الحركات القديمة ولا نغيّر أرصدة المستخدمين.
    يتم تجاهل كل أسبوع مغلق حتى تاريخ التفريغ فقط.
    -------------------------------------------------------
    */
    const { data: queueState, error: queueStateError } =
      await supabaseAdmin
        .from("settlement_queue_state")
        .select("cleared_through_end_at")
        .eq("id", 1)
        .maybeSingle();

    if (queueStateError) {
      console.error("SETTLEMENT QUEUE STATE ERROR:", queueStateError);
      return NextResponse.json(
        {
          success: false,
          message: "يجب إعداد جدول settlement_queue_state في قاعدة البيانات أولًا",
          error: queueStateError.message,
        },
        { status: 500 }
      );
    }

    if (
      queueState?.cleared_through_end_at &&
      new Date(previousWeek.end_at).getTime() <=
        new Date(queueState.cleared_through_end_at).getTime()
    ) {
      return NextResponse.json({
        success: true,
        previousWeek: null,
        users: [],
        total: 0,
        queueCleared: true,
        message: "القائمة مفرغة. ستظهر مستحقات الأسبوع الجديد بعد إغلاقه.",
      });
    }

    /*
    -------------------------------------------------------
    طلبات الأسبوع السابق
    -------------------------------------------------------
    */

    const {
      data: previousWeekOrders,
      error: ordersError,
    } = await supabaseAdmin
      .from("orders")
      .select(
        "producer_id, consumer_id, commission_amount"
      )
      .eq("processed_week_id", previousWeek.id)
      .eq("financially_processed", true)
      .neq("status", "cancelled");

    if (ordersError) {
      console.error(
        "SETTLEMENT ORDERS ERROR:",
        ordersError
      );

      return NextResponse.json(
        {
          success: false,
          message: "تعذر تحميل طلبات الأسبوع السابق",
          error: ordersError.message,
        },
        { status: 500 }
      );
    }

    /*
    -------------------------------------------------------
    الأرضية الأسبوعية
    -------------------------------------------------------
    */

    const {
      data: weeklyActivity,
      error: activityError,
    } = await supabaseAdmin
      .from("weekly_user_activity")
      .select("user_id, floor_charged")
      .eq("week_id", previousWeek.id);

    if (activityError) {
      console.error(
        "SETTLEMENT ACTIVITY ERROR:",
        activityError
      );

      return NextResponse.json(
        {
          success: false,
          message: "تعذر تحميل الأرضية الأسبوعية",
          error: activityError.message,
        },
        { status: 500 }
      );
    }

    /*
    -------------------------------------------------------
    التسويات المسجلة سابقًا
    -------------------------------------------------------
    */

    const {
      data: settlements,
      error: settlementsError,
    } = await supabaseAdmin
      .from("transactions")
      .select("user_id")
      .eq("week_id", previousWeek.id)
      .eq(
        "transaction_type",
        "previous_week_settlement"
      );

    if (settlementsError) {
      console.error(
        "SETTLEMENT RECORDS ERROR:",
        settlementsError
      );

      return NextResponse.json(
        {
          success: false,
          message: "تعذر تحميل التسويات السابقة",
          error: settlementsError.message,
        },
        { status: 500 }
      );
    }

    const settledUsers = new Set(
      (settlements || []).map((item) =>
        String(item.user_id)
      )
    );

    /*
    -------------------------------------------------------
    حساب صافي كل مستخدم
    -------------------------------------------------------

    Producer:
    + commission

    Consumer:
    - commission

    Weekly floor:
    - 1 JD
    -------------------------------------------------------
    */

    const netByUser = new Map<string, number>();

    for (const order of previousWeekOrders || []) {
      const commission = Number(
        order.commission_amount || 0
      );

      /*
      المنتج يحصل على العمولة
      */
      if (order.producer_id) {
        const userId = String(
          order.producer_id
        );

        netByUser.set(
          userId,
          Number(
            (
              (netByUser.get(userId) || 0) +
              commission
            ).toFixed(2)
          )
        );
      }

      /*
      المستهلك يدفع العمولة
      */
      if (order.consumer_id) {
        const userId = String(
          order.consumer_id
        );

        netByUser.set(
          userId,
          Number(
            (
              (netByUser.get(userId) || 0) -
              commission
            ).toFixed(2)
          )
        );
      }
    }

    /*
    -------------------------------------------------------
    خصم الأرضية الأسبوعية
    -------------------------------------------------------
    */

    for (const activity of weeklyActivity || []) {
      if (activity.floor_charged === true) {
        const userId = String(
          activity.user_id
        );

        netByUser.set(
          userId,
          Number(
            (
              (netByUser.get(userId) || 0) -
              1
            ).toFixed(2)
          )
        );
      }
    }

    /*
    -------------------------------------------------------
    تحميل المستخدمين
    -------------------------------------------------------
    */

    const {
      data: users,
      error: usersError,
    } = await supabaseAdmin
      .from("users")
      .select(
        "id, full_name, phone, role, balance, is_active"
      )
      .is("deleted_at", null)
      .eq("is_active", true)
      .neq("role", "admin")
      .order("full_name", {
        ascending: true,
      });

    if (usersError) {
      console.error(
        "SETTLEMENT USERS ERROR:",
        usersError
      );

      return NextResponse.json(
        {
          success: false,
          message: "تعذر تحميل المستخدمين",
          error: usersError.message,
        },
        { status: 500 }
      );
    }

    /*
    -------------------------------------------------------
    فقط من عليه دين في الأسبوع السابق
    ولم تتم تسويته
    -------------------------------------------------------
    */

    const unpaidUsers = [];

    for (const user of users || []) {
      const userId = String(user.id);

      const net = Number(
        netByUser.get(userId) || 0
      );

      if (
        net < 0 &&
        !settledUsers.has(userId)
      ) {
        unpaidUsers.push({
          id: user.id,
          full_name:
            user.full_name || "بدون اسم",
          phone: user.phone || "-",

          /*
          المستحق للعرض موجب
          بينما صافي الأسبوع نفسه سالب
          */
          amount: Number(
            Math.abs(net).toFixed(2)
          ),

          current_balance: Number(
            user.balance || 0
          ),

          /*
          نرسل القيمة الأصلية أيضًا
          لاستخدامها في التقرير
          */
          previous_week_net: Number(
            net.toFixed(2)
          ),

          balance_after_settlement: Number(
            (
              Number(user.balance || 0) +
              Math.abs(net)
            ).toFixed(2)
          ),

          settlement_status: "غير مسدد",
        });
      }
    }

    unpaidUsers.sort(
      (a, b) => b.amount - a.amount
    );

    const total = Number(
      unpaidUsers
        .reduce(
          (sum, user) =>
            sum + Number(user.amount || 0),
          0
        )
        .toFixed(2)
    );

    return NextResponse.json({
      success: true,

      previousWeek: {
        id: previousWeek.id,
        start_at: previousWeek.start_at,
        end_at: previousWeek.end_at,
      },

      users: unpaidUsers,

      total,
    });
  } catch (error) {
    console.error(
      "SETTLEMENT GET SERVER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "حدث خطأ في السيرفر",
      },
      { status: 500 }
    );
  }
}

/*
=========================================================
PATCH
تنفيذ التسوية فعليًا
=========================================================

القاعدة:

previousWeekNet = -4
currentBalance = +1

بعد التسوية:

newBalance = 1 - (-4)
newBalance = +5

مثال آخر:

previousWeekNet = -3
currentBalance = -4.25

newBalance = -4.25 - (-3)
newBalance = -1.25

أي أن مبلغ التسوية يضاف فعليًا
إلى رصيد المستخدم.
=========================================================
*/

export async function PATCH(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      message: "تم إيقاف التسوية الفردية القديمة. هذه الصفحة تعرض مستحقات الأسبوع المغلق فقط ولا تغيّر أرصدة المستخدمين.",
    },
    { status: 409 }
  );
}

/*
تفريغ قائمة المستحقات الحالية دون تعديل أرصدة أو حذف حركات مالية.
يسجل نهاية آخر أسبوع مغلق كنقطة بداية للنظام الجديد.
*/
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) {
      return NextResponse.json({ success: false, message: "غير مصرح بالدخول" }, { status: 403 });
    }

    const { data: latestClosedWeek, error: weekError } = await supabaseAdmin
      .from("weekly_periods")
      .select("id, end_at, is_closed")
      .eq("is_closed", true)
      .order("end_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (weekError) {
      return NextResponse.json({ success: false, message: "تعذر تحديد آخر أسبوع مغلق", error: weekError.message }, { status: 500 });
    }

    if (!latestClosedWeek) {
      return NextResponse.json({ success: false, message: "لا يوجد أسبوع مغلق لتفريغ قائمته" }, { status: 400 });
    }

    const { error: saveError } = await supabaseAdmin
      .from("settlement_queue_state")
      .upsert({
        id: 1,
        cleared_through_week_id: latestClosedWeek.id,
        cleared_through_end_at: latestClosedWeek.end_at,
        cleared_by: admin.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (saveError) {
      console.error("CLEAR SETTLEMENT QUEUE ERROR:", saveError);
      return NextResponse.json({
        success: false,
        message: "تعذر تفريغ القائمة. تأكد من تنفيذ ملف SQL المرفق.",
        error: saveError.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "تم تفريغ قائمة التسويات القديمة. لم يتم تغيير أي رصيد أو حذف أي حركة مالية. ستظهر القائمة مجددًا بعد إغلاق الأسبوع القادم.",
      clearedThroughWeekId: latestClosedWeek.id,
      clearedThroughEndAt: latestClosedWeek.end_at,
    });
  } catch (error) {
    console.error("CLEAR SETTLEMENT QUEUE SERVER ERROR:", error);
    return NextResponse.json({ success: false, message: "حدث خطأ أثناء تفريغ القائمة" }, { status: 500 });
  }
}
