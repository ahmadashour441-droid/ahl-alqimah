import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const userId = String(body?.user_id || "");
    const newPassword = String(body?.login_password || "");

    if (!userId || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "بيانات المزامنة ناقصة",
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
        },
        { status: 400 }
      );
    }

    const { data: authUser, error: authUserError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (authUserError || !authUser?.user) {
      console.error("AUTH USER FETCH ERROR:", authUserError);

      return NextResponse.json(
        {
          success: false,
          message: "المستخدم غير موجود في Auth",
        },
        { status: 404 }
      );
    }

    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          password: newPassword,
        }
      );

    if (updateError) {
      console.error("AUTH PASSWORD UPDATE ERROR:", updateError);

      return NextResponse.json(
        {
          success: false,
          message: "فشل تحديث كلمة مرور Auth",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تمت مزامنة كلمة المرور مع Auth بنجاح",
    });
  } catch (error) {
    console.error("SYNC AUTH PASSWORD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "حدث خطأ أثناء المزامنة",
      },
      { status: 500 }
    );
  }
}
