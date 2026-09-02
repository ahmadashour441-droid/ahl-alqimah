import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select(
        "id, full_name, phone, email, role, balance, is_active, login_password, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      users: data || [],
    });
  } catch (error) {
    console.error("LOAD USERS ERROR:", error);

    return NextResponse.json(
      { error: "تعذر تحميل المستخدمين" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      full_name,
      phone,
      password,
      role = "user",
    } = body;

    if (!full_name || !phone || !password) {
      return NextResponse.json(
        {
          error: "الاسم ورقم الهاتف وكلمة المرور مطلوبة",
        },
        { status: 400 }
      );
    }

    if (!["user", "admin"].includes(role)) {
      return NextResponse.json(
        {
          error: "نوع المستخدم غير صحيح",
        },
        { status: 400 }
      );
    }

    const cleanPhone = String(phone)
      .replace(/\s+/g, "")
      .trim();

    if (!/^07\d{8}$/.test(cleanPhone)) {
      return NextResponse.json(
        {
          error: "رقم الهاتف يجب أن يكون بصيغة 079xxxxxxx",
        },
        { status: 400 }
      );
    }

    if (String(password).length < 6) {
      return NextResponse.json(
        {
          error: "كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل",
        },
        { status: 400 }
      );
    }

    const email = `${cleanPhone}@captainsystem.com`;

    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          error:
            authError?.message ||
            "تعذر إنشاء حساب تسجيل الدخول",
        },
        { status: 500 }
      );
    }

    const { error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authData.user.id,
        full_name: String(full_name).trim(),
        phone: cleanPhone,
        email,
        role,
        balance: 0,
        is_active: true,
        login_password: String(password),
      });

    if (userError) {
      await supabaseAdmin.auth.admin.deleteUser(
        authData.user.id
      );

      return NextResponse.json(
        {
          error: userError.message,
          details: userError.details,
          hint: userError.hint,
          code: userError.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم إنشاء المستخدم بنجاح",
      user: {
        id: authData.user.id,
        full_name: String(full_name).trim(),
        phone: cleanPhone,
        role,
      },
    });
  } catch (error) {
    console.error("CREATE USER ERROR:", error);

    return NextResponse.json(
      {
        error: "حدث خطأ غير متوقع أثناء إنشاء المستخدم",
      },
      { status: 500 }
    );
  }
}