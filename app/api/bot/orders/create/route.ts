import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;
const botKey = process.env.WHATSAPP_BOT_KEY!;

const supabase = createClient(
  supabaseUrl,
  supabaseSecretKey
);

function unauthorized() {
  return NextResponse.json(
    {
      success: false,
      error: "Unauthorized",
    },
    {
      status: 401,
    }
  );
}

function normalizeJordanPhone(phone: string) {
  let value = String(phone || "").trim();

  value = value.replace(/\D/g, "");

  if (value.startsWith("00962")) {
    value = value.substring(5);
  }

  if (value.startsWith("962")) {
    value = value.substring(3);
  }

  if (!value.startsWith("0")) {
    value = "0" + value;
  }

  return value;
}

export async function POST(request: NextRequest) {
  try {
    /* =====================================================
       BOT AUTHENTICATION
    ===================================================== */

    const botHeader = request.headers.get("x-bot-key");

    if (!botHeader || botHeader !== botKey) {
      return unauthorized();
    }

    /* =====================================================
       READ BODY
    ===================================================== */

    const body = await request.json();

    const {
      producerPhone,
      captainPhone,
      orderType,
      amount,
      notes = null,
    } = body;

    if (!producerPhone) {
      return NextResponse.json(
        {
          success: false,
          error: "producerPhone مطلوب",
        },
        { status: 400 }
      );
    }

    if (!captainPhone) {
      return NextResponse.json(
        {
          success: false,
          error: "captainPhone مطلوب",
        },
        { status: 400 }
      );
    }

    if (!orderType) {
      return NextResponse.json(
        {
          success: false,
          error: "orderType مطلوب",
        },
        { status: 400 }
      );
    }

    if (
      orderType !== "passenger" &&
      orderType !== "order"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "نوع الطلب غير صحيح",
        },
        { status: 400 }
      );
    }

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "قيمة الطلب غير صحيحة",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       NORMALIZE PHONES
    ===================================================== */

    const normalizedProducerPhone =
      normalizeJordanPhone(producerPhone);

    const normalizedCaptainPhone =
      normalizeJordanPhone(captainPhone);

    if (
      normalizedProducerPhone ===
      normalizedCaptainPhone
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "لا يمكن أن يكون المنتج هو نفسه الكابتن",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       FIND PRODUCER
    ===================================================== */

    const {
      data: producer,
      error: producerError,
    } = await supabase
      .from("users")
      .select(
        "id, full_name, phone, balance, is_active, role"
      )
      .eq("phone", normalizedProducerPhone)
      .is("deleted_at", null)
      .maybeSingle();

    if (producerError) {
      console.error(
        "BOT PRODUCER ERROR:",
        producerError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "تعذر التحقق من بيانات المنتج",
          details:
            producerError.message,
        },
        { status: 500 }
      );
    }

    if (!producer) {
      return NextResponse.json(
        {
          success: false,
          error:
            "المنتج غير موجود في النظام",
        },
        { status: 404 }
      );
    }

    if (!producer.is_active) {
      return NextResponse.json(
        {
          success: false,
          error: "المنتج غير نشط",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       FIND CAPTAIN
    ===================================================== */

    const {
      data: captain,
      error: captainError,
    } = await supabase
      .from("users")
      .select(
        "id, full_name, phone, balance, is_active, role"
      )
      .eq("phone", normalizedCaptainPhone)
      .is("deleted_at", null)
      .maybeSingle();

    if (captainError) {
      console.error(
        "BOT CAPTAIN ERROR:",
        captainError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "تعذر التحقق من بيانات الكابتن",
          details:
            captainError.message,
        },
        { status: 500 }
      );
    }

    if (!captain) {
      return NextResponse.json(
        {
          success: false,
          error:
            "الكابتن غير موجود في النظام",
        },
        { status: 404 }
      );
    }

    if (!captain.is_active) {
      return NextResponse.json(
        {
          success: false,
          error: "الكابتن غير نشط",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       CURRENT WEEK
    ===================================================== */

    const {
      data: weekId,
      error: weekError,
    } = await supabase.rpc(
      "get_current_week"
    );

    if (weekError || !weekId) {
      console.error(
        "BOT CURRENT WEEK ERROR:",
        weekError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "تعذر تحديد الأسبوع الحالي",
          details:
            weekError?.message ||
            "لم يتم العثور على الأسبوع الحالي",
        },
        { status: 500 }
      );
    }

    /* =====================================================
       COMMISSION
    ===================================================== */

    const commissionRate =
      orderType === "passenger"
        ? 15
        : 20;

    const commissionAmount = Number(
      (
        numericAmount *
        commissionRate /
        100
      ).toFixed(2)
    );

    /* =====================================================
       CREATE ORDER
       نفس طريقة لوحة الإدارة
    ===================================================== */

    const {
      data: order,
      error: orderError,
    } = await supabase
      .from("orders")
      .insert({
        order_type: orderType,
        amount: numericAmount,
        commission_rate: commissionRate,
        commission_amount:
          commissionAmount,

        producer_id:
          producer.id,

        consumer_id:
          captain.id,

        status: "assigned",

        notes:
          typeof notes === "string" &&
          notes.trim()
            ? notes.trim()
            : null,

        /*
         * الطلب جاء من المنتج عن طريق
         * WhatsApp Bot.
         *
         * نستخدم المنتج كـ created_by
         * لأن الطلب ليس من صنع البوت.
         */
        created_by:
          producer.id,

        financially_processed:
          false,

        processed_week_id:
          weekId,
      })
      .select("*")
      .single();

    if (orderError || !order) {
      console.error(
        "BOT CREATE ORDER ERROR:",
        orderError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            orderError?.message ||
            "تعذر إنشاء الطلب",
        },
        { status: 500 }
      );
    }

    /* =====================================================
       PROCESS FINANCIALLY
       نفس RPC المستخدمة في لوحة الإدارة
    ===================================================== */

    const {
      data: financialResult,
      error: financialError,
    } = await supabase.rpc(
      "process_order_financially",
      {
        p_order_id:
          order.id,

        p_week_id:
          weekId,

        p_created_by:
          producer.id,
      }
    );

    if (financialError) {
      console.error(
        "BOT PROCESS FINANCIAL ERROR:",
        financialError
      );

      /*
       * إذا فشلت المعالجة المالية
       * نحذف الطلب الذي تم إنشاؤه.
       */
      await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      return NextResponse.json(
        {
          success: false,
          error:
            "تعذر معالجة الحسابات المالية للطلب",

          details:
            financialError.message,
        },
        { status: 500 }
      );
    }

    /* =====================================================
       SUCCESS
    ===================================================== */

    return NextResponse.json({
      success: true,

      message:
        "تم إنشاء الطلب وتسجيل العمولة والأرضية بنجاح",

      order: {
        id: order.id,

        orderId:
          order.id,

        orderNumber:
          order.order_number,

        orderType:
          orderType,

        amount:
          numericAmount,

        commissionRate:
          commissionRate,

        commissionAmount:
          commissionAmount,

        producerId:
          producer.id,

        producerName:
          producer.full_name,

        captainId:
          captain.id,

        captainName:
          captain.full_name,

        status:
          "assigned",
      },

      financial:
        financialResult,
    });
  } catch (error) {
    console.error(
      "BOT CREATE ORDER EXCEPTION:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء إنشاء الطلب",
      },
      { status: 500 }
    );
  }
}