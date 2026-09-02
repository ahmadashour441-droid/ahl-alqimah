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

async function authenticateAdmin(request: NextRequest) {
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
    error: authError,
  } = await supabaseAuth.auth.getUser(token);

  if (authError || !user) {
    return null;
  }

  const { data: admin, error: adminError } = await supabaseAdmin
    .from("users")
    .select(
      "id, full_name, phone, email, role, balance, is_active, created_at, updated_at"
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

/* =========================
   GET
   جلب إعدادات وبيانات الأدمن
========================= */

export async function GET(request: NextRequest) {
  try {
    const admin = await authenticateAdmin(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "غير مصرح بالدخول",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        full_name: admin.full_name,
        phone: admin.phone,
        email: admin.email,
        role: admin.role,
        balance: Number(admin.balance || 0),
        is_active: admin.is_active,
        created_at: admin.created_at,
        updated_at: admin.updated_at,
      },
    });
  } catch (error) {
    console.error("ADMIN SETTINGS GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "حدث خطأ في السيرفر",
      },
      { status: 500 }
    );
  }
}

/* =========================
   PATCH
   تحديث بيانات الأدمن
========================= */

export async function PATCH(request: NextRequest) {
  try {
    const admin = await authenticateAdmin(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "غير مصرح بالدخول",
        },
        { status: 403 }
      );
    }

    let body: {
      full_name?: string;
      email?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "بيانات الطلب غير صحيحة",
        },
        { status: 400 }
      );
    }

    const fullName =
      typeof body.full_name === "string"
        ? body.full_name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim()
        : "";

    if (!fullName) {
      return NextResponse.json(
        {
          success: false,
          message: "الاسم مطلوب",
        },
        { status: 400 }
      );
    }

    if (email && !email.includes("@")) {
      return NextResponse.json(
        {
          success: false,
          message: "البريد الإلكتروني غير صحيح",
        },
        { status: 400 }
      );
    }

    const updateData: {
      full_name: string;
      email?: string;
      updated_at: string;
    } = {
      full_name: fullName,
      updated_at: new Date().toISOString(),
    };

    if (email) {
      updateData.email = email;
    }

    const { data: updatedAdmin, error: updateError } =
      await supabaseAdmin
        .from("users")
        .update(updateData)
        .eq("id", admin.id)
        .select(
          "id, full_name, phone, email, role, balance, is_active, created_at, updated_at"
        )
        .single();

    if (updateError) {
      console.error(
        "ADMIN SETTINGS UPDATE ERROR:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          message: "فشل تحديث بيانات الحساب",
          error: updateError.message,
        },
        { status: 500 }
      );
    }

    /*
     * إذا تم تغيير البريد الإلكتروني،
     * نحدّث البريد في Supabase Auth أيضًا.
     */
    if (
      email &&
      email !== admin.email
    ) {
      const { error: authUpdateError } =
        await supabaseAdmin.auth.admin.updateUserById(
          admin.id,
          {
            email,
            email_confirm: true,
          }
        );

      if (authUpdateError) {
        console.error(
          "ADMIN AUTH EMAIL UPDATE ERROR:",
          authUpdateError
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "تم تحديث البيانات لكن فشل تحديث البريد في نظام الدخول",
            error: authUpdateError.message,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "تم تحديث بيانات الحساب بنجاح",
      admin: updatedAdmin,
    });
  } catch (error) {
    console.error("ADMIN SETTINGS PATCH ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "حدث خطأ في السيرفر",
      },
      { status: 500 }
    );
  }
}