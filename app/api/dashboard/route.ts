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

    const authHeader = request.headers.get("authorization");

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

    const token = authHeader.substring(7);

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const {
      data: authData,
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          error: "جلسة الدخول غير صالحة",
        },
        {
          status: 401,
        }
      );
    }

    const authUser = authData.user;

    /* =====================================================
       Admin Client
    ===================================================== */

    const supabaseAdmin = createSupabaseAdmin();

    /* =====================================================
       بيانات المستخدم
    ===================================================== */

    const {
      data: user,
      error: userError,
    } = await supabaseAdmin
      .from("users")
      .select(
        "id, full_name, phone, role, balance, is_active"
      )
      .eq("id", authUser.id)
      .maybeSingle();

    if (userError) {
      console.error(
        "DASHBOARD USER ERROR:",
        userError
      );

      return NextResponse.json(
        {
          error: "تعذر تحميل بيانات المستخدم",
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
       الأسبوع الحالي
    ===================================================== */

    const {
      data: currentWeekId,
      error: weekIdError,
    } = await supabaseAdmin.rpc(
      "get_current_week"
    );

    if (weekIdError || !currentWeekId) {
      console.error(
        "CURRENT WEEK ERROR:",
        weekIdError
      );

      return NextResponse.json(
        {
          error: "تعذر تحديد الأسبوع الحالي",
          details: weekIdError?.message,
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
    } = await supabaseAdmin
      .from("weekly_periods")
      .select(
        "id, start_at, end_at, is_closed, closed_at"
      )
      .eq("id", currentWeekId)
      .maybeSingle();

    if (currentWeekError) {
      console.error(
        "CURRENT WEEK DATA ERROR:",
        currentWeekError
      );

      return NextResponse.json(
        {
          error: "تعذر تحميل بيانات الأسبوع الحالي",
          details: currentWeekError.message,
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
    } = await supabaseAdmin
      .from("weekly_user_activity")
      .select(`
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
      `)
      .eq("week_id", currentWeekId)
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (activityError) {
      console.error(
        "DASHBOARD ACTIVITY ERROR:",
        activityError
      );

      return NextResponse.json(
        {
          error: "تعذر تحميل نشاط الأسبوع",
          details: activityError.message,
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
      .eq("producer_id", authUser.id)
      .eq("processed_week_id", currentWeekId)
      .neq("status", "cancelled")
      .order("created_at", {
        ascending: false,
      });

    if (producedError) {
      console.error(
        "PRODUCED ORDERS ERROR:",
        producedError
      );

      return NextResponse.json(
        {
          error: "تعذر تحميل الطلبات المنتجة",
          details: producedError.message,
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
      .eq("consumer_id", authUser.id)
      .eq("processed_week_id", currentWeekId)
      .neq("status", "cancelled")
      .order("created_at", {
        ascending: false,
      });

    if (consumedError) {
      console.error(
        "CONSUMED ORDERS ERROR:",
        consumedError
      );

      return NextResponse.json(
        {
          error: "تعذر تحميل الطلبات المستهلكة",
          details: consumedError.message,
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
    } = await supabaseAdmin
      .from("transactions")
      .select(`
        id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        order_id,
        week_id,
        description,
        created_at
      `)
      .eq("user_id", authUser.id)
      .eq("week_id", currentWeekId)
      .order("created_at", {
        ascending: false,
      })
      .limit(20);

    if (transactionsError) {
      console.error(
        "DASHBOARD TRANSACTIONS ERROR:",
        transactionsError
      );

      return NextResponse.json(
        {
          error: "تعذر تحميل الحركات المالية",
          details: transactionsError.message,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       آخر أسبوع مغلق فعليًا

       مهم:
       نأخذ أحدث أسبوع مغلق حسب end_at.
       لا نعتمد على currentWeek.start_at.
    ===================================================== */

    const {
      data: previousWeek,
      error: previousWeekError,
    } = await supabaseAdmin
      .from("weekly_periods")
      .select(
        "id, start_at, end_at, is_closed, closed_at"
      )
      .eq("is_closed", true)
      .order("end_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (previousWeekError) {
      console.error(
        "PREVIOUS WEEK ERROR:",
        previousWeekError
      );

      return NextResponse.json(
        {
          error: "تعذر تحميل كشف الأسبوع السابق",
          details: previousWeekError.message,
        },
        {
          status: 500,
        }
      );
    }

    let previousWeekStatement = null;

    /* =====================================================
       بيانات آخر أسبوع مغلق
    ===================================================== */

    if (previousWeek) {
      /* ===================================================
         إنتاج المستخدم في آخر أسبوع مغلق
      =================================================== */

      const {
        data: previousProducedOrders,
        error: previousProducedError,
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
        .eq("producer_id", authUser.id)
        .eq(
          "processed_week_id",
          previousWeek.id
        )
        .eq(
          "financially_processed",
          true
        )
        .neq(
          "status",
          "cancelled"
        )
        .order("created_at", {
          ascending: false,
        });

      if (previousProducedError) {
        console.error(
          "PREVIOUS PRODUCED ORDERS ERROR:",
          previousProducedError
        );

        return NextResponse.json(
          {
            error:
              "تعذر تحميل إنتاج الأسبوع السابق",
            details:
              previousProducedError.message,
          },
          {
            status: 500,
          }
        );
      }

      /* ===================================================
         استهلاك المستخدم في آخر أسبوع مغلق
      =================================================== */

      const {
        data: previousConsumedOrders,
        error: previousConsumedError,
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
          authUser.id
        )
        .eq(
          "processed_week_id",
          previousWeek.id
        )
        .eq(
          "financially_processed",
          true
        )
        .neq(
          "status",
          "cancelled"
        )
        .order("created_at", {
          ascending: false,
        });

      if (previousConsumedError) {
        console.error(
          "PREVIOUS CONSUMED ORDERS ERROR:",
          previousConsumedError
        );

        return NextResponse.json(
          {
            error:
              "تعذر تحميل استهلاك الأسبوع السابق",
            details:
              previousConsumedError.message,
          },
          {
            status: 500,
          }
        );
      }

      /* ===================================================
         نشاط المستخدم في آخر أسبوع مغلق
      =================================================== */

      const {
        data: previousActivity,
        error: previousActivityError,
      } = await supabaseAdmin
        .from("weekly_user_activity")
        .select("floor_charged")
        .eq(
          "week_id",
          previousWeek.id
        )
        .eq(
          "user_id",
          authUser.id
        )
        .maybeSingle();

      if (previousActivityError) {
        console.error(
          "PREVIOUS ACTIVITY ERROR:",
          previousActivityError
        );

        return NextResponse.json(
          {
            error:
              "تعذر تحميل رسوم الأسبوع السابق",
            details:
              previousActivityError.message,
          },
          {
            status: 500,
          }
        );
      }

      /* ===================================================
         تجهيز الإنتاج
      =================================================== */

      const production = (
        previousProducedOrders || []
      ).map((order: any) => ({
        id: order.id,

        order_number:
          order.order_number,

        order_type:
          order.order_type,

        amount:
          Number(order.amount || 0),

        commission_rate:
          Number(
            order.commission_rate || 0
          ),

        commission_amount:
          Number(
            order.commission_amount || 0
          ),

        producer_name:
          user.full_name || null,

        consumer_name:
          order.consumer?.full_name ||
          null,

        created_at:
          order.created_at,

        notes:
          order.notes || null,
      }));

      /* ===================================================
         تجهيز الاستهلاك
      =================================================== */

      const consumption = (
        previousConsumedOrders || []
      ).map((order: any) => ({
        id: order.id,

        order_number:
          order.order_number,

        order_type:
          order.order_type,

        amount:
          Number(order.amount || 0),

        commission_rate:
          Number(
            order.commission_rate || 0
          ),

        commission_amount:
          Number(
            order.commission_amount || 0
          ),

        consumer_name:
          user.full_name || null,

        producer_name:
          order.producer?.full_name ||
          null,

        created_at:
          order.created_at,

        notes:
          order.notes || null,
      }));

      /* ===================================================
         حساب عمولة الإنتاج
      =================================================== */

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

      /* ===================================================
         حساب عمولة الاستهلاك
      =================================================== */

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

      /* ===================================================
         الأرضية الأسبوعية
      =================================================== */

      const weeklyFloor =
        previousActivity?.floor_charged
          ? 1
          : 0;

      /* ===================================================
         صافي الأسبوع
      =================================================== */

      const net =
        productionCommission -
        consumptionCommission -
        weeklyFloor;

      /* ===================================================
         تجهيز كشف الأسبوع

         مهم جدًا:
         هذه البنية مطابقة تمامًا
         لـ WeeklyStatement الموجودة
         في dashboard/page.tsx
      =================================================== */

      previousWeekStatement = {
        week: {
          id: previousWeek.id,

          start_at:
            previousWeek.start_at,

          end_at:
            previousWeek.end_at,

          is_closed:
            previousWeek.is_closed,

          closed_at:
            previousWeek.closed_at,
        },

        production,

        consumption,

        productionCommission,

        consumptionCommission,

        floor:
          weeklyFloor,

        net,
      };
    }

    /* =====================================================
       إحصائيات الأسبوع الحالي
    ===================================================== */

    const produced = activity
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

    const consumed = activity
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
       تجميع آخر الطلبات
    ===================================================== */

    const recentOrders = [
      ...(producedOrders || []).map(
        (order: any) => ({
          ...order,

          relation: "منتج",

          counterparty:
            order.consumer?.full_name ||
            null,
        })
      ),

      ...(consumedOrders || []).map(
        (order: any) => ({
          ...order,

          relation: "مستهلك",

          counterparty:
            order.producer?.full_name ||
            null,
        })
      ),
    ]
      .sort(
        (
          a: any,
          b: any
        ) =>
          new Date(
            b.created_at || 0
          ).getTime() -
          new Date(
            a.created_at || 0
          ).getTime()
      )
      .slice(0, 8);

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

      stats: {
        balance:
          Number(
            user.balance || 0
          ),

        producedTotal:
          produced.total,

        consumedTotal:
          consumed.total,

        producedCount:
          produced.count,

        consumedCount:
          consumed.count,

        totalOrders:
          totalOperations,
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

      /* آخر أسبوع مغلق */
      previousWeek:
        previousWeek || null,

      /* كشف آخر أسبوع مغلق */
      previousWeekStatement,

      recentOrders,
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