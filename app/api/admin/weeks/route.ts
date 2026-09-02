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

  const { data: user, error: userError } =
    await supabaseAdmin
      .from("users")
      .select("id, full_name, phone, role, is_active")
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

  if (
    user.role !== "admin" ||
    user.is_active !== true
  ) {
    return {
      error: NextResponse.json(
        { error: "هذه العملية للأدمن فقط" },
        { status: 403 }
      ),
    };
  }

  return {
    authUser,
    user,
    supabaseAdmin,
  };
}

/* =========================================
   GET
   عرض جميع الأسابيع
========================================= */

export async function GET(request: Request) {
  try {
    const auth = await authenticateAdmin(request);

    if (auth.error) {
      return auth.error;
    }

    const { supabaseAdmin } = auth;

    const { data: weeks, error } =
      await supabaseAdmin
        .from("weekly_periods")
        .select("*")
        .order("start_at", {
          ascending: false,
        });

    if (error) {
      console.error(
        "WEEKS GET ERROR:",
        error
      );

      return NextResponse.json(
        {
          error: "تعذر تحميل الأسابيع",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      weeks: weeks || [],
    });
  } catch (error) {
    console.error(
      "WEEKS GET API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ أثناء تحميل الأسابيع",
      },
      { status: 500 }
    );
  }
}

/* =========================================
   POST
   إغلاق الأسبوع الحالي
========================================= */

export async function POST(request: Request) {
  try {
    const auth = await authenticateAdmin(request);

    if (auth.error) {
      return auth.error;
    }

    const {
      authUser,
      supabaseAdmin,
    } = auth;

    // =====================================
    // استدعاء دالة إغلاق الأسبوع
    // مع إرسال ID الأدمن
    // =====================================

    const { data, error } =
      await supabaseAdmin.rpc(
        "close_current_week",
        {
          p_admin_id: authUser.id,
        }
      );

    if (error) {
      console.error(
        "CLOSE WEEK ERROR:",
        error
      );

      return NextResponse.json(
        {
          error: "تعذر إغلاق الأسبوع",
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    // =====================================
    // إشعار للأدمن
    // =====================================

    const { error: notificationError } =
      await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: authUser.id,
          title: "تم إغلاق الأسبوع",
          message:
            "تم إغلاق الأسبوع الحالي وإنشاء الأسبوع الجديد بنجاح. أرصدة المستخدمين لم تتغير.",
          type: "system",
          is_read: false,
        });

    if (notificationError) {
      console.error(
        "CLOSE WEEK NOTIFICATION ERROR:",
        notificationError
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "تم إغلاق الأسبوع وإنشاء الأسبوع الجديد بنجاح. أرصدة المستخدمين لم تتغير.",
      closedWeek: data,
    });
  } catch (error) {
    console.error(
      "CLOSE WEEK API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ أثناء إغلاق الأسبوع",
      },
      { status: 500 }
    );
  }
}