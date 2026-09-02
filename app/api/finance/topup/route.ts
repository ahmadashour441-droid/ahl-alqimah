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
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "غير مصرح" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // التحقق من المستخدم الحالي
    const {
      data: authData,
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "جلسة الدخول غير صالحة" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const amount = Number(body.amount);
    const paymentMethod = String(
      body.payment_method || ""
    ).trim();
    const notes = body.notes
      ? String(body.notes).trim()
      : null;

    // التحقق من المبلغ
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "مبلغ الشحن غير صحيح" },
        { status: 400 }
      );
    }

    // منع المبالغ ذات المنازل العشرية الزائدة
    if (Math.round(amount * 100) !== amount * 100) {
      return NextResponse.json(
        { error: "المبلغ يجب أن يحتوي على منزلتين عشريتين كحد أقصى" },
        { status: 400 }
      );
    }

    // طرق الدفع المسموحة
    const allowedMethods = [
      "cash",
      "bank_transfer",
      "wallet",
    ];

    if (!allowedMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: "طريقة الدفع غير صحيحة" },
        { status: 400 }
      );
    }

    // التأكد أن المستخدم موجود وفعال
    const {
      data: user,
      error: userError,
    } = await supabaseAdmin
      .from("users")
      .select("id, full_name, phone, is_active")
      .eq("id", authData.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "بيانات المستخدم غير موجودة" },
        { status: 404 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: "الحساب موقوف ولا يمكن إرسال طلب شحن" },
        { status: 403 }
      );
    }

    // منع وجود طلبات شحن معلقة مكررة
    const {
      data: pendingRequests,
      error: pendingError,
    } = await supabaseAdmin
      .from("topup_requests")
      .select("id")
      .eq("user_id", authData.user.id)
      .eq("status", "pending")
      .limit(1);

    if (pendingError) {
      console.error(
        "PENDING TOPUP ERROR:",
        pendingError
      );

      return NextResponse.json(
        {
          error: "تعذر التحقق من طلبات الشحن السابقة",
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
            "لديك طلب شحن قيد المراجعة بالفعل",
        },
        { status: 409 }
      );
    }

    // إنشاء طلب الشحن
    const {
      data: requestData,
      error: insertError,
    } = await supabaseAdmin
      .from("topup_requests")
      .insert({
        user_id: authData.user.id,
        amount,
        payment_method: paymentMethod,
        notes,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error(
        "TOPUP INSERT ERROR:",
        insertError
      );

      return NextResponse.json(
        {
          error: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
        },
        { status: 500 }
      );
    }

    // إنشاء إشعار للمستخدم
    const { error: notificationError } =
      await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: authData.user.id,
          title: "تم إرسال طلب الشحن",
          message: `تم استلام طلب شحن بقيمة ${amount.toFixed(
            2
          )} د.أ وهو بانتظار مراجعة الإدارة.`,
          type: "topup",
          is_read: false,
        });

    if (notificationError) {
      console.error(
        "TOPUP NOTIFICATION ERROR:",
        notificationError
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "تم إرسال طلب الشحن بنجاح، بانتظار موافقة الإدارة",
      request: requestData,
    });
  } catch (error) {
    console.error("TOPUP API ERROR:", error);

    return NextResponse.json(
      {
        error:
          "حدث خطأ غير متوقع أثناء إرسال طلب الشحن",
      },
      { status: 500 }
    );
  }
}