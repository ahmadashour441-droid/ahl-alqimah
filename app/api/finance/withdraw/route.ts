import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export async function POST(request: Request) {
  try {
    /* =========================
       التحقق من تسجيل الدخول
       ========================= */

    const authHeader =
      request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "غير مصرح",
        },
        { status: 401 }
      );
    }

    const token =
      authHeader.substring(7);

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAuth.auth.getUser(
        token
      );

    if (
      authError ||
      !authData.user
    ) {
      return NextResponse.json(
        {
          error:
            "جلسة الدخول غير صالحة",
        },
        { status: 401 }
      );
    }

    const userId =
      authData.user.id;

    /* =========================
       قراءة البيانات
       ========================= */

    const body =
      await request.json();

    const amount =
      Number(body.amount);

    const notes =
      body.notes
        ? String(body.notes).trim()
        : null;

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "مبلغ السحب غير صحيح",
        },
        { status: 400 }
      );
    }

    if (
      Math.round(amount * 100) !==
      amount * 100
    ) {
      return NextResponse.json(
        {
          error:
            "المبلغ يجب أن يحتوي على منزلتين عشريتين كحد أقصى",
        },
        { status: 400 }
      );
    }

    /* =========================
       جلب المستخدم
       ========================= */

    const {
      data: user,
      error: userError,
    } =
      await supabaseAdmin
        .from("users")
        .select(
          "id, full_name, phone, balance, is_active"
        )
        .eq("id", userId)
        .maybeSingle();

    if (userError) {
      console.error(
        "WITHDRAW USER ERROR:",
        userError
      );

      return NextResponse.json(
        {
          error:
            "تعذر قراءة بيانات الحساب",
          details:
            userError.message,
        },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          error:
            "بيانات المستخدم غير موجودة",
        },
        { status: 404 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        {
          error:
            "الحساب موقوف ولا يمكن طلب السحب",
        },
        { status: 403 }
      );
    }

    /* =========================
       التحقق من الرصيد
       ========================= */

    const currentBalance =
      Number(user.balance || 0);

    if (currentBalance < amount) {
      return NextResponse.json(
        {
          error:
            `الرصيد غير كافٍ. رصيدك الحالي ${currentBalance.toFixed(
              2
            )} د.أ`,
        },
        { status: 400 }
      );
    }

    /* =========================
       منع أكثر من طلب قيد المراجعة
       ========================= */

    const {
      data: pendingRequests,
      error: pendingError,
    } =
      await supabaseAdmin
        .from("withdrawal_requests")
        .select("id")
        .eq(
          "user_id",
          userId
        )
        .eq(
          "status",
          "pending"
        )
        .limit(1);

    if (pendingError) {
      console.error(
        "PENDING WITHDRAW ERROR:",
        pendingError
      );

      return NextResponse.json(
        {
          error:
            "تعذر التحقق من طلبات السحب السابقة",
          details:
            pendingError.message,
        },
        { status: 500 }
      );
    }

    if (
      pendingRequests &&
      pendingRequests.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            "لديك طلب سحب قيد المراجعة بالفعل",
        },
        { status: 409 }
      );
    }

    /* =========================
       إنشاء طلب السحب
       ========================= */

    const {
      data: withdrawalRequest,
      error: insertError,
    } =
      await supabaseAdmin
        .from("withdrawal_requests")
        .insert({
          user_id: userId,
          amount: amount,
          notes: notes,
          status: "pending",
        })
        .select()
        .single();

    if (insertError) {
      console.error(
        "WITHDRAW INSERT ERROR:",
        insertError
      );

      return NextResponse.json(
        {
          error:
            "تعذر إنشاء طلب السحب",
          details:
            insertError.message,
          code:
            insertError.code,
        },
        { status: 500 }
      );
    }

    /* =========================
       إشعار المستخدم
       ========================= */

    const {
      error: notificationError,
    } =
      await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: userId,
          title:
            "تم إرسال طلب السحب",
          message: `تم استلام طلب سحب بقيمة ${amount.toFixed(
            2
          )} د.أ وهو بانتظار مراجعة الإدارة.`,
          type: "withdrawal",
          is_read: false,
        });

    if (notificationError) {
      console.error(
        "WITHDRAW NOTIFICATION ERROR:",
        notificationError
      );
    }

    return NextResponse.json({
      success: true,

      message:
        "تم إرسال طلب السحب بنجاح، بانتظار موافقة الإدارة",

      request:
        withdrawalRequest,
    });
  } catch (error) {
    console.error(
      "WITHDRAW API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ غير متوقع أثناء إرسال طلب السحب",
      },
      { status: 500 }
    );
  }
}