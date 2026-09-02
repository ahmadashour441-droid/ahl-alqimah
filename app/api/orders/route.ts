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
  supabaseSecretKey
);

export async function GET(
  request: NextRequest
) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (!authorization) {
      return NextResponse.json(
        {
          error:
            "غير مصرح. يرجى تسجيل الدخول.",
        },
        { status: 401 }
      );
    }

    const token =
      authorization.replace(
        "Bearer ",
        ""
      );

    if (!token) {
      return NextResponse.json(
        {
          error:
            "رمز الدخول غير موجود.",
        },
        { status: 401 }
      );
    }

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
      console.error(
        "AUTH ERROR:",
        authError
      );

      return NextResponse.json(
        {
          error:
            "جلسة الدخول غير صالحة.",
        },
        { status: 401 }
      );
    }

    const authUser =
      authData.user;

    const {
      data: currentUser,
      error: userError,
    } =
      await supabaseAdmin
        .from("users")
        .select(
          `
          id,
          full_name,
          phone,
          role,
          balance,
          is_active
        `
        )
        .eq(
          "id",
          authUser.id
        )
        .single();

    if (
      userError ||
      !currentUser
    ) {
      console.error(
        "USER ERROR:",
        userError
      );

      return NextResponse.json(
        {
          error:
            "تعذر العثور على بيانات الحساب.",
        },
        { status: 404 }
      );
    }

    if (
      !currentUser.is_active
    ) {
      return NextResponse.json(
        {
          error:
            "الحساب غير نشط.",
        },
        { status: 403 }
      );
    }

    /*
     * جلب الأسابيع
     */

    const {
      data: weeks,
      error: weeksError,
    } =
      await supabaseAdmin
        .from("weekly_periods")
        .select(
          `
          id,
          start_at,
          end_at,
          is_closed,
          closed_at,
          created_at
        `
        )
        .order(
          "start_at",
          {
            ascending: false,
          }
        );

    if (weeksError) {
      console.error(
        "WEEKS ERROR:",
        weeksError
      );

      return NextResponse.json(
        {
          error:
            weeksError.message ||
            "تعذر تحميل الأسابيع.",
        },
        { status: 500 }
      );
    }

    /*
     * جلب الطلبات الخاصة بالمستخدم
     *
     * نعتمد على processed_week_id
     * حتى يبقى الطلب مرتبطًا بالأسبوع
     * الذي تمت فيه العملية المالية.
     */

    const {
      data: orders,
      error: ordersError,
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
          status,
          created_at,
          producer_id,
          consumer_id,
          processed_week_id
        `
        )
        .or(
          `producer_id.eq.${currentUser.id},consumer_id.eq.${currentUser.id}`
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (ordersError) {
      console.error(
        "ORDERS DATABASE ERROR:",
        ordersError
      );

      return NextResponse.json(
        {
          error:
            ordersError.message ||
            "تعذر تحميل الطلبات.",
          details:
            ordersError,
        },
        { status: 500 }
      );
    }

    const orderList =
      orders || [];

    /*
     * جلب أسماء المستخدمين
     */

    const userIds =
      Array.from(
        new Set(
          orderList
            .flatMap(
              (order) => [
                order.producer_id,
                order.consumer_id,
              ]
            )
            .filter(
              (
                id
              ): id is string =>
                Boolean(id)
            )
        )
      );

    let users: User[] = [];

    if (
      userIds.length > 0
    ) {
      const {
        data: usersData,
        error: usersError,
      } =
        await supabaseAdmin
          .from("users")
          .select(
            "id, full_name"
          )
          .in(
            "id",
            userIds
          );

      if (usersError) {
        console.error(
          "USERS DATABASE ERROR:",
          usersError
        );

        return NextResponse.json(
          {
            error:
              usersError.message ||
              "تعذر تحميل أسماء المستخدمين.",
          },
          { status: 500 }
        );
      }

      users =
        usersData || [];
    }

    /*
     * تحديد الأسبوع الحالي
     */

    let currentWeekId:
      | string
      | null = null;

    const {
      data: currentWeekIdData,
      error: currentWeekError,
    } =
      await supabaseAdmin.rpc(
        "get_current_week"
      );

    if (!currentWeekError) {
      currentWeekId =
        currentWeekIdData;
    } else {
      console.error(
        "CURRENT WEEK ERROR:",
        currentWeekError
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: currentUser,
        orders: orderList,
        users,
        weeks:
          weeks || [],
        currentWeekId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "ORDERS API UNEXPECTED ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ غير متوقع أثناء تحميل الطلبات.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}

type User = {
  id: string;
  full_name: string;
};