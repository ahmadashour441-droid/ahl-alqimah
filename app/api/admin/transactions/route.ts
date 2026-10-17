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

  const { data: adminUser, error: adminError } =
    await supabaseAdmin
      .from("users")
      .select("id, full_name, phone, role, is_active")
      .eq("id", authUser.id)
      .maybeSingle();

  if (adminError || !adminUser) {
    return {
      error: NextResponse.json(
        { error: "تعذر التحقق من بيانات المستخدم" },
        { status: 403 }
      ),
    };
  }

  if (
    adminUser.role !== "admin" ||
    adminUser.is_active !== true
  ) {
    return {
      error: NextResponse.json(
        { error: "هذه الصفحة للأدمن فقط" },
        { status: 403 }
      ),
    };
  }

  return {
    authUser,
    adminUser,
    supabaseAdmin,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await authenticateAdmin(request);

    if (auth.error) {
      return auth.error;
    }

    const { supabaseAdmin } = auth;

    const url = new URL(request.url);

    const weekId = url.searchParams.get("weekId");
    const showAll =
      url.searchParams.get("all") === "true";

    const type =
      url.searchParams.get("type") || "all";

    const userId =
      url.searchParams.get("userId") || "all";

    const search =
      url.searchParams.get("search")?.trim() || "";

    const limitParam =
      Number(url.searchParams.get("limit")) || 500;

    const limit = Math.min(
      Math.max(limitParam, 1),
      1000
    );

    // =========================================
    // تحديد الأسبوع المطلوب
    // =========================================

    let selectedWeek: any = null;

    if (!showAll) {
      if (weekId) {
        const { data: week, error: weekError } =
          await supabaseAdmin
            .from("weekly_periods")
            .select("*")
            .eq("id", weekId)
            .maybeSingle();

        if (weekError) {
          console.error(
            "SELECTED WEEK ERROR:",
            weekError
          );

          return NextResponse.json(
            {
              error: "تعذر تحميل الأسبوع المحدد",
              details: weekError.message,
            },
            { status: 500 }
          );
        }

        if (!week) {
          return NextResponse.json(
            {
              error: "الأسبوع المحدد غير موجود",
            },
            { status: 404 }
          );
        }

        selectedWeek = week;
      } else {
        // الأسبوع الحالي
        const { data: currentWeekId, error: weekRpcError } =
          await supabaseAdmin.rpc(
            "get_current_week"
          );

        if (weekRpcError) {
          console.error(
            "CURRENT WEEK ERROR:",
            weekRpcError
          );

          return NextResponse.json(
            {
              error: "تعذر تحديد الأسبوع الحالي",
              details: weekRpcError.message,
            },
            { status: 500 }
          );
        }

        const { data: currentWeek, error: currentWeekError } =
          await supabaseAdmin
            .from("weekly_periods")
            .select("*")
            .eq("id", currentWeekId)
            .maybeSingle();

        if (currentWeekError) {
          console.error(
            "CURRENT WEEK SELECT ERROR:",
            currentWeekError
          );

          return NextResponse.json(
            {
              error: "تعذر تحميل الأسبوع الحالي",
              details: currentWeekError.message,
            },
            { status: 500 }
          );
        }

        selectedWeek = currentWeek;
      }
    }

    // =========================================
    // جلب الحركات
    // =========================================

    let transactionsQuery = supabaseAdmin
      .from("transactions")
      .select("*")
      .neq("transaction_type", "topup")
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);

    if (!showAll && selectedWeek) {
      // نعتمد على تاريخ الحركة حتى تظهر الحركات التي
      // لا تحتوي على week_id، مثل السحب، بشكل صحيح.
      transactionsQuery = transactionsQuery
        .gte(
          "created_at",
          selectedWeek.start_at
        )
        .lt(
          "created_at",
          selectedWeek.end_at
        );
    }

    if (type !== "all") {
      transactionsQuery =
        transactionsQuery.eq(
          "transaction_type",
          type
        );
    }

    if (userId !== "all") {
      transactionsQuery =
        transactionsQuery.eq(
          "user_id",
          userId
        );
    }

    const {
      data: transactions,
      error: transactionsError,
    } = await transactionsQuery;

    if (transactionsError) {
      console.error(
        "TRANSACTIONS GET ERROR:",
        transactionsError
      );

      return NextResponse.json(
        {
          error: "تعذر تحميل الحركات المالية",
          details: transactionsError.message,
        },
        { status: 500 }
      );
    }

    // =========================================
    // جلب المستخدمين المرتبطين بالحركات
    // =========================================

    const userIds = [
      ...new Set(
        (transactions || [])
          .map(
            (transaction) =>
              transaction.user_id
          )
          .filter(Boolean)
      ),
    ];

    let users: any[] = [];

    if (userIds.length > 0) {
      const {
        data: usersData,
        error: usersError,
      } = await supabaseAdmin
        .from("users")
        .select(
          "id, full_name, phone, role, balance, is_active"
        )
        .in("id", userIds);

      if (usersError) {
        console.error(
          "TRANSACTION USERS ERROR:",
          usersError
        );

        return NextResponse.json(
          {
            error:
              "تعذر تحميل بيانات المستخدمين",
            details: usersError.message,
          },
          { status: 500 }
        );
      }

      users = usersData || [];
    }

    const usersMap = new Map(
      users.map((user) => [
        user.id,
        user,
      ])
    );

    // =========================================
    // إضافة بيانات المستخدم للحركات
    // =========================================

    let rows = (transactions || []).map(
      (transaction) => ({
        ...transaction,
        user:
          usersMap.get(
            transaction.user_id
          ) || null,
      })
    );

    // =========================================
    // البحث
    // =========================================

    if (search) {
      const normalizedSearch =
        search.toLowerCase();

      rows = rows.filter(
        (transaction) => {
          const userName =
            transaction.user?.full_name ||
            "";

          const phone =
            transaction.user?.phone ||
            "";

          const description =
            transaction.description ||
            "";

          const orderId =
            transaction.order_id ||
            "";

          const transactionId =
            transaction.id ||
            "";

          return (
            String(userName)
              .toLowerCase()
              .includes(normalizedSearch) ||
            String(phone)
              .toLowerCase()
              .includes(normalizedSearch) ||
            String(description)
              .toLowerCase()
              .includes(normalizedSearch) ||
            String(orderId)
              .toLowerCase()
              .includes(normalizedSearch) ||
            String(transactionId)
              .toLowerCase()
              .includes(normalizedSearch)
          );
        }
      );
    }

    // =========================================
    // الإحصائيات
    // =========================================

    const totalTransactions =
      rows.length;

    const positiveTransactions =
      rows.filter(
        (transaction) =>
          Number(transaction.amount) > 0
      );

    const negativeTransactions =
      rows.filter(
        (transaction) =>
          Number(transaction.amount) < 0
      );

    const totalPositive =
      positiveTransactions.reduce(
        (sum, transaction) =>
          sum +
          Number(transaction.amount || 0),
        0
      );

    const totalNegative =
      negativeTransactions.reduce(
        (sum, transaction) =>
          sum +
          Math.abs(
            Number(
              transaction.amount || 0
            )
          ),
        0
      );

    const typeStats: Record<
      string,
      number
    > = {};

    rows.forEach((transaction) => {
      const transactionType =
        transaction.transaction_type;

      typeStats[transactionType] =
        (typeStats[transactionType] || 0) +
        1;
    });

    return NextResponse.json({
      success: true,

      selectedWeek,

      mode: showAll
        ? "all"
        : "week",

      transactions: rows,

      stats: {
        totalTransactions,
        totalPositive,
        totalNegative,
        typeStats,
      },
    });
  } catch (error) {
    console.error(
      "TRANSACTIONS API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ أثناء تحميل الحركات المالية",
      },
      { status: 500 }
    );
  }
}