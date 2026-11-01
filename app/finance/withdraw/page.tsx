"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowRight,
  ArrowDownCircle,
  Wallet,
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

export default function WithdrawPage() {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    try {
      setLoading(true);
      setMessage("");
      setError("");

      const numericAmount = Number(amount);

      if (
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0
      ) {
        throw new Error(
          "أدخل مبلغ سحب صحيح"
        );
      }

      const {
        data: sessionData,
      } = await supabase.auth.getSession();

      const token =
        sessionData.session?.access_token;

      if (!token) {
        throw new Error(
          "جلسة الدخول غير موجودة"
        );
      }

      const response = await fetch(
        "/api/finance/withdraw",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: numericAmount,
            notes: notes.trim() || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "تعذر إرسال طلب السحب"
        );
      }

      setMessage(
        "تم إرسال طلب السحب بنجاح، بانتظار موافقة الإدارة"
      );

      setAmount("");
      setNotes("");
    } catch (err) {
      console.error(
        "WITHDRAW ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "تعذر إرسال طلب السحب"
      );
    } finally {
      setLoading(false);
    }
  }

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

        {/* Page Header */}

        <section className="mb-5 rounded-[26px] border border-white/10 bg-gradient-to-br from-[#171a20] to-[#101216] p-5">

          <div className="flex items-center gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#d6a84f]/25 bg-[#d6a84f]/10 text-[#d6a84f]">
              <ArrowDownCircle
                size={22}
                strokeWidth={1.7}
              />
            </div>

            <div>

              <h2 className="text-lg font-black">
                طلب سحب الرصيد
              </h2>

              <p className="mt-1 text-[11px] leading-5 text-white/35">
                اطلب سحب المبلغ المستحق لك
                وانتظر مراجعة الإدارة.
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

            {/* Amount */}

            <div>

              <label className="mb-2 block text-xs font-bold text-white/60">
                مبلغ السحب
              </label>

              <div className="relative">

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      event.target.value
                    )
                  }
                  placeholder="مثال: 25"
                  dir="ltr"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-[#181b20] px-4 py-4 pl-16 text-right text-lg font-bold text-white outline-none transition placeholder:text-white/15 focus:border-[#d6a84f]/40 focus:ring-4 focus:ring-[#d6a84f]/5"
                />

                <span className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg bg-[#d6a84f]/10 px-2 py-1 text-xs font-bold text-[#d6a84f]">
                  د.أ
                </span>

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
                  onChange={(event) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  rows={5}
                  placeholder="أي ملاحظات إضافية..."
                  className="w-full resize-none rounded-2xl border border-white/10 bg-[#181b20] px-4 py-3 pr-11 text-sm text-white outline-none transition placeholder:text-white/15 focus:border-[#d6a84f]/40 focus:ring-4 focus:ring-[#d6a84f]/5"
                />

                <FileText
                  size={16}
                  className="absolute right-4 top-4 text-white/20"
                  strokeWidth={1.7}
                />

              </div>

            </div>

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

                  إرسال طلب السحب
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
                يتم إرسال الطلب إلى الإدارة
                للمراجعة. عند الموافقة يتم خصم
                المبلغ من رصيدك وتسجيل الحركة
                المالية.
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