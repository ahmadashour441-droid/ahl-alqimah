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
      "id, full_name, phone, email, role, balance, is_active"
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
   GET - جلب إشعارات الأدمن
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

    const { data: notifications, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", admin.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("ADMIN NOTIFICATIONS GET ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          message: "فشل تحميل الإشعارات",
          error: error.message,
        },
        { status: 500 }
      );
    }

    const notificationList = notifications || [];

    const unreadCount = notificationList.filter(
      (notification) => notification.is_read === false
    ).length;

    const readCount = notificationList.filter(
      (notification) => notification.is_read === true
    ).length;

    return NextResponse.json({
      success: true,
      notifications: notificationList,
      stats: {
        total: notificationList.length,
        unread: unreadCount,
        read: readCount,
      },
    });
  } catch (error) {
    console.error("ADMIN NOTIFICATIONS SERVER ERROR:", error);

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
   PATCH - قراءة إشعار
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
      id?: string;
      all?: boolean;
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

    /* =========================
       قراءة جميع الإشعارات
    ========================= */

    if (body.all === true) {
      const { error } = await supabaseAdmin
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("user_id", admin.id)
        .eq("is_read", false);

      if (error) {
        console.error(
          "ADMIN NOTIFICATIONS MARK ALL ERROR:",
          error
        );

        return NextResponse.json(
          {
            success: false,
            message: "فشل تحديد الإشعارات كمقروءة",
            error: error.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "تم تحديد جميع الإشعارات كمقروءة",
      });
    }

    /* =========================
       قراءة إشعار واحد
    ========================= */

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          message: "رقم الإشعار مطلوب",
        },
        { status: 400 }
      );
    }

    const { data: notification, error: notificationError } =
      await supabaseAdmin
        .from("notifications")
        .select("id, user_id")
        .eq("id", body.id)
        .eq("user_id", admin.id)
        .single();

    if (notificationError || !notification) {
      return NextResponse.json(
        {
          success: false,
          message: "الإشعار غير موجود",
        },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("id", body.id)
      .eq("user_id", admin.id);

    if (updateError) {
      console.error(
        "ADMIN NOTIFICATIONS MARK READ ERROR:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          message: "فشل تحديث الإشعار",
          error: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم تحديد الإشعار كمقروء",
    });
  } catch (error) {
    console.error("ADMIN NOTIFICATIONS PATCH ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "حدث خطأ في السيرفر",
      },
      { status: 500 }
    );
  }
}