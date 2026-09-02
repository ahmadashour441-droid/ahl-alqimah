"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useState,
} from "react";
import {
  ArrowRight,
  Wallet,
  Upload,
  FileText,
  Send,
  CheckCircle2,
  AlertCircle,
  Info,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function TopUpPage() {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] =
    useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setError("");

    const file =
      event.target.files?.[0] || null;

    if (!file) {
      setReceipt(null);
      return;
    }

    const maxFileSize =
      10 * 1024 * 1024;

    if (file.size > maxFileSize) {
      setReceipt(null);
      event.target.value = "";
      setError(
        "حجم الملف كبير جدًا. الحد الأقصى المسموح 10MB"
      );
      return;
    }

    setReceipt(file);
  }

  async function copyText(
    text: string,
    key: string
  ) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);

      setTimeout(() => {
        setCopied("");
      }, 1800);
    } catch {
      // تجاهل خطأ النسخ
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setError("");

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError("أدخل مبلغ شحن صحيح");
      return;
    }

    if (
      Math.round(numericAmount * 100) !==
      numericAmount * 100
    ) {
      setError(
        "المبلغ يجب أن يحتوي على منزلتين عشريتين كحد أقصى"
      );
      return;
    }

    if (!receipt) {
      setError(
        "يرجى إرفاق صورة أو ملف الوصل"
      );
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

      const formData = new FormData();

      formData.append(
        "amount",
        String(numericAmount)
      );

      formData.append(
        "notes",
        notes.trim()
      );

      formData.append(
        "receipt",
        receipt
      );

      const response = await fetch(
        "/api/finance/topup",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const result =
        await response.json();

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
      setNotes("");
      setReceipt(null);

      const fileInput =
        document.getElementById(
          "receipt"
        ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (err) {
      console.error(
        "TOPUP ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "تعذر إرسال طلب الشحن"
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
                حوّل المبلغ ثم أرفق صورة أو ملف الوصل
                لإرسال طلب الشحن.
              </p>

            </div>

          </div>

        </section>

        {/* Transfer Information */}

        <section className="mb-4 rounded-[26px] border border-[#d6a84f]/15 bg-[#12151a] p-4 sm:p-5">

          <div className="mb-4 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
              <Wallet
                size={18}
                strokeWidth={1.7}
              />
            </div>

            <div>

              <h3 className="text-sm font-black text-white">
                معلومات التحويل
              </h3>

              <p className="mt-1 text-[10px] text-white/30">
                استخدم إحدى طرق التحويل التالية
              </p>

            </div>


            {/* Orange Money */}

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/7 bg-[#181b20] p-3">

              <div>

                <p className="text-[10px] text-white/30">
                  Orange Money
                </p>

                <p className="mt-1 text-sm font-bold text-white">
                  0772660010
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  copyText(
                    "0772660010",
                    "orange"
                  )
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-white/35 transition hover:bg-[#d6a84f]/10 hover:text-[#d6a84f]"
              >
                {copied === "orange" ? (
                  <Check
                    size={16}
                  />
                ) : (
                  <Copy
                    size={16}
                  />
                )}
              </button>

            </div>

            {/* Bank */}

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/7 bg-[#181b20] p-3">

              <div>

                <p className="text-[10px] text-white/30">
                  بنك الاتحاد
                </p>

                <p className="mt-1 text-sm font-bold text-white">
                  OD3IDAD
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  copyText(
                    "OD3IDAD",
                    "bank"
                  )
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-white/35 transition hover:bg-[#d6a84f]/10 hover:text-[#d6a84f]"
              >
                {copied === "bank" ? (
                  <Check
                    size={16}
                  />
                ) : (
                  <Copy
                    size={16}
                  />
                )}
              </button>

            </div>

            {/* Name */}

            <div className="rounded-2xl border border-white/7 bg-[#181b20] p-3">

              <p className="text-[10px] text-white/30">
                اسم المستفيد
              </p>

              <p className="mt-1 text-sm font-bold text-[#d6a84f]">
                Ahmad Mohammad Alhamzat
              </p>

            </div>

          </div>

        </section>

        {/* Accounting Notice */}

        <section className="mb-4 rounded-[22px] border border-[#d6a84f]/15 bg-[#d6a84f]/5 p-4">

          <div className="flex items-start gap-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#d6a84f]/10 text-[#d6a84f]">
              <Info
                size={17}
                strokeWidth={1.7}
              />
            </div>

            <div>

              <p className="text-xs font-black text-[#d6a84f]">
                مهم قبل إرسال الطلب
              </p>

              <p className="mt-1 text-[11px] leading-5 text-white/45">
                عند إرسال طلب شحن، يرجى إرسال الوصل
                للمحاسبة على الرقم التالي:
              </p>

              <p
                dir="ltr"
                className="mt-2 text-base font-black tracking-wide text-white"
              >
                0776496653
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
                مبلغ الشحن
              </label>

              <div className="relative">

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) =>
                    setAmount(
                      e.target.value
                    )
                  }
                  placeholder="مثال: 20"
                  dir="ltr"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-[#181b20] px-4 py-4 pl-16 text-right text-lg font-bold text-white outline-none transition placeholder:text-white/15 focus:border-[#d6a84f]/40 focus:ring-4 focus:ring-[#d6a84f]/5"
                />

                <span className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg bg-[#d6a84f]/10 px-2 py-1 text-xs font-bold text-[#d6a84f]">
                  د.أ
                </span>

              </div>

            </div>

            {/* Receipt */}

            <div>

              <label className="mb-2 block text-xs font-bold text-white/60">
                إرفاق الوصل
                <span className="mr-1 text-[10px] font-normal text-red-400">
                  مطلوب
                </span>
              </label>

              <label
                htmlFor="receipt"
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#d6a84f]/25 bg-[#181b20] px-4 py-7 text-center transition hover:border-[#d6a84f]/50 hover:bg-[#d6a84f]/5"
              >

                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d6a84f]/10 text-[#d6a84f]">
                  <Upload
                    size={21}
                    strokeWidth={1.7}
                  />
                </span>

                <span className="mt-3 text-xs font-bold text-white/70">
                  {receipt
                    ? receipt.name
                    : "اضغط لإرفاق الوصل"}
                </span>

                <span className="mt-1 text-[10px] text-white/25">
                  يمكنك إرفاق صورة أو ملف الوصل
                  — الحد الأقصى 10MB
                </span>

                {receipt && (
                  <span className="mt-2 flex items-center gap-1 text-[10px] text-[#d6a84f]">
                    <FileText
                      size={13}
                    />
                    تم اختيار الملف بنجاح
                  </span>
                )}

                <input
                  id="receipt"
                  type="file"
                  onChange={
                    handleFileChange
                  }
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                />

              </label>

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
                    setNotes(
                      e.target.value
                    )
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

        {/* Bottom Note */}

        <section className="mt-4 rounded-[22px] border border-white/10 bg-[#12151a] p-4">

          <div className="flex items-start gap-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-white/30">
              <Info
                size={17}
                strokeWidth={1.7}
              />
            </div>

            <div>

              <p className="text-xs font-bold text-white/60">
                ملاحظة
              </p>

              <p className="mt-1 text-[10px] leading-5 text-white/30">
                لن تتم إضافة المبلغ إلى رصيدك مباشرة.
                تتم إضافة الرصيد فقط بعد مراجعة الإدارة
                والموافقة على طلب الشحن.
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