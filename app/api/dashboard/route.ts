import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function GET(request: Request) {
  try {
    /* =====================================================
       التحقق من جلسة المستخدم
    ===================================================== */

    const authHeader =
      request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "غير مصرح",
        },
        {
          status: 401,
        }
      );
    }

    const token =
      authHeader.substring(7);

    const supabaseAuth =
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env
          .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
      );

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAuth.auth.getUser(
        token
      );

    if (
      authError ||
      !authData.user
    ) {
      return NextResponse.json(
        {
          error:
            "جلسة الدخول غير صالحة",
        },
        {
          status: 401,
        }
      );
    }

    const authUser =
      authData.user;

    /* =====================================================
       Admin Client
    ===================================================== */

    const supabaseAdmin =
      createSupabaseAdmin();

    /* =====================================================
       بيانات المستخدم
    ===================================================== */

    const {
      data: user,
      error: userError,
    } =
      await supabaseAdmin
        .from("users")
        .select(
          "id, full_name, phone, role, balance, is_active"
        )
        .eq(
          "id",
          authUser.id
        )
        .maybeSingle();

    if (userError) {
      console.error(
        "DASHBOARD USER ERROR:",
        userError
      );

      return NextResponse.json(
        {
          error:
            "تعذر تحميل بيانات المستخدم",
          details:
            userError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          error:
            "المستخدم غير موجود",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       الأسبوع الحالي
    ===================================================== */

    const {
      data: currentWeekId,
      error: weekIdError,
    } =
      await supabaseAdmin.rpc(
        "get_current_week"
      );

    if (
      weekIdError ||
      !currentWeekId
    ) {
      console.error(
        "CURRENT WEEK ERROR:",
        weekIdError
      );

      return NextResponse.json(
        {
          error:
            "تعذر تحديد الأسبوع الحالي",
          details:
            weekIdError?.message,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       بيانات الأسبوع الحالي
    ===================================================== */

    const {
      data: currentWeek,
      error: currentWeekError,
    } =
      await supabaseAdmin
        .from("weekly_periods")
        .select(
          "id, start_at, end_at, is_closed, closed_at"
        )
        .eq(
          "id",
          currentWeekId
        )
        .maybeSingle();

    if (currentWeekError) {
      console.error(
        "CURRENT WEEK DATA ERROR:",
        currentWeekError
      );

      return NextResponse.json(
        {
          error:
            "تعذر تحميل بيانات الأسبوع الحالي",
          details:
            currentWeekError.message,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       نشاط المستخدم في الأسبوع الحالي
    ===================================================== */

    const {
      data: activity,
      error: activityError,
    } =
      await supabaseAdmin
        .from("weekly_user_activity")
        .select(
          `
          id,
          week_id,
          user_id,
          is_active,
          floor_charged,
          produced_total,
          consumed_total,
          produced_count,
          consumed_count,
          created_at,
          updated_at
        `
        )
        .eq(
          "week_id",
          currentWeekId
        )
        .eq(
          "user_id",
          authUser.id
        )
        .maybeSingle();

    if (activityError) {
      console.error(
        "DASHBOARD ACTIVITY ERROR:",
        activityError
      );

      return NextResponse.json(
        {
          error:
            "تعذر تحميل نشاط الأسبوع",
          details:
            activityError.message,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       الطلبات المنتجة في الأسبوع الحالي
    ===================================================== */

    const {
      data: producedOrders,
      error: producedError,
    } =
      await supabaseAdmin
        .from("orders")
        .select(
          `
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
        `
        )
        .eq(
          "producer_id",
          authUser.id
        )
        .eq(
          "processed_week_id",
          currentWeekId
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
        "PRODUCED ORDERS ERROR:",
        producedError
      );

      return NextResponse.json(
        {
          error:
            "تعذر تحميل الطلبات المنتجة",
          details:
            producedError.message,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       الطلبات المستهلكة في الأسبوع الحالي
    ===================================================== */

    const {
      data: consumedOrders,
      error: consumedError,
    } =
      await supabaseAdmin
        .from("orders")
        .select(
          `
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
        `
        )
        .eq(
          "consumer_id",
          authUser.id
        )
        .eq(
          "processed_week_id",
          currentWeekId
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
        "CONSUMED ORDERS ERROR:",
        consumedError
      );

      return NextResponse.json(
        {
          error:
            "تعذر تحميل الطلبات المستهلكة",
          details:
            consumedError.message,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       آخر المعاملات المالية للأسبوع الحالي
    ===================================================== */

    const {
      data: transactions,
      error: transactionsError,
    } =
      await supabaseAdmin
        .from("transactions")
        .select(
          `
          id,
          transaction_type,
          amount,
          balance_before,
          balance_after,
          order_id,
          week_id,
          description,
          created_at
        `
        )
        .eq(
          "user_id",
          authUser.id
        )
        .eq(
          "week_id",
          currentWeekId
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(20);

    if (transactionsError) {
      console.error(
        "DASHBOARD TRANSACTIONS ERROR:",
        transactionsError
      );

      return NextResponse.json(
        {
          error:
            "تعذر تحميل الحركات المالية",
          details:
            transactionsError.message,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       الإحصائيات
    ===================================================== */

    const produced =
      activity
        ? {
            total: Number(
              activity.produced_total || 0
            ),
            count: Number(
              activity.produced_count || 0
            ),
          }
        : {
            total: 0,
            count: 0,
          };

    const consumed =
      activity
        ? {
            total: Number(
              activity.consumed_total || 0
            ),
            count: Number(
              activity.consumed_count || 0
            ),
          }
        : {
            total: 0,
            count: 0,
          };

    const totalOperations =
      produced.count +
      consumed.count;

    /* =====================================================
       الرد النهائي
    ===================================================== */

    return NextResponse.json({
      success: true,

      user,

      currentWeek:
        currentWeek || null,

      activity:
        activity || {
          is_active: false,
          floor_charged: false,
          produced_total: 0,
          consumed_total: 0,
          produced_count: 0,
          consumed_count: 0,
        },

      statistics: {
        producedTotal:
          produced.total,

        consumedTotal:
          consumed.total,

        producedCount:
          produced.count,

        consumedCount:
          consumed.count,

        totalOperations,
      },

      producedOrders:
        producedOrders || [],

      consumedOrders:
        consumedOrders || [],

      transactions:
        transactions || [],
    });
  } catch (error) {
    console.error(
      "DASHBOARD API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ أثناء تحميل لوحة التحكم",
      },
      {
        status: 500,
      }
    );
  }
}