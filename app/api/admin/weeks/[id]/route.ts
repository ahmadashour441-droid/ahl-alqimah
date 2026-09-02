import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

async function authenticateAdmin(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: "غير مصرح" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.substring(7);

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const {
    data: { user: authUser },
    error: authError,
  } = await supabaseAuth.auth.getUser(token);

  if (authError || !authUser) {
    return {
      error: NextResponse.json(
        { error: "جلسة الدخول غير صالحة" },
        { status: 401 }
      ),
    };
  }

  const supabaseAdmin = createSupabaseAdmin();

  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, full_name, phone, role")
    .eq("id", authUser.id)
    .maybeSingle();

  if (userError || !user) {
    return {
      error: NextResponse.json(
        { error: "تعذر التحقق من بيانات المستخدم" },
        { status: 403 }
      ),
    };
  }

  if (user.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "هذه الصفحة للأدمن فقط" },
        { status: 403 }
      ),
    };
  }

  return {
    supabaseAdmin,
  };
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const auth = await authenticateAdmin(request);

    if (auth.error) {
      return auth.error;
    }

    const { supabaseAdmin } = auth;

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "معرف الأسبوع غير موجود" },
        { status: 400 }
      );
    }

    // =========================================
    // بيانات الأسبوع
    // =========================================

    const { data: week, error: weekError } =
      await supabaseAdmin
        .from("weekly_periods")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (weekError) {
      console.error("WEEK DETAILS ERROR:", weekError);

      return NextResponse.json(
        {
          error: "تعذر تحميل بيانات الأسبوع",
          details: weekError.message,
        },
        { status: 500 }
      );
    }

    if (!week) {
      return NextResponse.json(
        { error: "الأسبوع غير موجود" },
        { status: 404 }
      );
    }

    // =========================================
    // إحصائيات المستخدمين في الأسبوع
    // =========================================

    const { data: activity, error: activityError } =
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
        .eq("week_id", id)
        .order("produced_total", { ascending: false });

    if (activityError) {
      console.error(
        "WEEK ACTIVITY ERROR:",
        activityError
      );

      return NextResponse.json(
        {
          error: "تعذر تحميل إحصائيات المستخدمين",
          details: activityError.message,
        },
        { status: 500 }
      );
    }

    // =========================================
    // جلب بيانات المستخدمين المرتبطين بالأسبوع
    // =========================================

    const userIds = [
      ...new Set(
        (activity || [])
          .map((item) => item.user_id)
          .filter(Boolean)
      ),
    ];

    let users: any[] = [];

    if (userIds.length > 0) {
      const { data: usersData, error: usersError } =
        await supabaseAdmin
          .from("users")
          .select(
            "id, full_name, phone, role, balance, is_active"
          )
          .in("id", userIds);

      if (usersError) {
        console.error(
          "WEEK USERS ERROR:",
          usersError
        );

        return NextResponse.json(
          {
            error: "تعذر تحميل بيانات المستخدمين",
            details: usersError.message,
          },
          { status: 500 }
        );
      }

      users = usersData || [];
    }

    const usersMap = new Map(
      users.map((user) => [user.id, user])
    );

    const userActivity = (activity || []).map(
      (item) => ({
        ...item,
        user: usersMap.get(item.user_id) || null,
      })
    );

    // =========================================
    // الطلبات الخاصة بالأسبوع
    // =========================================

    const { data: orders, error: ordersError } =
      await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("processed_week_id", id)
        .order("created_at", { ascending: false });

    if (ordersError) {
      console.error(
        "WEEK ORDERS ERROR:",
        ordersError
      );

      return NextResponse.json(
        {
          error: "تعذر تحميل طلبات الأسبوع",
          details: ordersError.message,
        },
        { status: 500 }
      );
    }

    // =========================================
    // المعاملات المالية الخاصة بالأسبوع
    // =========================================

    const { data: transactions, error: transactionsError } =
      await supabaseAdmin
        .from("transactions")
        .select("*")
        .eq("week_id", id)
        .order("created_at", { ascending: false });

    if (transactionsError) {
      console.error(
        "WEEK TRANSACTIONS ERROR:",
        transactionsError
      );

      return NextResponse.json(
        {
          error: "تعذر تحميل المعاملات المالية",
          details: transactionsError.message,
        },
        { status: 500 }
      );
    }

    // =========================================
    // إحصائيات سريعة
    // =========================================

    const activeUsers = userActivity.filter(
      (item) => item.is_active
    ).length;

    const totalProduced = userActivity.reduce(
      (sum, item) =>
        sum + Number(item.produced_total || 0),
      0
    );

    const totalConsumed = userActivity.reduce(
      (sum, item) =>
        sum + Number(item.consumed_total || 0),
      0
    );

    const producedOrders = userActivity.reduce(
      (sum, item) =>
        sum + Number(item.produced_count || 0),
      0
    );

    const consumedOrders = userActivity.reduce(
      (sum, item) =>
        sum + Number(item.consumed_count || 0),
      0
    );

    const floorChargedUsers = userActivity.filter(
      (item) => item.floor_charged
    ).length;

    return NextResponse.json({
      success: true,

      week,

      stats: {
        activeUsers,
        totalUsers: userActivity.length,
        totalProduced,
        totalConsumed,
        producedOrders,
        consumedOrders,
        floorChargedUsers,
        ordersCount: orders?.length || 0,
        transactionsCount:
          transactions?.length || 0,
      },

      users: userActivity,

      orders: orders || [],

      transactions: transactions || [],
    });
  } catch (error) {
    console.error(
      "WEEK DETAILS API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ أثناء تحميل تفاصيل الأسبوع",
      },
      { status: 500 }
    );
  }
}