import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

async function getAuthenticatedAdmin(request: Request) {
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

  const admin = getAdminClient();

  const { data: user, error: userError } = await admin
    .from("users")
    .select("id, full_name, phone, role, balance, is_active")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (userError || !user) {
    return {
      error: NextResponse.json(
        { error: "تعذر قراءة بيانات المستخدم" },
        { status: 500 }
      ),
    };
  }

  if (user.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "ليس لديك صلاحية الوصول" },
        { status: 403 }
      ),
    };
  }

  return {
    admin,
    authUser: authData.user,
  };
}

// =========================
// GET - عرض طلبات السحب
// =========================

export async function GET(request: Request) {
  try {
    const result = await getAuthenticatedAdmin(request);

    if ("error" in result) {
      return result.error;
    }

    const { admin } = result;

    const { data: requests, error } = await admin
      .from("withdrawal_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("WITHDRAWALS GET ERROR:", error);

      return NextResponse.json(
        {
          error: "تعذر تحميل طلبات السحب",
          details: error.message,
        },
        { status: 500 }
      );
    }

    const userIds = [
      ...new Set(
        (requests || [])
          .map((request) => request.user_id)
          .filter(Boolean)
      ),
    ];

    let users: any[] = [];

    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await admin
        .from("users")
        .select("id, full_name, phone, balance")
        .in("id", userIds);

      if (usersError) {
        console.error("WITHDRAWALS USERS ERROR:", usersError);
      } else {
        users = usersData || [];
      }
    }

    const requestsWithUsers = (requests || []).map((request) => {
      const user = users.find((item) => item.id === request.user_id);

      return {
        ...request,
        user: user || null,
      };
    });

    return NextResponse.json({
      requests: requestsWithUsers,
    });
  } catch (error) {
    console.error("WITHDRAWALS GET SERVER ERROR:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء تحميل طلبات السحب" },
      { status: 500 }
    );
  }
}

// =========================
// PATCH - موافقة / رفض
// =========================

