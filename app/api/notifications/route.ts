import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAuth = createClient(
  supabaseUrl,
  supabasePublishableKey
);

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey
);

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
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

// GET /api/notifications
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "غير مصرح بالدخول",
        },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("NOTIFICATIONS GET ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          message: "فشل في تحميل الإشعارات",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notifications: data ?? [],
    });
  } catch (error) {
    console.error("NOTIFICATIONS GET SERVER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "حدث خطأ في السيرفر",
      },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "غير مصرح بالدخول",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const notificationId = body?.notificationId;
    const markAll = body?.markAll === true;

    // تحديد إشعار واحد كمقروء
    if (notificationId) {
      const { data, error } = await supabaseAdmin
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("id", notificationId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        console.error("NOTIFICATION READ ERROR:", error);

        return NextResponse.json(
          {
            success: false,
            message: "فشل تحديث الإشعار",
            error: error.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        notification: data,
      });
    }

    // تحديد جميع الإشعارات كمقروءة
    if (markAll) {
      const { error } = await supabaseAdmin
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error("MARK ALL NOTIFICATIONS ERROR:", error);

        return NextResponse.json(
          {
            success: false,
            message: "فشل تحديد جميع الإشعارات كمقروءة",
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

    return NextResponse.json(
      {
        success: false,
        message: "لم يتم تحديد الإجراء المطلوب",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("NOTIFICATIONS PATCH SERVER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "حدث خطأ في السيرفر",
      },
      { status: 500 }
    );
  }
}