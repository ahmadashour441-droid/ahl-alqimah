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

export async function GET(
  request: NextRequest
) {
  try {
    /* =====================================================
       1. GET AUTHORIZATION TOKEN
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
       2. VERIFY SUPABASE SESSION
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
        "WEEKS AUTH ERROR:",
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
       3. GET PUBLIC USER
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
        "WEEKS USER ERROR:",
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
       4. CHECK ACCOUNT STATUS
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
       5. GET CURRENT WEEK
    ===================================================== */

    const {
      data: currentWeekId,
      error: currentWeekError,
    } =
      await supabaseAdmin.rpc(
        "get_current_week"
      );

    if (
      currentWeekError ||
      !currentWeekId
    ) {
      console.error(
        "GET CURRENT WEEK ERROR:",
        currentWeekError
      );

      return NextResponse.json(
        {
          error:
            "تعذر تحديد الأسبوع الحالي.",
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       6. GET CURRENT WEEK DATA
    ===================================================== */

    const {
      data: currentWeek,
      error: currentWeekDataError,
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
        .single();

    if (
      currentWeekDataError ||
      !currentWeek
    ) {
      console.error(
        "CURRENT WEEK DATA ERROR:",
        currentWeekDataError
      );

      return NextResponse.json(
        {
          error:
            "تعذر تحميل بيانات الأسبوع الحالي.",
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       7. GET ALL WEEKS
       
       IMPORTANT:
       We DO NOT delete old weeks.
       They remain as historical archive.
    ===================================================== */

    const {
      data: weeks,
      error: weeksError,
    } =
      await supabaseAdmin
        .from("weekly_periods")
        .select(
          "id, start_at, end_at, is_closed, closed_at"
        )
        .order(
          "start_at",
          {
            ascending: false,
          }
        );

    if (weeksError) {
      console.error(
        "GET WEEKS ERROR:",
        weeksError
      );

      return NextResponse.json(
        {
          error:
            "تعذر تحميل سجل الأسابيع.",
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       8. RETURN RESULT
    ===================================================== */

    return NextResponse.json(
      {
        user,
        currentWeek,
        weeks: weeks || [],
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
      "WEEKS API UNEXPECTED ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ غير متوقع أثناء تحميل الأسابيع.",
      },
      {
        status: 500,
      }
    );
  }
}