export async function PATCH(request: Request) {
  try {
    const result = await getAuthenticatedAdmin(request);

    if ("error" in result) {
      return result.error;
    }

    const { admin, authUser } = result;

    const body = await request.json();

    const requestId = body.requestId;
    const action = body.action;

    if (!requestId) {
      return NextResponse.json(
        { error: "رقم طلب السحب مفقود" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "الإجراء غير صحيح" },
        { status: 400 }
      );
    }

    // جلب طلب السحب
    const { data: withdrawal, error: withdrawalError } = await admin
      .from("withdrawal_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (withdrawalError) {
      console.error("WITHDRAWAL FETCH ERROR:", withdrawalError);

      return NextResponse.json(
        {
          error: "تعذر قراءة طلب السحب",
          details: withdrawalError.message,
        },
        { status: 500 }
      );
    }

    if (!withdrawal) {
      return NextResponse.json(
        { error: "طلب السحب غير موجود" },
        { status: 404 }
      );
    }

    // لا يمكن معالجة الطلب أكثر من مرة
    if (withdrawal.status !== "pending") {
      return NextResponse.json(
        {
          error: "تمت معالجة هذا الطلب مسبقاً",
          status: withdrawal.status,
        },
        { status: 400 }
      );
    }

    const amount = Number(withdrawal.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "مبلغ السحب غير صحيح" },
        { status: 400 }
      );
    }

    // =========================
    // رفض الطلب
    // =========================

    if (action === "reject") {
      const { error: rejectError } = await admin
        .from("withdrawal_requests")
        .update({
          status: "rejected",
          reviewed_by: authUser.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("status", "pending");

      if (rejectError) {
        console.error("WITHDRAWAL REJECT ERROR:", rejectError);

        return NextResponse.json(
          {
            error: "تعذر رفض طلب السحب",
            details: rejectError.message,
          },
          { status: 500 }
        );
      }

      await admin.from("notifications").insert({
        user_id: withdrawal.user_id,
        title: "تم رفض طلب السحب",
        message: `تم رفض طلب السحب بقيمة ${amount.toFixed(2)} د.أ.`,
        type: "withdrawal",
        is_read: false,
      });

      return NextResponse.json({
        success: true,
        message: "تم رفض طلب السحب بنجاح",
      });
    }

    // =========================
    // موافقة على السحب
    // =========================

    const { data: user, error: userError } = await admin
      .from("users")
      .select("id, full_name, phone, balance, is_active")
      .eq("id", withdrawal.user_id)
      .maybeSingle();

    if (userError) {
      console.error("WITHDRAWAL USER ERROR:", userError);

      return NextResponse.json(
        {
          error: "تعذر قراءة رصيد المستخدم",
          details: userError.message,
        },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: "هذا المستخدم غير نشط" },
        { status: 400 }
      );
    }

    const oldBalance = Number(user.balance || 0);

    // التأكد من توفر الرصيد
    if (oldBalance < amount) {
      return NextResponse.json(
        {
          error: "الرصيد غير كافٍ للموافقة على طلب السحب",
          balance: oldBalance,
          requested: amount,
        },
        { status: 400 }
      );
    }

    const newBalance = oldBalance - amount;

    // تحديث الرصيد
    const { error: balanceError } = await admin
      .from("users")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (balanceError) {
      console.error("WITHDRAWAL BALANCE ERROR:", balanceError);

      return NextResponse.json(
        {
          error: "تعذر تحديث رصيد المستخدم",
          details: balanceError.message,
        },
        { status: 500 }
      );
    }

    // تسجيل الحركة المالية
    const { error: transactionError } = await admin
      .from("transactions")
      .insert({
        user_id: user.id,
        transaction_type: "withdrawal",
        amount: -amount,
        balance_before: oldBalance,
        balance_after: newBalance,
        order_id: null,
        week_id: null,
        description: `سحب رصيد بقيمة ${amount.toFixed(2)} د.أ`,
        created_by: authUser.id,
      });

    // إذا فشل تسجيل الحركة، نحاول إرجاع الرصيد
    if (transactionError) {
      console.error(
        "WITHDRAWAL TRANSACTION ERROR:",
        transactionError
      );

      await admin
        .from("users")
        .update({
          balance: oldBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      return NextResponse.json(
        {
          error: "تعذر تسجيل الحركة المالية، لم تتم عملية السحب",
          details: transactionError.message,
        },
        { status: 500 }
      );
    }

    // تحديث حالة الطلب
    const { error: approveError } = await admin
      .from("withdrawal_requests")
      .update({
        status: "approved",
        reviewed_by: authUser.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "pending");

    // إذا فشل تحديث الطلب، نرجع الرصيد ونحذف الحركة
    if (approveError) {
      console.error(
        "WITHDRAWAL APPROVE UPDATE ERROR:",
        approveError
      );

      await admin
        .from("users")
        .update({
          balance: oldBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      await admin
        .from("transactions")
        .delete()
        .eq("user_id", user.id)
        .eq("transaction_type", "withdrawal")
        .eq("amount", -amount)
        .eq("balance_before", oldBalance)
        .eq("balance_after", newBalance)
        .eq("created_by", authUser.id)
        .order("created_at", { ascending: false })
        .limit(1);

      return NextResponse.json(
        {
          error: "تعذر تحديث حالة طلب السحب",
          details: approveError.message,
        },
        { status: 500 }
      );
    }

    // إشعار المستخدم
    await admin.from("notifications").insert({
      user_id: user.id,
      title: "تمت الموافقة على طلب السحب",
      message: `تمت الموافقة على سحب ${amount.toFixed(
        2
      )} د.أ. رصيدك الحالي ${newBalance.toFixed(2)} د.أ.`,
      type: "withdrawal",
      is_read: false,
    });

    return NextResponse.json({
      success: true,
      message: "تمت الموافقة على طلب السحب بنجاح",
      balance: newBalance,
    });
  } catch (error) {
    console.error("WITHDRAWALS PATCH SERVER ERROR:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة طلب السحب" },
      { status: 500 }
    );
  }
}