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

async function getAdminUser(request: NextRequest) {
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

  const { data: admin, error: adminError } =
    await supabaseAdmin
      .from("users")
      .select(
        "id, full_name, phone, email, role, balance, is_active, login_password, deleted_at"
      )
      .eq("id", user.id)
      .eq("role", "admin")
      .eq("is_active", true)
      .is("deleted_at", null)
      .single();

  if (adminError || !admin) {
    return null;
  }

  return admin;
}

function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, "").trim();
}

function technicalEmail(phone: string) {
  return `${phone}@captainsystem.com`;
}

/* =========================================================
   GET - المستخدمون الحاليون فقط
========================================================= */

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "غير مصرح بالدخول",
        },
        { status: 403 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .select(
        "id, full_name, phone, email, role, balance, is_active, login_password, deleted_at, created_at, updated_at"
      )
      .is("deleted_at", null)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("ADMIN USERS GET ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          message: "فشل تحميل المستخدمين",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      users: data ?? [],
    });
  } catch (error) {
    console.error(
      "ADMIN USERS GET SERVER ERROR:",
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

/* =========================================================
   POST - إضافة مستخدم جديد
========================================================= */

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "غير مصرح بالدخول",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const fullName = String(
      body?.full_name || ""
    ).trim();

    const phone = normalizePhone(
      String(body?.phone || "")
    );

    const password = String(
      body?.password || ""
    );

    const role =
      body?.role === "admin"
        ? "admin"
        : "user";

    if (!fullName) {
      return NextResponse.json(
        {
          success: false,
          message: "يرجى إدخال الاسم الكامل",
        },
        { status: 400 }
      );
    }

    if (!/^07\d{8}$/.test(phone)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "رقم الهاتف يجب أن يكون بصيغة 07XXXXXXXX",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message:
            "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
        },
        { status: 400 }
      );
    }

    /*
     * لا نسمح بإعادة استخدام رقم موجود
     * حتى لو كان الحساب محذوفًا.
     *
     * لأن الـ Auth email التقني قد يكون
     * مستخدمًا أيضًا.
     */
    const { data: existingPhone } =
      await supabaseAdmin
        .from("users")
        .select("id, deleted_at")
        .eq("phone", phone)
        .maybeSingle();

    if (existingPhone) {
      return NextResponse.json(
        {
          success: false,
          message:
            existingPhone.deleted_at
              ? "رقم الهاتف مرتبط بحساب محذوف سابقًا. استخدم رقمًا آخر."
              : "رقم الهاتف مستخدم مسبقًا",
        },
        { status: 400 }
      );
    }

    const email = technicalEmail(phone);

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      console.error(
        "CREATE AUTH USER ERROR:",
        authError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            authError?.message ||
            "فشل إنشاء حساب تسجيل الدخول",
        },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    const {
      data: newUser,
      error: userError,
    } =
      await supabaseAdmin
        .from("users")
        .insert({
          id: userId,
          full_name: fullName,
          phone,
          email,
          role,
          balance: 0,
          is_active: true,
          login_password: password,
          deleted_at: null,
        })
        .select(
          "id, full_name, phone, email, role, balance, is_active, login_password, deleted_at, created_at, updated_at"
        )
        .single();

    if (userError) {
      console.error(
        "CREATE PUBLIC USER ERROR:",
        userError
      );

      await supabaseAdmin.auth.admin.deleteUser(
        userId
      );

      return NextResponse.json(
        {
          success: false,
          message:
            userError.message ||
            "فشل إنشاء المستخدم",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم إضافة المستخدم بنجاح",
      user: newUser,
    });
  } catch (error) {
    console.error(
      "ADMIN USERS POST SERVER ERROR:",
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

/* =========================================================
   PATCH - تعديل المستخدم
========================================================= */

export async function PATCH(request: NextRequest) {
  try {
    const admin = await getAdminUser(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "غير مصرح بالدخول",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const userId = String(
      body?.id || ""
    ).trim();

    const fullName = String(
      body?.full_name || ""
    ).trim();

    const phone = normalizePhone(
      String(body?.phone || "")
    );

    const password =
      body?.password !== undefined
        ? String(body.password)
        : "";

    const role =
      body?.role === "admin"
        ? "admin"
        : "user";

    const isActive =
      body?.is_active === true;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "معرف المستخدم مفقود",
        },
        { status: 400 }
      );
    }

    if (!fullName) {
      return NextResponse.json(
        {
          success: false,
          message: "يرجى إدخال الاسم الكامل",
        },
        { status: 400 }
      );
    }

    if (!/^07\d{8}$/.test(phone)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "رقم الهاتف يجب أن يكون بصيغة 07XXXXXXXX",
        },
        { status: 400 }
      );
    }

    if (
      password &&
      password.length < 6
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
        },
        { status: 400 }
      );
    }

    if (userId === admin.id) {
      if (!isActive) {
        return NextResponse.json(
          {
            success: false,
            message:
              "لا يمكنك إيقاف حساب الأدمن الذي تستخدمه حاليًا",
          },
          { status: 400 }
        );
      }

      if (role !== "admin") {
        return NextResponse.json(
          {
            success: false,
            message:
              "لا يمكنك إزالة صلاحية الأدمن من حسابك الحالي",
          },
          { status: 400 }
        );
      }
    }

    const {
      data: existingUser,
      error: existingUserError,
    } =
      await supabaseAdmin
        .from("users")
        .select(
          "id, full_name, phone, email, role, balance, is_active, login_password, deleted_at"
        )
        .eq("id", userId)
        .is("deleted_at", null)
        .single();

    if (
      existingUserError ||
      !existingUser
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "المستخدم غير موجود",
        },
        { status: 404 }
      );
    }

    const {
      data: duplicatePhone,
    } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("phone", phone)
      .neq("id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (duplicatePhone) {
      return NextResponse.json(
        {
          success: false,
          message:
            "رقم الهاتف مستخدم من حساب آخر",
        },
        { status: 400 }
      );
    }

    const oldPhone =
      existingUser.phone;

    const newEmail =
      technicalEmail(phone);

    /*
     * تغيير رقم الهاتف
     */
    if (oldPhone !== phone) {
      const {
        error: authEmailError,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            email: newEmail,
            email_confirm: true,
          }
        );

      if (authEmailError) {
        console.error(
          "AUTH EMAIL UPDATE ERROR:",
          authEmailError
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "فشل تحديث رقم الهاتف في نظام تسجيل الدخول",
            error:
              authEmailError.message,
          },
          { status: 500 }
        );
      }
    }

    /*
     * تغيير كلمة المرور
     */
    if (password) {
      const {
        error: passwordError,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            password,
          }
        );

      if (passwordError) {
        console.error(
          "AUTH PASSWORD UPDATE ERROR:",
          passwordError
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "فشل تحديث كلمة المرور",
            error:
              passwordError.message,
          },
          { status: 500 }
        );
      }
    }

    const updateData: any = {
      full_name: fullName,
      phone,
      email: newEmail,
      role,
      is_active: isActive,
      updated_at:
        new Date().toISOString(),
    };

    if (password) {
      updateData.login_password =
        password;
    }

    const {
      data: updatedUser,
      error: updateError,
    } =
      await supabaseAdmin
        .from("users")
        .update(updateData)
        .eq("id", userId)
        .is("deleted_at", null)
        .select(
          "id, full_name, phone, email, role, balance, is_active, login_password, deleted_at, created_at, updated_at"
        )
        .single();

    if (updateError) {
      console.error(
        "ADMIN USER UPDATE ERROR:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "فشل تحديث بيانات المستخدم",
          error: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "تم تحديث بيانات المستخدم بنجاح",
      user: updatedUser,
    });
  } catch (error) {
    console.error(
      "ADMIN USERS PATCH SERVER ERROR:",
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

/* =========================================================
   DELETE - حذف منطقي Soft Delete
========================================================= */

export async function DELETE(request: NextRequest) {
  try {
    const admin = await getAdminUser(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "غير مصرح بالدخول",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const userId = String(
      body?.id || ""
    ).trim();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "معرف المستخدم مفقود",
        },
        { status: 400 }
      );
    }

    if (userId === admin.id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "لا يمكنك حذف حساب الأدمن الذي تستخدمه حاليًا",
        },
        { status: 400 }
      );
    }

    const {
      data: targetUser,
      error: targetError,
    } =
      await supabaseAdmin
        .from("users")
        .select(
          "id, full_name, phone, role, balance, is_active, deleted_at"
        )
        .eq("id", userId)
        .is("deleted_at", null)
        .single();

    if (targetError || !targetUser) {
      return NextResponse.json(
        {
          success: false,
          message: "المستخدم غير موجود",
        },
        { status: 404 }
      );
    }

    /*
     * إذا عنده رصيد:
     * نرفض الحذف لأن الرصيد يجب أن يبقى
     * ظاهرًا ويمكن تسويته.
     *
     * لكن حتى لو كان الرصيد صفرًا،
     * لن نحذف السجل.
     */
    if (
      Number(targetUser.balance || 0) !== 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "لا يمكن حذف مستخدم لديه رصيد حالي. قم بتسوية الرصيد أولًا أو استخدم إيقاف الحساب.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * SOFT DELETE
     *
     * لا نحذف:
     * users
     * transactions
     * orders
     * topup_requests
     * withdrawal_requests
     * weekly_user_activity
     * notifications
     *
     * فقط نضع deleted_at ونوقف الحساب.
     * =====================================================
     */

    const {
      data: deletedUser,
      error: softDeleteError,
    } =
      await supabaseAdmin
        .from("users")
        .update({
          is_active: false,
          deleted_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", userId)
        .is("deleted_at", null)
        .select(
          "id, full_name, phone, role, balance, is_active, deleted_at"
        )
        .single();

    if (softDeleteError) {
      console.error(
        "SOFT DELETE USER ERROR:",
        softDeleteError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "فشل حذف المستخدم من النظام",
          error:
            softDeleteError.message,
        },
        { status: 500 }
      );
    }

    /*
     * تعطيل تسجيل الدخول في Auth
     *
     * لا نحذف Auth user حتى يبقى ارتباط
     * السجل التاريخي سليمًا.
     */
    const {
      error: authDisableError,
    } =
      await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          ban_duration: "876000h",
        }
      );

    if (authDisableError) {
      console.error(
        "AUTH DISABLE USER ERROR:",
        authDisableError
      );

      /*
       * نرجع الحساب فعال إذا فشل تعطيل Auth
       */
      await supabaseAdmin
        .from("users")
        .update({
          is_active: targetUser.is_active,
          deleted_at: null,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", userId);

      return NextResponse.json(
        {
          success: false,
          message:
            "فشل تعطيل تسجيل دخول المستخدم",
          error:
            authDisableError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "تم حذف المستخدم من النظام مع الاحتفاظ بكامل سجله وحركاته المالية",
      user: deletedUser,
    });
  } catch (error) {
    console.error(
      "ADMIN USERS DELETE SERVER ERROR:",
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