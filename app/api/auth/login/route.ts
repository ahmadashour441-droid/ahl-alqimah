import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function normalizePhone(value: string) {
  return String(value || "")
    .replace(/\s+/g, "")
    .trim();
}

function technicalEmail(phone: string) {
  const normalized = normalizePhone(phone).replace(/\D/g, "");

  if (normalized.startsWith("00962")) {
    return `0${normalized.slice(5)}@captainsystem.com`;
  }

  if (normalized.startsWith("962")) {
    return `0${normalized.slice(3)}@captainsystem.com`;
  }

  if (normalized.startsWith("07")) {
    return `${normalized}@captainsystem.com`;
  }

  return `0${normalized}@captainsystem.com`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const phone = normalizePhone(body?.phone);
    const password = String(body?.password || "");

    if (!/^07\d{8}$/.test(phone)) {
      return NextResponse.json(
        {
          error: "أدخل رقم الهاتف بصيغة 07XXXXXXXX",
        },
        {
          status: 400,
        }
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          error: "أدخل كلمة المرور",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // SUPABASE ADMIN CLIENT
    // ==================================================

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // ==================================================
    // FIND USER IN USERS TABLE
    // ==================================================

    const {
      data: user,
      error: userError,
    } = await supabaseAdmin
      .from("users")
      .select(
        "id, full_name, phone, email, role, is_active, deleted_at, login_password"
      )
      .eq("phone", phone)
      .is("deleted_at", null)
      .maybeSingle();

    if (userError) {
      console.error(
        "LOGIN USERS ERROR:",
        userError
      );

      return NextResponse.json(
        {
          error: "تعذر قراءة بيانات المستخدم",
        },
        {
          status: 500,
        }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          error:
            "رقم الهاتف أو كلمة المرور غير صحيحة",
        },
        {
          status: 401,
        }
      );
    }

    // ==================================================
    // ACTIVE CHECK
    // ==================================================

    if (user.is_active === false) {
      return NextResponse.json(
        {
          error: "هذا الحساب غير نشط",
        },
        {
          status: 403,
        }
      );
    }

    // ==================================================
    // PASSWORD FROM users.login_password
    // ==================================================

    const storedPassword =
      String(user.login_password || "");

    if (!storedPassword) {
      console.error(
        `USER ${user.id} DOES NOT HAVE login_password`
      );

      return NextResponse.json(
        {
          error:
            "لا توجد كلمة مرور لهذا الحساب",
        },
        {
          status: 401,
        }
      );
    }

    if (storedPassword !== password) {
      return NextResponse.json(
        {
          error:
            "رقم الهاتف أو كلمة المرور غير صحيحة",
        },
        {
          status: 401,
        }
      );
    }

    // ==================================================
    // DETERMINE SUPABASE AUTH EMAIL
    // ==================================================

    const email =
      user.email ||
      technicalEmail(phone);

    // ==================================================
    // SYNC users.login_password
    // WITH SUPABASE AUTH PASSWORD
    // ==================================================

    const {
      data: authUser,
      error: authUpdateError,
    } =
      await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        {
          password: `VIP@${password}#2026`,
          email,
          email_confirm: true,
        }
      );

    if (authUpdateError) {
      console.error(
        "AUTH PASSWORD SYNC ERROR:",
        authUpdateError
      );

      return NextResponse.json(
        {
          error:
            "تعذر مزامنة كلمة المرور مع نظام الدخول",
          details:
            authUpdateError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!authUser?.user) {
      return NextResponse.json(
        {
          error:
            "تعذر العثور على حساب تسجيل الدخول",
        },
        {
          status: 500,
        }
      );
    }

    // ==================================================
    // RETURN AUTH EMAIL
    // ==================================================

    return NextResponse.json({
  success: true,
  email,
  authPassword: `VIP@${password}#2026`,
});
  } catch (error) {
    console.error(
      "LOGIN API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ أثناء تسجيل الدخول",
      },
      {
        status: 500,
      }
    );
  }
}