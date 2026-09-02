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

    // استقبال FormData بدل JSON
    const formData = await request.formData();

    const amountValue = formData.get("amount");
    const notesValue = formData.get("notes");
    const receipt = formData.get("receipt");

    const amount = Number(amountValue);

    const notes =
      notesValue && String(notesValue).trim()
        ? String(notesValue).trim()
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
        {
          error:
            "المبلغ يجب أن يحتوي على منزلتين عشريتين كحد أقصى",
        },
        { status: 400 }
      );
    }

    // التحقق من وجود الوصل
    if (!receipt || !(receipt instanceof File)) {
      return NextResponse.json(
        { error: "يرجى إرفاق صورة أو ملف الوصل" },
        { status: 400 }
      );
    }

    if (receipt.size <= 0) {
      return NextResponse.json(
        { error: "الملف المرفق فارغ" },
        { status: 400 }
      );
    }

    // حد أقصى 10MB للملف
    const maxFileSize = 10 * 1024 * 1024;

    if (receipt.size > maxFileSize) {
      return NextResponse.json(
        {
          error:
            "حجم الملف كبير جدًا. الحد الأقصى المسموح 10MB",
        },
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
        {
          error:
            "الحساب موقوف ولا يمكن إرسال طلب شحن",
        },
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
          error:
            "تعذر التحقق من طلبات الشحن السابقة",
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

    // تجهيز اسم آمن للملف
    const originalFileName = receipt.name || "receipt";

    const safeFileName = originalFileName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 120);

    const fileExtension =
      safeFileName.includes(".")
        ? safeFileName.split(".").pop()
        : "file";

    const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

    const filePath = `${authData.user.id}/${fileName}`;

    // رفع الوصل إلى Supabase Storage
    const {
      error: uploadError,
    } = await supabaseAdmin.storage
      .from("topup-receipts")
      .upload(filePath, receipt, {
        contentType:
          receipt.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error(
        "TOPUP RECEIPT UPLOAD ERROR:",
        uploadError
      );

      return NextResponse.json(
        {
          error:
            "تعذر رفع الوصل، يرجى المحاولة مرة أخرى",
        },
        { status: 500 }
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
        payment_method: "receipt",
        notes,
        status: "pending",
        receipt_path: filePath,
        receipt_name: originalFileName,
        receipt_type:
          receipt.type || "application/octet-stream",
        receipt_size: receipt.size,
      })
      .select()
      .single();

    if (insertError) {
      console.error(
        "TOPUP INSERT ERROR:",
        insertError
      );

      // حذف الملف إذا فشل إنشاء الطلب
      await supabaseAdmin.storage
        .from("topup-receipts")
        .remove([filePath]);

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
          )} د.أ مع إرفاق الوصل، وهو بانتظار مراجعة الإدارة.`,
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