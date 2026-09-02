import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY!;

const supabaseAuth = createClient(
  supabaseUrl,
  supabasePublishableKey
);

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    /* =====================================================
       1. GET WEEK ID
    ===================================================== */

    const { id: weekId } =
      await context.params;

    if (!weekId) {
      return NextResponse.json(
        {
          error:
            "معرف الأسبوع غير موجود.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       2. GET AUTHORIZATION TOKEN
    ===================================================== */

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (!authorization) {
      return NextResponse.json(
        {
          error:
            "غير مصرح. يرجى تسجيل الدخول.",
        },
        {
          status: 401,
        }
      );
    }

    const token =
      authorization.replace(
        "Bearer ",
        ""
      ).trim();

    if (!token) {
      return NextResponse.json(
        {
          error:
            "رمز الدخول غير موجود.",
        },
        {
          status: 401,
        }
      );
    }

    /* =====================================================
       3. VERIFY SUPABASE USER
    ===================================================== */

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAuth.auth.getUser(
        token
      );

    if (
      authError ||
      !authData?.user
    ) {
      console.error(
        "WEEK DETAILS AUTH ERROR:",
        authError
      );

      return NextResponse.json(
        {
          error:
            "انتهت جلسة الدخول، يرجى تسجيل الدخول مرة أخرى.",
        },
        {
          status: 401,
        }
      );
    }

    const authUser =
      authData.user;

    /* =====================================================
       4. GET PUBLIC USER
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
        .single();

    if (
      userError ||
      !user
    ) {
      console.error(
        "WEEK DETAILS USER ERROR:",
        userError
      );

      return NextResponse.json(
        {
          error:
            "تعذر العثور على بيانات الحساب.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       5. CHECK ACCOUNT STATUS
    ===================================================== */

    if (!user.is_active) {
      return NextResponse.json(
        {
          error:
            "حسابك موقوف حالياً.",
        },
        {
          status: 403,
        }
      );
    }

    /* =====================================================
       6. GET WEEK
    ===================================================== */

    const {
      data: week,
      error: weekError,
    } =
      await supabaseAdmin
        .from("weekly_periods")
        .select(
          "id, start_at, end_at, is_closed, closed_at"
        )
        .eq(
          "id",
          weekId
        )
        .single();

    if (
      weekError ||
      !week
    ) {
      console.error(
        "WEEK DETAILS WEEK ERROR:",
        weekError
      );

      return NextResponse.json(
        {
          error:
            "الأسبوع المطلوب غير موجود.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       7. GET USER WEEKLY ACTIVITY
    ===================================================== */

    const {
      data: activityData,
      error: activityError,
    } =
      await supabaseAdmin
        .from("weekly_user_activity")
        .select(
          "is_active, floor_charged, produced_total, consumed_total, produced_count, consumed_count"
        )
        .eq(
          "week_id",
          weekId
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (activityError) {
      console.error(
        "WEEK ACTIVITY ERROR:",
        activityError
      );

      return NextResponse.json(
        {
          error:
            "تعذر تحميل نشاط الأسبوع.",
        },
        {
          status: 500,
        }
      );
    }

    const activity =
      activityData || {
        is_active: false,
        floor_charged: false,
        produced_total: 0,
        consumed_total: 0,
        produced_count: 0,
        consumed_count: 0,
      };

    /* =====================================================
       8. GET PRODUCED ORDERS
       
       IMPORTANT:
       We use processed_week_id instead of created_at.
       This makes the order belong to the financial week
       in which it was actually processed.
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
          created_at
          `
        )
        .eq(
          "producer_id",
          user.id
        )
        .eq(
          "processed_week_id",
          weekId
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
            "تعذر تحميل الأوردرات المنتجة.",
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       9. GET CONSUMED ORDERS
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
          created_at
          `
        )
        .eq(
          "consumer_id",
          user.id
        )
        .eq(
          "processed_week_id",
          weekId
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
            "تعذر تحميل الأوردرات المستهلكة.",
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       10. RETURN DATA
    ===================================================== */

    return NextResponse.json(
      {
        user,

        week,

        activity,

        producedOrders:
          producedOrders || [],

        consumedOrders:
          consumedOrders || [],
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "WEEK DETAILS UNEXPECTED ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ غير متوقع أثناء تحميل تفاصيل الأسبوع.",
      },
      {
        status: 500,
      }
    );
  }
}