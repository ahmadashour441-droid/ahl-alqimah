"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowRight,
  Wallet,
  Banknote,
  Building2,
  Smartphone,
  FileText,
  Send,
  CheckCircle2,
  AlertCircle,
  Info,
  Loader2,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function TopUpPage() {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState("cash");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setError("");

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError("أدخل مبلغ شحن صحيح");
      return;
    }

    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError(
          "انتهت جلسة الدخول، يرجى تسجيل الدخول مرة أخرى"
        );
        return;
      }

      const response = await fetch(
        "/api/finance/topup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            amount: numericAmount,
            payment_method: paymentMethod,
            notes: notes.trim() || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "تعذر إرسال طلب الشحن"
        );
      }

      setMessage(
        "تم إرسال طلب الشحن بنجاح، بانتظار موافقة الإدارة"
      );

      setAmount("");
      setPaymentMethod("cash");
      setNotes("");
    } catch (err) {
      console.error("TOPUP ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "تعذر إرسال طلب الشحن"
      );
    } finally {
      setLoading(false);
    }
  }

  const paymentMethods = [
    {
      value: "cash",
      title: "نقدي",
      description: "دفع مباشر",
      icon: (
        <Banknote
          size={19}
          strokeWidth={1.7}
        />
      ),
    },
    {
      value: "bank_transfer",
      title: "تحويل بنكي",
      description: "تحويل إلى الحساب",
      icon: (
        <Building2
          size={19}
          strokeWidth={1.7}
        />
      ),
    },
    {
      value: "wallet",
      title: "محفظة إلكترونية",
      description: "دفع إلكتروني",
      icon: (
        <Smartphone
          size={19}
          strokeWidth={1.7}
        />
      ),
    },
  ];

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#0b0d10] text-white"
    >
      <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-5 sm:px-6">

        {/* Header */}

        <header className="mb-6 flex items-center justify-between">

          <Link
            href="/finance"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#12151a] text-white/55 transition hover:border-[#d6a84f]/30 hover:text-[#d6a84f]"
          >
            <ArrowRight
              size={19}
              strokeWidth={1.8}
            />
          </Link>

          <div className="text-center">

            <h1 className="text-lg font-black tracking-wide text-[#d6a84f]">
              أهل القمة
            </h1>

            <p className="mt-0.5 text-[11px] text-white/35">
              المالية
            </p>

          </div>

          <div className="h-11 w-11" />

        </header>

        {/* Page Title */}

        <section className="mb-5 rounded-[26px] border border-white/10 bg-gradient-to-br from-[#171a20] to-[#101216] p-5">

          <div className="flex items-center gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#d6a84f]/25 bg-[#d6a84f]/10 text-[#d6a84f]">
              <Wallet
                size={22}
                strokeWidth={1.7}
              />
            </div>

            <div>

              <h2 className="text-lg font-black">
                طلب شحن الرصيد
              </h2>

              <p className="mt-1 text-[11px] leading-5 text-white/35">
                أرسل طلب شحن وانتظر مراجعة الإدارة.
              </p>

            </div>

          </div>

        </section>

        {/* Form */}

        <section className="rounded-[26px] border border-white/10 bg-[#12151a] p-4 sm:p-6">

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* Amount */}

            <div>

              <label className="mb-2 block text-xs font-bold text-white/60">
                مبلغ الشحن
              </label>

              <div className="relative">

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value)
                  }
                  placeholder="مثال: 20"
                  dir="ltr"
                  className="w-full rounded-2xl border border-white/10 bg-[#181b20] px-4 py-4 pl-16 text-right text-lg font-bold text-white outline-none transition placeholder:text-white/15 focus:border-[#d6a84f]/40 focus:ring-4 focus:ring-[#d6a84f]/5"
                />

                <span className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg bg-[#d6a84f]/10 px-2 py-1 text-xs font-bold text-[#d6a84f]">
                  د.أ
                </span>

              </div>

            </div>

            {/* Payment Method */}

            <div>

              <label className="mb-2 block text-xs font-bold text-white/60">
                طريقة الدفع
              </label>

              <div className="grid gap-2">

                {paymentMethods.map(
                  (method) => {
                    const selected =
                      paymentMethod ===
                      method.value;

                    return (
                      <button
                        key={
                          method.value
                        }
                        type="button"
                        onClick={() =>
                          setPaymentMethod(
                            method.value
                          )
                        }
                        className={`flex items-center gap-3 rounded-2xl border p-3 text-right transition ${
                          selected
                            ? "border-[#d6a84f]/35 bg-[#d6a84f]/10"
                            : "border-white/7 bg-[#181b20] hover:border-white/15"
                        }`}
                      >

                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            selected
                              ? "bg-[#d6a84f]/15 text-[#d6a84f]"
                              : "bg-white/[0.04] text-white/35"
                          }`}
                        >
                          {method.icon}
                        </span>

                        <span className="min-w-0 flex-1">

                          <span
                            className={`block text-xs font-bold ${
                              selected
                                ? "text-[#d6a84f]"
                                : "text-white/70"
                            }`}
                          >
                            {method.title}
                          </span>

                          <span className="mt-1 block text-[10px] text-white/25">
                            {method.description}
                          </span>

                        </span>

                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                            selected
                              ? "border-[#d6a84f] bg-[#d6a84f]"
                              : "border-white/15"
                          }`}
                        >
                          {selected && (
                            <span className="h-2 w-2 rounded-full bg-[#0b0d10]" />
                          )}
                        </span>

                      </button>
                    );
                  }
                )}

              </div>

            </div>

            {/* Notes */}

            <div>

              <label className="mb-2 block text-xs font-bold text-white/60">
                ملاحظات
                <span className="mr-1 text-[10px] font-normal text-white/25">
                  اختياري
                </span>
              </label>

              <div className="relative">

                <textarea
                  value={notes}
                  onChange={(e) =>
                    setNotes(e.target.value)
                  }
                  placeholder="أي ملاحظات إضافية..."
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-[#181b20] px-4 py-3 pr-11 text-sm text-white outline-none transition placeholder:text-white/15 focus:border-[#d6a84f]/40 focus:ring-4 focus:ring-[#d6a84f]/5"
                />

                <FileText
                  size={16}
                  className="absolute right-4 top-4 text-white/20"
                  strokeWidth={1.7}
                />

              </div>

            </div>

            {/* Messages */}

            {message && (
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-xs leading-5 text-emerald-400">

                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0"
                  strokeWidth={1.8}
                />

                <span>
                  {message}
                </span>

              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs leading-5 text-red-400">

                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                  strokeWidth={1.8}
                />

                <span>
                  {error}
                </span>

              </div>
            )}

            {/* Submit */}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d6a84f] px-5 py-4 text-sm font-black text-[#0b0d10] shadow-lg shadow-[#d6a84f]/5 transition hover:bg-[#e1b65d] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >

              {loading ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                    strokeWidth={2}
                  />

                  جاري إرسال الطلب...
                </>
              ) : (
                <>
                  <Send
                    size={18}
                    strokeWidth={1.9}
                  />

                  إرسال طلب الشحن
                </>
              )}

            </button>

          </form>

        </section>

        {/* Information */}

        <section className="mt-4 rounded-[22px] border border-[#d6a84f]/10 bg-[#d6a84f]/5 p-4">

          <div className="flex items-start gap-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
              <Info
                size={17}
                strokeWidth={1.7}
              />
            </div>

            <div>

              <p className="text-xs font-bold text-[#d6a84f]">
                ملاحظة مهمة
              </p>

              <p className="mt-1 text-[10px] leading-5 text-white/35">
                لن تتم إضافة المبلغ إلى رصيدك
                مباشرة. تتم إضافة الرصيد فقط بعد
                مراجعة الإدارة والموافقة على طلب
                الشحن.
              </p>

            </div>

          </div>

        </section>

        {/* Back */}

        <Link
          href="/finance"
          className="mt-5 flex items-center justify-center gap-2 text-[11px] text-white/25 transition hover:text-[#d6a84f]"
        >
          <ArrowRight
            size={14}
            strokeWidth={1.7}
          />
          العودة إلى المالية
        </Link>

      </div>
    </main>
  );
}