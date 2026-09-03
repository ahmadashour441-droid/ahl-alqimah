import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;
const botKey = process.env.WHATSAPP_BOT_KEY!;

const supabase = createClient(supabaseUrl, supabaseSecretKey);

function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization) {
      return unauthorized();
    }

    const token = authorization.replace(/^Bearer\s+/i, "").trim();

    if (!token || token !== botKey) {
      return unauthorized();
    }

    const body = await request.json();

    const {
      producerId,
      consumerId,
      amount,
      orderType = "passenger",
      notes = null,
    } = body;

    if (!producerId || !consumerId) {
      return NextResponse.json(
        {
          success: false,
          error: "producerId and consumerId are required",
        },
        { status: 400 }
      );
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid amount",
        },
        { status: 400 }
      );
    }

    if (!["passenger", "order"].includes(orderType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid order type",
        },
        { status: 400 }
      );
    }

    if (producerId === consumerId) {
      return NextResponse.json(
        {
          success: false,
          error: "Producer and consumer cannot be the same user",
        },
        { status: 400 }
      );
    }

    const { data: producer, error: producerError } = await supabase
      .from("users")
      .select("id, full_name, phone, balance, is_active, deleted_at")
      .eq("id", producerId)
      .is("deleted_at", null)
      .single();

    if (producerError || !producer) {
      return NextResponse.json(
        {
          success: false,
          error: "Producer not found",
        },
        { status: 404 }
      );
    }

    const { data: consumer, error: consumerError } = await supabase
      .from("users")
      .select("id, full_name, phone, balance, is_active, deleted_at")
      .eq("id", consumerId)
      .is("deleted_at", null)
      .single();

    if (consumerError || !consumer) {
      return NextResponse.json(
        {
          success: false,
          error: "Consumer not found",
        },
        { status: 404 }
      );
    }

    /*
     * العمولة:
     * راكب = 15%
     * أوردر = 20%
     */
    const commissionRate = orderType === "passenger" ? 0.15 : 0.20;

    const commission = Number(
      (numericAmount * commissionRate).toFixed(2)
    );

    /*
     * إنشاء الأوردر
     */
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        producer_id: producer.id,
        consumer_id: consumer.id,
        amount: numericAmount,
        order_type: orderType,
        commission_rate: commissionRate,
        commission_amount: commission,
        status: "completed",
        notes,
      })
      .select("*")
      .single();

    if (orderError || !order) {
      console.error("CREATE ORDER ERROR:", orderError);

      return NextResponse.json(
        {
          success: false,
          error: orderError?.message || "Failed to create order",
        },
        { status: 500 }
      );
    }

    /*
     * المنتج يحصل على العمولة
     */
    const producerNewBalance = Number(
      (Number(producer.balance || 0) + commission).toFixed(2)
    );

    /*
     * المستهلك يدفع العمولة
     */
    const consumerNewBalance = Number(
      (Number(consumer.balance || 0) - commission).toFixed(2)
    );

    /*
     * تحديث رصيد المنتج
     */
    const { error: producerBalanceError } = await supabase
      .from("users")
      .update({
        balance: producerNewBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", producer.id);

    if (producerBalanceError) {
      console.error(
        "PRODUCER BALANCE ERROR:",
        producerBalanceError
      );

      await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to update producer balance",
        },
        { status: 500 }
      );
    }

    /*
     * تحديث رصيد المستهلك
     */
    const { error: consumerBalanceError } = await supabase
      .from("users")
      .update({
        balance: consumerNewBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", consumer.id);

    if (consumerBalanceError) {
      console.error(
        "CONSUMER BALANCE ERROR:",
        consumerBalanceError
      );

      await supabase
        .from("users")
        .update({
          balance: Number(producer.balance || 0),
          updated_at: new Date().toISOString(),
        })
        .eq("id", producer.id);

      await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to update consumer balance",
        },
        { status: 500 }
      );
    }

    /*
     * تسجيل الحركات المالية
     */
    const { error: transactionError } = await supabase
      .from("transactions")
      .insert([
        {
          user_id: producer.id,
          amount: commission,
          type: "order_commission",
          description: `عمولة إنتاج أوردر #${order.order_number}`,
          reference_id: order.id,
        },
        {
          user_id: consumer.id,
          amount: -commission,
          type: "order_commission",
          description: `عمولة استلام أوردر #${order.order_number}`,
          reference_id: order.id,
        },
      ]);

    if (transactionError) {
      console.error(
        "TRANSACTION ERROR:",
        transactionError
      );

      await supabase
        .from("users")
        .update({
          balance: Number(producer.balance || 0),
          updated_at: new Date().toISOString(),
        })
        .eq("id", producer.id);

      await supabase
        .from("users")
        .update({
          balance: Number(consumer.balance || 0),
          updated_at: new Date().toISOString(),
        })
        .eq("id", consumer.id);

      await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to create transactions",
        },
        { status: 500 }
      );
    }

    /*
     * إذا صار رصيد المستهلك سالب
     */
    if (consumerNewBalance < 0) {
      await supabase.from("notifications").insert({
        user_id: consumer.id,
        title: "تنبيه الرصيد",
        message: "رصيدك صار سالب. يرجى تسوية الحساب مع الإدارة.",
        type: "warning",
        is_read: false,
      });
    }

    return NextResponse.json({
      success: true,

      order: {
        id: order.id,
        orderNumber: order.order_number,
        amount: numericAmount,
        orderType,
        commissionRate,
        commission,
        status: "completed",
      },

      producer: {
        id: producer.id,
        name: producer.full_name,
        balanceBefore: Number(producer.balance || 0),
        balanceAfter: producerNewBalance,
        commissionEarned: commission,
      },

      consumer: {
        id: consumer.id,
        name: consumer.full_name,
        balanceBefore: Number(consumer.balance || 0),
        balanceAfter: consumerNewBalance,
        commissionPaid: commission,
        negative: consumerNewBalance < 0,
      },
    });
  } catch (error) {
    console.error("BOT CREATE ORDER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}