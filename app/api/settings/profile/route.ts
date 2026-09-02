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

async function getAuthenticatedUser(
  request: NextRequest
) {
  const authHeader =
    request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader
    .replace("Bearer ", "")
    .trim();

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

export async function PATCH(
  request: NextRequest
) {
  try {
    const authUser =
      await getAuthenticatedUser(request);

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

    const fullName = String(
      body?.full_name || ""
    ).trim();

    if (!fullName) {
      return NextResponse.json(
        {
          success: false,
          message: "يرجى إدخال الاسم الكامل",
        },
        { status: 400 }
      );
    }

    /*
      مهم:
      هذا الـ API لا يستقبل ولا يعدّل رقم الهاتف
      نهائيًا.
    */

    const {
      data: updatedUser,
      error: updateError,
    } = await supabaseAdmin
      .from("users")
      .update({
        full_name: fullName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", authUser.id)
      .select(
        "id, full_name, phone, email, role, balance, is_active, created_at, updated_at"
      )
      .single();

    if (updateError) {
      console.error(
        "PROFILE UPDATE ERROR:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          message: "فشل تحديث الاسم",
          error: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم تحديث الاسم بنجاح",
      user: updatedUser,
    });
  } catch (error) {
    console.error(
      "PROFILE SERVER ERROR:",
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