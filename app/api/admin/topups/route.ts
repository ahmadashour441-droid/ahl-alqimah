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

async function getAuthUser(request: Request) {
  const authHeader =
    request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);

  const {
    data,
    error,
  } = await supabaseAuth.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

async function checkAdmin(userId: string) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("users")
    .select(
      "id, role, is_active"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    console.error(
      "ADMIN CHECK ERROR:",
      error
    );

    return false;
  }

  return (
    data.role === "admin" &&
    data.is_active === true
  );
}

/* =====================================================
   GET
   جلب طلبات الشحن
   ===================================================== */

export async function GET(
  request: Request
) {
  try {
    const authUser =
      await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json(
        {
          error:
            "جلسة الدخول غير صالحة",
        },
        { status: 401 }
      );
    }

    const admin =
      await checkAdmin(authUser.id);

    if (!admin) {
      return NextResponse.json(
        {
          error:
            "ليس لديك صلاحية للوصول إلى طلبات الشحن",
        },
        { status: 403 }
      );
    }

    const {
      data: requests,
      error,
    } = await supabaseAdmin
      .from("topup_requests")
      .select(
        "id, user_id, amount, payment_method, notes, status, reviewed_by, reviewed_at, created_at, receipt_path, receipt_name, receipt_type, receipt_size"
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "TOPUPS GET ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            "تعذر تحميل طلبات الشحن",
          details:
            error.message,
        },
        { status: 500 }
      );
    }

    const userIds = [
      ...new Set(
        (requests || []).map(
          (item) => item.user_id
        )
      ),
    ];

    let users: {
      id: string;
      full_name: string;
      phone: string;
    }[] = [];

    if (userIds.length > 0) {
      const {
        data,
        error: usersError,
      } = await supabaseAdmin
        .from("users")
        .select(
          "id, full_name, phone"
        )
        .in("id", userIds);

      if (usersError) {
        console.error(
          "TOPUPS USERS ERROR:",
          usersError
        );

        return NextResponse.json(
          {
            error:
              "تعذر تحميل بيانات المستخدمين",
            details:
              usersError.message,
          },
          { status: 500 }
        );
      }

      users = data || [];
    }

    const result =
      await Promise.all(
        (requests || []).map(
          async (item) => {
            const user =
              users.find(
                (u) =>
                  u.id ===
                  item.user_id
              );

            let receiptUrl =
              null;

            /*
             * إنشاء رابط مؤقت للوصل
             * لأن الـBucket Private
             */
            if (item.receipt_path) {
              const {
                data: signedUrlData,
                error:
                  signedUrlError,
              } =
                await supabaseAdmin.storage
                  .from(
                    "topup-receipts"
                  )
                  .createSignedUrl(
                    item.receipt_path,
                    60 * 60
                  );

              if (
                signedUrlError
              ) {
                console.error(
                  "RECEIPT SIGNED URL ERROR:",
                  signedUrlError
                );
              } else {
                receiptUrl =
                  signedUrlData?.signedUrl ||
                  null;
              }
            }

            return {
              id: item.id,
              user_id:
                item.user_id,

              amount: Number(
                item.amount
              ),

              payment_method:
                item.payment_method,

              notes: item.notes,

              status: item.status,

              reviewed_by:
                item.reviewed_by,

              reviewed_at:
                item.reviewed_at,

              created_at:
                item.created_at,

              user_name:
                user?.full_name ||
                "غير معروف",

              user_phone:
                user?.phone || "-",

              receipt_path:
                item.receipt_path ||
                null,

              receipt_name:
                item.receipt_name ||
                null,

              receipt_type:
                item.receipt_type ||
                null,

              receipt_size:
                item.receipt_size ||
                null,

              receipt_url:
                receiptUrl,
            };
          }
        )
      );

    return NextResponse.json({
      requests: result,
    });
  } catch (error) {
    console.error(
      "ADMIN TOPUPS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ أثناء تحميل طلبات الشحن",
      },
      { status: 500 }
    );
  }
}

