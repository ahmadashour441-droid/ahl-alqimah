import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "غير مصرح" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const {
      data: authUser,
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !authUser.user) {
      return NextResponse.json(
        { error: "جلسة الدخول غير صالحة" },
        { status: 401 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", authUser.user.id)
      .maybeSingle();

    if (error) {
      console.error("USERS TABLE ERROR:", error);

      return NextResponse.json(
        {
          error: "تعذر قراءة بيانات المستخدم",
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    if (!user) {
      console.error(
        "USER NOT FOUND:",
        authUser.user.id
      );

      return NextResponse.json(
        {
          error: "لا توجد بيانات لهذا الحساب في جدول users",
          user_id: authUser.user.id,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user,
    });
  } catch (error) {
    console.error("ME API ERROR:", error);

    return NextResponse.json(
      {
        error: "حدث خطأ أثناء تحميل بيانات الحساب",
      },
      { status: 500 }
    );
  }
}