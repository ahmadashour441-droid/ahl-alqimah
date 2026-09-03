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

    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: "orderId is required",
        },
        { status: 400 }
      );
    }

    /*
     * Get order
     */
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        {
          success: false,
          error: "Order not found",
        },
        { status: 404 }
      );
    }

    /*
     * Prevent double cancellation
     */
    if (
      order.status === "cancelled" ||
      order.status === "canceled"
    ) {
      return NextResponse.json({
        success: true,
        alreadyCancelled: true,
        orderId: order.id,
      });
    }

    const commission = Number(
      order.commission_amount || 0
    );

    /*
     * Get producer
     */
    const { data: producer, error: producerError } =
      await supabase
        .from("users")
        .select("id, full_name, balance")
        .eq("id", order.producer_id)
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

    /*
     * Get consumer
     */
    const { data: consumer, error: consumerError } =
      await supabase
        .from("users")
        .select("id, full_name, balance")
        .eq("id", order.consumer_id)
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
     * Reverse the financial operation
     *
     * Producer previously:
     * + commission
     *
     * Consumer previously:
     * - commission
     *
     * Cancellation:
     * Producer - commission
     * Consumer + commission
     */
    const producerNewBalance = Number(
      (Number(producer.balance || 0) - commission).toFixed(2)
    );

    const consumerNewBalance = Number(
      (Number(consumer.balance || 0) + commission).toFixed(2)
    );

    /*
     * Update producer
     */
    const { error: producerBalanceError } =
      await supabase
        .from("users")
        .update({
          balance: producerNewBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", producer.id);

    if (producerBalanceError) {
      console.error(
        "CANCEL PRODUCER BALANCE ERROR:",
        producerBalanceError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Failed to update producer balance",
        },
        { status: 500 }
      );
    }

    /*
     * Update consumer
     */
    const { error: consumerBalanceError } =
      await supabase
        .from("users")
        .update({
          balance: consumerNewBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", consumer.id);

    if (consumerBalanceError) {
      console.error(
        "CANCEL CONSUMER BALANCE ERROR:",
        consumerBalanceError
      );

      /*
       * Roll producer back
       */
      await supabase
        .from("users")
        .update({
          balance: Number(producer.balance || 0),
          updated_at: new Date().toISOString(),
        })
        .eq("id", producer.id);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to update consumer balance",
        },
        { status: 500 }
      );
    }

    /*
     * Reverse transactions
     */
    const { error: transactionError } = await supabase
      .from("transactions")
      .insert([
        {
          user_id: producer.id,
          amount: -commission,
          type: "order_cancel",
          description: `عكس عمولة إلغاء أوردر #${order.order_number}`,
          reference_id: order.id,
        },
        {
          user_id: consumer.id,
          amount: commission,
          type: "order_cancel",
          description: `استرداد عمولة إلغاء أوردر #${order.order_number}`,
          reference_id: order.id,
        },
      ]);

    if (transactionError) {
      console.error(
        "CANCEL TRANSACTION ERROR:",
        transactionError
      );

      /*
       * Roll balances back
       */
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

      return NextResponse.json(
        {
          success: false,
          error: "Failed to create cancellation transactions",
        },
        { status: 500 }
      );
    }

    /*
     * Mark order cancelled
     */
    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateOrderError) {
      console.error(
        "CANCEL ORDER STATUS ERROR:",
        updateOrderError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Financial reversal completed but order status update failed",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      commissionReversed: commission,
      producer: {
        id: producer.id,
        name: producer.full_name,
        balanceAfter: producerNewBalance,
      },
      consumer: {
        id: consumer.id,
        name: consumer.full_name,
        balanceAfter: consumerNewBalance,
      },
    });
  } catch (error) {
    console.error("BOT CANCEL ORDER ERROR:", error);

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