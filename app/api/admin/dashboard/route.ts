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
        "id, full_name, phone, email, role, balance, is_active"
      )
      .eq("id", user.id)
      .eq("role", "admin")
      .eq("is_active", true)
      .single();

  if (adminError || !admin) {
    return null;
  }

  return admin;
}

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
     * =====================================================
     * جلب جميع الحسابات
     *
     * مهم:
     * الأرصدة تشمل USER + ADMIN
     * لأن الرصيد هو الرصيد الحالي الحقيقي للحساب.
     * =====================================================
     */

    const {
      data: allUsers,
      error: usersError,
    } = await supabaseAdmin
      .from("users")
      .select(
        "id, full_name, phone, email, role, balance, is_active, created_at"
      )
      .order("created_at", {
        ascending: false,
      });

    if (usersError) {
      console.error(
        "ADMIN DASHBOARD USERS ERROR:",
        usersError
      );

      return NextResponse.json(
        {
          success: false,
          message: "فشل تحميل المستخدمين",
          error: usersError.message,
        },
        { status: 500 }
      );
    }

    const accounts = (allUsers ?? []).map(
      (user) => ({
        ...user,
        balance: Number(user.balance || 0),
      })
    );

    /*
     * =====================================================
     * المستخدمون العاديون فقط
     *
     * نستخدمهم لإحصائية "إجمالي المستخدمين".
     * =====================================================
     */

    const normalUsers = accounts.filter(
      (user) => user.role === "user"
    );

    /*
     * =====================================================
     * الأرصدة
     *
     * هنا لا نستبعد الأدمن.
     *
     * أي حساب عنده balance:
     * موجب -> positive
     * سالب -> negative
     * صفر -> zero
     * =====================================================
     */

    const positiveUsers = accounts.filter(
      (user) => user.balance > 0
    );

    const negativeUsers = accounts.filter(
      (user) => user.balance < 0
    );

    const zeroUsers = accounts.filter(
      (user) => user.balance === 0
    );

    /*
     * مجموع الأرصدة الموجبة
     */

    const positiveBalance =
      positiveUsers.reduce(
        (total, user) =>
          total + user.balance,
        0
      );

    /*
     * مجموع الأرصدة السالبة
     *
     * القيمة ستبقى سالبة.
     *
     * مثال:
     * -2 + -4 = -6
     */

    const negativeBalance =
      negativeUsers.reduce(
        (total, user) =>
          total + user.balance,
        0
      );

    /*
     * صافي جميع الأرصدة الحالية
     *
     * مثال:
     *
     * الموجب = 10
     * السالب = -3
     *
     * الصافي = 7
     */

    const totalBalance =
      positiveBalance + negativeBalance;

    /*
     * =====================================================
     * إحصائيات المستخدمين
     * =====================================================
     */

    const totalUsers =
      normalUsers.length;

    const activeUsers =
      normalUsers.filter(
        (user) => user.is_active === true
      ).length;

    const inactiveUsers =
      normalUsers.filter(
        (user) => user.is_active === false
      ).length;

    /*
     * =====================================================
     * الطلبات
     * =====================================================
     */

    const { count: totalOrders } =
      await supabaseAdmin
        .from("orders")
        .select("*", {
          count: "exact",
          head: true,
        });

    // Real last-7-days order activity, grouped by Jordan calendar day.
    const now = new Date();
    const since = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    const { data: recentOrderRows, error: recentOrdersError } =
      await supabaseAdmin
        .from("orders")
        .select("created_at")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });

    if (recentOrdersError) {
      console.error("ADMIN DASHBOARD WEEKLY ORDERS ERROR:", recentOrdersError);
    }

    const jordanDateKey = (value: Date) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Amman",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(value);

    const jordanLabel = (value: Date) =>
      new Intl.DateTimeFormat("ar-JO", {
        timeZone: "Asia/Amman",
        weekday: "short",
      }).format(value);

    const todayKey = jordanDateKey(now);
    const dailyMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dailyMap.set(jordanDateKey(day), 0);
    }

    for (const row of recentOrderRows ?? []) {
      const key = jordanDateKey(new Date(row.created_at));
      if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
    }

    const weeklyOrders = Array.from(dailyMap.entries()).map(([key, count]) => {
      const date = new Date(`${key}T12:00:00+03:00`);
      return { date: key, label: jordanLabel(date), count };
    });

    const totalOrdersToday = dailyMap.get(todayKey) || 0;

    const { count: activeOrders } =
      await supabaseAdmin
        .from("orders")
        .select("*", {
          count: "exact",
          head: true,
        })
        .neq("status", "cancelled");

    /*
     * =====================================================
     * طلبات السحب المعلقة
     * =====================================================
     */

    const {
      count: pendingWithdrawals,
    } = await supabaseAdmin
      .from("withdrawal_requests")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "pending");

    /*
     * =====================================================
     * إشعارات الأدمن غير المقروءة
     * =====================================================
     */

    const {
      count: unreadNotifications,
    } = await supabaseAdmin
      .from("notifications")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("user_id", admin.id)
      .eq("is_read", false);

    /*
     * =====================================================
     * الأسبوع الحالي
     * =====================================================
     */

    let currentWeek = null;

    const {
      data: currentWeekId,
      error: weekRpcError,
    } = await supabaseAdmin.rpc(
      "get_current_week"
    );

    if (!weekRpcError && currentWeekId) {
      const {
        data: week,
      } = await supabaseAdmin
        .from("weekly_periods")
        .select("*")
        .eq("id", currentWeekId)
        .maybeSingle();

      currentWeek = week;
    }

    /*
     * =====================================================
     * النتيجة النهائية
     * =====================================================
     */

    return NextResponse.json({
      success: true,

      admin,

      stats: {
        /*
         * المستخدمون العاديون فقط
         */
        totalUsers,
        activeUsers,
        inactiveUsers,

        /*
         * جميع الأرصدة
         * USER + ADMIN
         */
        totalBalance,

        positiveBalance,
        negativeBalance,

        positiveUsersCount:
          positiveUsers.length,

        negativeUsersCount:
          negativeUsers.length,

        zeroUsersCount:
          zeroUsers.length,

        totalOrders:
          totalOrdersToday,

        totalOrdersAllTime:
          totalOrders || 0,

        activeOrders:
          activeOrders || 0,


        pendingWithdrawals:
          pendingWithdrawals || 0,

        unreadNotifications:
          unreadNotifications || 0,
      },

      /*
       * قوائم الأرصدة
       *
       * تشمل جميع الحسابات
       */
      balances: {
        positive: positiveUsers,
        negative: negativeUsers,
        zero: zeroUsers,
      },

      /*
       * جميع المستخدمين العاديين
       */
      users: normalUsers,

      currentWeek,
      weeklyOrders,
    });
  } catch (error) {
    console.error(
      "ADMIN DASHBOARD SERVER ERROR:",
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