/* =====================================================
   PATCH
   الموافقة / الرفض
   ===================================================== */

export async function PATCH(
  request: Request
) {
  try {
    const authUser =
      await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json(
        {
          error:
            "جلسة الدخول غير صالحة",
        },
        { status: 401 }
      );
    }

    const admin =
      await checkAdmin(authUser.id);

    if (!admin) {
      return NextResponse.json(
        {
          error:
            "ليس لديك صلاحية",
        },
        { status: 403 }
      );
    }

    const body =
      await request.json();

    const requestId =
      String(
        body.id || ""
      ).trim();

    const action =
      String(
        body.action || ""
      ).trim();

    if (!requestId) {
      return NextResponse.json(
        {
          error:
            "رقم طلب الشحن غير موجود",
        },
        { status: 400 }
      );
    }

    if (
      action !== "approve" &&
      action !== "reject"
    ) {
      return NextResponse.json(
        {
          error:
            "الإجراء غير صحيح",
        },
        { status: 400 }
      );
    }

    /* جلب طلب الشحن */

    const {
      data: topup,
      error: topupError,
    } = await supabaseAdmin
      .from("topup_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (topupError) {
      console.error(
        "TOPUP FIND ERROR:",
        topupError
      );

      return NextResponse.json(
        {
          error:
            "تعذر قراءة طلب الشحن",
          details:
            topupError.message,
        },
        { status: 500 }
      );
    }

    if (!topup) {
      return NextResponse.json(
        {
          error:
            "طلب الشحن غير موجود",
        },
        { status: 404 }
      );
    }

    /* منع معالجة الطلب مرتين */

    if (
      topup.status !==
      "pending"
    ) {
      return NextResponse.json(
        {
          error:
            "تم التعامل مع طلب الشحن مسبقًا",
        },
        { status: 409 }
      );
    }

    /* =================================================
       رفض الطلب
       ================================================= */

    if (action === "reject") {
      const {
        data: rejected,
        error: rejectError,
      } = await supabaseAdmin
        .from("topup_requests")
        .update({
          status: "rejected",
          reviewed_by:
            authUser.id,
          reviewed_at:
            new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq(
          "status",
          "pending"
        )
        .select()
        .maybeSingle();

      if (rejectError) {
        console.error(
          "TOPUP REJECT ERROR:",
          rejectError
        );

        return NextResponse.json(
          {
            error:
              "تعذر رفض طلب الشحن",
            details:
              rejectError.message,
          },
          { status: 500 }
        );
      }

      if (!rejected) {
        return NextResponse.json(
          {
            error:
              "تم التعامل مع الطلب مسبقًا",
          },
          { status: 409 }
        );
      }

      /* إشعار المستخدم */

      const {
        error:
          notificationError,
      } = await supabaseAdmin
        .from("notifications")
        .insert({
          user_id:
            topup.user_id,
          title:
            "تم رفض طلب الشحن",
          message: `تم رفض طلب الشحن بقيمة ${Number(
            topup.amount
          ).toFixed(2)} د.أ.`,
          type: "topup",
          is_read: false,
        });

      if (notificationError) {
        console.error(
          "REJECT NOTIFICATION ERROR:",
          notificationError
        );
      }

      return NextResponse.json({
        success: true,
        message:
          "تم رفض طلب الشحن بنجاح",
      });
    }

    /* =================================================
       الموافقة
       ================================================= */

    const amount =
      Number(topup.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "مبلغ الشحن غير صحيح",
        },
        { status: 400 }
      );
    }

    /* جلب المستخدم */

    const {
      data: user,
      error: userError,
    } = await supabaseAdmin
      .from("users")
      .select(
        "id, full_name, balance, is_active"
      )
      .eq(
        "id",
        topup.user_id
      )
      .maybeSingle();

    if (userError) {
      console.error(
        "TOPUP USER ERROR:",
        userError
      );

      return NextResponse.json(
        {
          error:
            "تعذر قراءة بيانات المستخدم",
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
            "المستخدم غير موجود",
        },
        { status: 404 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        {
          error:
            "حساب المستخدم موقوف",
        },
        { status: 403 }
      );
    }

    const oldBalance =
      Number(
        user.balance || 0
      );

    const newBalance =
      oldBalance + amount;

    /* تحديث الرصيد */

    const {
      error: balanceError,
    } = await supabaseAdmin
      .from("users")
      .update({
        balance:
          newBalance,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        user.id
      );

    if (balanceError) {
      console.error(
        "BALANCE UPDATE ERROR:",
        balanceError
      );

      return NextResponse.json(
        {
          error:
            "تعذر تحديث الرصيد",
          details:
            balanceError.message,
        },
        { status: 500 }
      );
    }

    /* تسجيل الحركة المالية */

    const {
      data: transaction,
      error:
        transactionError,
    } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id:
          user.id,

        transaction_type:
          "topup",

        amount:
          amount,

        balance_before:
          oldBalance,

        balance_after:
          newBalance,

        order_id:
          null,

        week_id:
          null,

        description:
          `شحن رصيد بقيمة ${amount.toFixed(
            2
          )} د.أ`,

        created_by:
          authUser.id,
      })
      .select()
      .maybeSingle();

    if (transactionError) {
      console.error(
        "TRANSACTION INSERT ERROR:",
        transactionError
      );

      /* Rollback الرصيد */

      await supabaseAdmin
        .from("users")
        .update({
          balance:
            oldBalance,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          user.id
        );

      return NextResponse.json(
        {
          error:
            "تعذر تسجيل الحركة المالية، لم تتم إضافة الرصيد",
          details:
            transactionError.message,
        },
        { status: 500 }
      );
    }

    /* تحديث طلب الشحن */

    const {
      data: approved,
      error:
        approveError,
    } = await supabaseAdmin
      .from("topup_requests")
      .update({
        status:
          "approved",
        reviewed_by:
          authUser.id,
        reviewed_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        requestId
      )
      .eq(
        "status",
        "pending"
      )
      .select()
      .maybeSingle();

    if (
      approveError ||
      !approved
    ) {
      console.error(
        "TOPUP APPROVE STATUS ERROR:",
        approveError
      );

      /* Rollback الرصيد */

      await supabaseAdmin
        .from("users")
        .update({
          balance:
            oldBalance,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          user.id
        );

      /* حذف الحركة المالية */

      if (transaction?.id) {
        await supabaseAdmin
          .from("transactions")
          .delete()
          .eq(
            "id",
            transaction.id
          );
      }

      return NextResponse.json(
        {
          error:
            "تعذر إكمال الموافقة على طلب الشحن",
        },
        { status: 500 }
      );
    }

    /* إشعار المستخدم */

    const {
      error:
        notificationError,
    } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id:
          user.id,

        title:
          "تمت الموافقة على شحن الرصيد",

        message: `تمت إضافة ${amount.toFixed(
          2
        )} د.أ إلى رصيدك. رصيدك الحالي ${newBalance.toFixed(
          2
        )} د.أ.`,

        type:
          "topup",

        is_read:
          false,
      });

    if (notificationError) {
      console.error(
        "APPROVE NOTIFICATION ERROR:",
        notificationError
      );
    }

    return NextResponse.json({
      success: true,

      message:
        "تمت الموافقة على طلب الشحن وإضافة المبلغ إلى الرصيد",

      balance_before:
        oldBalance,

      amount:
        amount,

      balance_after:
        newBalance,
    });
  } catch (error) {
    console.error(
      "ADMIN TOPUPS PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ غير متوقع أثناء معالجة طلب الشحن",
      },
      { status: 500 }
    );
  }
}