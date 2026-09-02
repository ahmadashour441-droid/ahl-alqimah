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

async function getAuthenticatedUser(request: NextRequest) {
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

  return user;
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          message: "غير مصرح بالدخول",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const currentPassword = String(
      body?.currentPassword || ""
    );

    const newPassword = String(body?.newPassword || "");

    if (!currentPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "يرجى إدخال كلمة المرور الحالية",
        },
        { status: 400 }
      );
    }

    if (!newPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "يرجى إدخال كلمة المرور الجديدة",
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل",
        },
        { status: 400 }
      );
    }

    // جلب بيانات المستخدم لمعرفة البريد التقني
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("users")
        .select("email, phone")
        .eq("id", authUser.id)
        .single();

    if (profileError || !profile) {
      console.error("PROFILE FETCH ERROR:", profileError);

      return NextResponse.json(
        {
          success: false,
          message: "تعذر العثور على بيانات الحساب",
        },
        { status: 404 }
      );
    }

    const technicalEmail =
      profile.email || `${profile.phone}@captainsystem.com`;

    /*
      أولاً نتأكد من كلمة المرور الحالية
      عن طريق تسجيل دخول مؤقت.
    */
    const {
      data: loginData,
      error: loginError,
    } = await supabaseAuth.auth.signInWithPassword({
      email: technicalEmail,
      password: currentPassword,
    });

    if (loginError || !loginData.user) {
      return NextResponse.json(
        {
          success: false,
          message: "كلمة المرور الحالية غير صحيحة",
        },
        { status: 400 }
      );
    }

    /*
      بعد التأكد من كلمة المرور الحالية،
      نغير كلمة المرور في Supabase Auth.
    */
    const { error: updateAuthError } =
      await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        {
          password: newPassword,
        }
      );

    if (updateAuthError) {
      console.error(
        "AUTH PASSWORD UPDATE ERROR:",
        updateAuthError
      );

      return NextResponse.json(
        {
          success: false,
          message: "فشل تغيير كلمة المرور",
          error: updateAuthError.message,
        },
        { status: 500 }
      );
    }

    /*
      نحفظ نسخة إدارية من كلمة المرور في users
      لأن النظام الحالي يستخدم login_password.
    */
    const { error: profilePasswordError } =
      await supabaseAdmin
        .from("users")
        .update({
          login_password: newPassword,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authUser.id);

    if (profilePasswordError) {
      console.error(
        "LOGIN PASSWORD UPDATE ERROR:",
        profilePasswordError
      );

      return NextResponse.json({
        success: true,
        message:
          "تم تغيير كلمة المرور في تسجيل الدخول بنجاح",
      });
    }

    return NextResponse.json({
      success: true,
      message: "تم تغيير كلمة المرور بنجاح",
    });
  } catch (error) {
    console.error("PASSWORD SERVER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "حدث خطأ في السيرفر",
      },
      { status: 500 }
    );
  }
}