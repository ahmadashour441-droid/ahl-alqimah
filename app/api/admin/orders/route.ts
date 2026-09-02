import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function authenticateAdmin(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: "غير مصرح" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.substring(7);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !authData.user) {
    return {
      error: NextResponse.json(
        { error: "جلسة الدخول غير صالحة" },
        { status: 401 }
      ),
    };
  }

  const authUser = authData.user;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const { data: user, error: userError } = await admin
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (userError) {
    console.error("ADMIN USER ERROR:", userError);

    return {
      error: NextResponse.json(
        {
          error: "تعذر التحقق من بيانات المسؤول",
          details: userError.message,
        },
        { status: 500 }
      ),
    };
  }

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "المستخدم غير موجود" },
        { status: 404 }
      ),
    };
  }

  if (user.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "ليس لديك صلاحية لإدارة الطلبات" },
        { status: 403 }
      ),
    };
  }

  return {
    admin,
    authUser,
    user,
  };
}

/* =========================================================
   GET
   تحميل الطلبات + المستخدمين
========================================================= */

export async function GET(request: Request) {
  try {
    const auth = await authenticateAdmin(request);

    if ("error" in auth) {
      return auth.error;
    }

    const { admin } = auth;

    const { data: orders, error } = await admin
      .from("orders")
      .select(`
        id,
        order_number,
        order_type,
        amount,
        commission_rate,
        commission_amount,
        producer_id,
        consumer_id,
        status,
        notes,
        created_by,
        created_at,
        updated_at,
        financially_processed,
        processed_week_id,
        producer:users!orders_producer_id_fkey (
          id,
          full_name,
          phone,
          balance,
          is_active,
          role
        ),
        consumer:users!orders_consumer_id_fkey (
          id,
          full_name,
          phone,
          balance,
          is_active,
          role
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("GET ORDERS ERROR:", error);

      return NextResponse.json(
        {
          error: "تعذر تحميل الطلبات",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orders: orders || [],
    });
  } catch (error) {
    console.error("GET ORDERS EXCEPTION:", error);

    return NextResponse.json(
      {
        error: "حدث خطأ أثناء تحميل الطلبات",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST
   إنشاء طلب جديد
========================================================= */

export async function POST(request: Request) {
  try {
    const auth = await authenticateAdmin(request);

    if ("error" in auth) {
      return auth.error;
    }

    const { admin, authUser } = auth;

    const body = await request.json();

    const {
      orderType,
      amount,
      producerId,
      consumerId,
      notes,
    } = body;

    if (!orderType) {
      return NextResponse.json(
        {
          error: "نوع الطلب مطلوب",
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
          error: "قيمة الطلب غير صحيحة",
        },
        { status: 400 }
      );
    }

    if (!producerId) {
      return NextResponse.json(
        {
          error: "يجب اختيار المنتج",
        },
        { status: 400 }
      );
    }

    if (!consumerId) {
      return NextResponse.json(
        {
          error: "يجب اختيار الكابتن",
        },
        { status: 400 }
      );
    }

    if (producerId === consumerId) {
      return NextResponse.json(
        {
          error:
            "لا يمكن أن يكون المنتج هو نفسه الكابتن",
        },
        { status: 400 }
      );
    }

    const { data: producer, error: producerError } =
      await admin
        .from("users")
        .select(
          "id, full_name, phone, balance, is_active, role"
        )
        .eq("id", producerId)
        .maybeSingle();

    if (producerError) {
      console.error(
        "PRODUCER ERROR:",
        producerError
      );

      return NextResponse.json(
        {
          error: "تعذر التحقق من المنتج",
          details: producerError.message,
        },
        { status: 500 }
      );
    }

    if (!producer) {
      return NextResponse.json(
        {
          error: "المنتج غير موجود",
        },
        { status: 404 }
      );
    }

    if (!producer.is_active) {
      return NextResponse.json(
        {
          error: "المنتج غير نشط",
        },
        { status: 400 }
      );
    }

    const { data: consumer, error: consumerError } =
      await admin
        .from("users")
        .select(
          "id, full_name, phone, balance, is_active, role"
        )
        .eq("id", consumerId)
        .maybeSingle();

    if (consumerError) {
      console.error(
        "CONSUMER ERROR:",
        consumerError
      );

      return NextResponse.json(
        {
          error: "تعذر التحقق من الكابتن",
          details: consumerError.message,
        },
        { status: 500 }
      );
    }

    if (!consumer) {
      return NextResponse.json(
        {
          error: "الكابتن غير موجود",
        },
        { status: 404 }
      );
    }

    if (!consumer.is_active) {
      return NextResponse.json(
        {
          error: "الكابتن غير نشط",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       الحصول على الأسبوع الحالي
    ===================================================== */

    const {
      data: weekId,
      error: weekError,
    } = await admin.rpc("get_current_week");

    if (weekError || !weekId) {
      console.error(
        "GET CURRENT WEEK ERROR:",
        weekError
      );

      return NextResponse.json(
        {
          error: "تعذر تحديد الأسبوع الحالي",
          details:
            weekError?.message ||
            "لم يتم العثور على الأسبوع",
        },
        { status: 500 }
      );
    }

    /* =====================================================
       إنشاء الطلب
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

    const { data: order, error: orderError } =
      await admin
        .from("orders")
        .insert({
          order_type: orderType,
          amount: numericAmount,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          producer_id: producerId,
          consumer_id: consumerId,
          status: "assigned",
          notes:
            typeof notes === "string" &&
            notes.trim()
              ? notes.trim()
              : null,
          created_by: authUser.id,
          financially_processed: false,
          processed_week_id: weekId,
        })
        .select("*")
        .single();

    if (orderError || !order) {
      console.error(
        "CREATE ORDER ERROR:",
        orderError
      );

      return NextResponse.json(
        {
          error: "تعذر إنشاء الطلب",
          details:
            orderError?.message ||
            "فشل إنشاء الطلب",
        },
        { status: 500 }
      );
    }

    /* =====================================================
       المعالجة المالية
    ===================================================== */

    const {
      data: financialResult,
      error: financialError,
    } = await admin.rpc(
      "process_order_financially",
      {
        p_order_id: order.id,
        p_week_id: weekId,
        p_created_by: authUser.id,
      }
    );

    if (financialError) {
      console.error(
        "PROCESS ORDER FINANCIAL ERROR:",
        financialError
      );

      await admin
        .from("orders")
        .delete()
        .eq("id", order.id);

      return NextResponse.json(
        {
          error:
            "تعذر معالجة الحسابات المالية للطلب",
          details:
            financialError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "تم إنشاء الطلب وتسجيل العمولة والأرضية بنجاح",
      order,
      financial: financialResult,
    });
  } catch (error) {
    console.error(
      "POST ORDERS EXCEPTION:",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ أثناء إنشاء الطلب",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   PATCH
   تعديل طلب موجود
========================================================= */

export async function PATCH(request: Request) {
  try {
    const auth = await authenticateAdmin(request);

    if ("error" in auth) {
      return auth.error;
    }

    const { admin, authUser } = auth;

    const body = await request.json();

    const {
      orderId,
      orderType,
      amount,
      producerId,
      consumerId,
      notes,
    } = body;

    if (!orderId) {
      return NextResponse.json(
        {
          error: "رقم الطلب مطلوب",
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
          error: "قيمة الطلب غير صحيحة",
        },
        { status: 400 }
      );
    }

    if (!producerId) {
      return NextResponse.json(
        {
          error: "يجب اختيار المنتج",
        },
        { status: 400 }
      );
    }

    if (!consumerId) {
      return NextResponse.json(
        {
          error: "يجب اختيار الكابتن",
        },
        { status: 400 }
      );
    }

    if (producerId === consumerId) {
      return NextResponse.json(
        {
          error:
            "لا يمكن أن يكون المنتج هو نفسه الكابتن",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       التأكد من وجود الطلب
    ===================================================== */

    const {
      data: existingOrder,
      error: existingOrderError,
    } = await admin
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        financially_processed,
        producer_id,
        consumer_id,
        amount,
        commission_amount,
        order_type,
        processed_week_id
      `)
      .eq("id", orderId)
      .maybeSingle();

    if (existingOrderError) {
      console.error(
        "GET EXISTING ORDER ERROR:",
        existingOrderError
      );

      return NextResponse.json(
        {
          error:
            "تعذر قراءة الطلب الحالي",
          details:
            existingOrderError.message,
        },
        { status: 500 }
      );
    }

    if (!existingOrder) {
      return NextResponse.json(
        {
          error: "الطلب غير موجود",
        },
        { status: 404 }
      );
    }

    if (existingOrder.status === "cancelled") {
      return NextResponse.json(
        {
          error:
            "لا يمكن تعديل طلب ملغي",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       التحقق من المنتج
    ===================================================== */

    const {
      data: producer,
      error: producerError,
    } = await admin
      .from("users")
      .select(
        "id, full_name, phone, balance, is_active, role"
      )
      .eq("id", producerId)
      .maybeSingle();

    if (producerError) {
      return NextResponse.json(
        {
          error:
            "تعذر التحقق من المنتج",
          details:
            producerError.message,
        },
        { status: 500 }
      );
    }

    if (!producer) {
      return NextResponse.json(
        {
          error: "المنتج غير موجود",
        },
        { status: 404 }
      );
    }

    if (!producer.is_active) {
      return NextResponse.json(
        {
          error: "المنتج غير نشط",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       التحقق من الكابتن
    ===================================================== */

    const {
      data: consumer,
      error: consumerError,
    } = await admin
      .from("users")
      .select(
        "id, full_name, phone, balance, is_active, role"
      )
      .eq("id", consumerId)
      .maybeSingle();

    if (consumerError) {
      return NextResponse.json(
        {
          error:
            "تعذر التحقق من الكابتن",
          details:
            consumerError.message,
        },
        { status: 500 }
      );
    }

    if (!consumer) {
      return NextResponse.json(
        {
          error: "الكابتن غير موجود",
        },
        { status: 404 }
      );
    }

    if (!consumer.is_active) {
      return NextResponse.json(
        {
          error: "الكابتن غير نشط",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       تعديل الطلب + الحسابات المالية
    ===================================================== */

    const {
      data: updateResult,
      error: updateError,
    } = await admin.rpc(
      "update_order_financially",
      {
        p_order_id: orderId,
        p_order_type: orderType,
        p_amount: numericAmount,
        p_producer_id: producerId,
        p_consumer_id: consumerId,
        p_notes:
          typeof notes === "string" &&
          notes.trim()
            ? notes.trim()
            : null,
        p_updated_by: authUser.id,
      }
    );

    if (updateError) {
      console.error(
        "UPDATE ORDER FINANCIAL ERROR:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "تعذر تعديل الطلب والحسابات المالية",
          details:
            updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "تم تعديل الطلب وتحديث الحسابات المالية بنجاح",
      result: updateResult,
    });
  } catch (error) {
    console.error(
      "PATCH ORDERS EXCEPTION:",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ أثناء تعديل الطلب",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   DELETE
   إلغاء طلب
========================================================= */

export async function DELETE(request: Request) {
  try {
    const auth = await authenticateAdmin(request);

    if ("error" in auth) {
      return auth.error;
    }

    const { admin, authUser } = auth;

    const body = await request.json();

    const orderId = body.orderId;

    if (!orderId) {
      return NextResponse.json(
        {
          error: "رقم الطلب مطلوب",
        },
        { status: 400 }
      );
    }

    const {
      data: existingOrder,
      error: existingOrderError,
    } = await admin
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        financially_processed,
        producer_id,
        consumer_id
      `)
      .eq("id", orderId)
      .maybeSingle();

    if (existingOrderError) {
      console.error(
        "GET ORDER BEFORE CANCEL ERROR:",
        existingOrderError
      );

      return NextResponse.json(
        {
          error:
            "تعذر قراءة الطلب قبل الإلغاء",
          details:
            existingOrderError.message,
        },
        { status: 500 }
      );
    }

    if (!existingOrder) {
      return NextResponse.json(
        {
          error: "الطلب غير موجود",
        },
        { status: 404 }
      );
    }

    if (existingOrder.status === "cancelled") {
      return NextResponse.json(
        {
          error: "الطلب ملغي بالفعل",
        },
        { status: 400 }
      );
    }

    const {
      data: cancelResult,
      error: cancelError,
    } = await admin.rpc(
      "cancel_order_financially",
      {
        p_order_id: orderId,
        p_cancelled_by: authUser.id,
      }
    );

    if (cancelError) {
      console.error(
        "CANCEL ORDER ERROR:",
        cancelError
      );

      return NextResponse.json(
        {
          error:
            "تعذر إلغاء الطلب وعكس الحسابات",
          details:
            cancelError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "تم إلغاء الطلب وعكس الحسابات المالية بنجاح",
      result: cancelResult,
    });
  } catch (error) {
    console.error(
      "DELETE ORDERS EXCEPTION:",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ أثناء إلغاء الطلب",
      },
      { status: 500 }
    );
  }
}