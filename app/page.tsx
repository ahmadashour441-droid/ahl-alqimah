"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  LockKeyhole,
  Phone,
  LogIn,
  ShieldCheck,
  Eye,
  EyeOff,
  Flame,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

export default function LoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError("");

    const cleanPhone = phone.replace(/\s+/g, "").trim();

    if (!/^07\d{8}$/.test(cleanPhone)) {
      setError("يرجى إدخال رقم هاتف صحيح");
      return;
    }

    if (!password) {
      setError("يرجى إدخال كلمة المرور");
      return;
    }

    try {
      setLoading(true);

      const email = `${cleanPhone}@captainsystem.com`;

      console.log("LOGIN START");
      console.log("PHONE:", cleanPhone);

      const {
        data: authData,
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log("SUPABASE LOGIN:", {
        success: !!authData?.user,
        error: loginError?.message,
      });

      if (loginError || !authData.user) {
        setError("رقم الهاتف أو كلمة المرور غير صحيحة");
        return;
      }

      const accessToken = authData.session?.access_token;

      if (!accessToken) {
        await supabase.auth.signOut();
        setError("تعذر إنشاء جلسة الدخول");
        return;
      }

      console.log("SESSION CREATED");

      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 10000);

      let response: Response;

      try {
        response = await fetch("/api/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          cache: "no-store",
          signal: controller.signal,
        });
      } catch (fetchError) {
        clearTimeout(timeout);

        console.error("AUTH ME FETCH ERROR:", fetchError);

        await supabase.auth.signOut();

        setError(
          "تعذر الاتصال بالسيرفر. تأكد أن الهاتف والكمبيوتر على نفس شبكة Wi-Fi.",
        );

        return;
      }

      clearTimeout(timeout);

      console.log("AUTH ME STATUS:", response.status);

      let result: any = null;

      try {
        result = await response.json();
      } catch (jsonError) {
        console.error("AUTH ME JSON ERROR:", jsonError);

        await supabase.auth.signOut();

        setError("السيرفر أرسل استجابة غير صحيحة");
        return;
      }

      console.log("AUTH ME RESULT:", result);

      if (!response.ok || !result?.user) {
        await supabase.auth.signOut();

        setError(
          result?.error ||
            result?.message ||
            "تعذر تحميل بيانات الحساب",
        );

        return;
      }

      if (!result.user.is_active) {
        await supabase.auth.signOut();

        setError(
          "هذا الحساب موقوف، يرجى التواصل مع الإدارة",
        );

        return;
      }

      localStorage.setItem(
        "user",
        JSON.stringify(result.user),
      );

      localStorage.setItem(
        "access_token",
        accessToken,
      );

      console.log("LOGIN SUCCESS");

      if (result.user.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    } catch (err: any) {
      console.error("LOGIN ERROR:", err);

      if (err?.name === "AbortError") {
        setError(
          "الاتصال بالسيرفر استغرق وقتًا طويلًا. تأكد من اتصال الهاتف بالشبكة.",
        );
      } else {
        setError("حدث خطأ أثناء تسجيل الدخول");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#050505] text-white"
    >
      {/* =========================
          Animated Background
      ========================= */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(212,175,55,0.13),transparent_35%)]" />

        <div className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-[#d4af37]/10 blur-[120px]" />
        <div className="absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-orange-600/10 blur-[140px]" />

        {/* Flame 1 */}
        <div className="absolute bottom-[-90px] left-[8%] opacity-30 blur-[1px]">
          <div className="flame flame-one" />
        </div>

        {/* Flame 2 */}
        <div className="absolute bottom-[-110px] right-[10%] opacity-25 blur-[1px]">
          <div className="flame flame-two" />
        </div>

        {/* Flame 3 */}
        <div className="absolute bottom-[-120px] left-[45%] opacity-20 blur-[2px]">
          <div className="flame flame-three" />
        </div>

        {/* Floating sparks */}
        <span className="spark spark-one" />
        <span className="spark spark-two" />
        <span className="spark spark-three" />
        <span className="spark spark-four" />
        <span className="spark spark-five" />
        <span className="spark spark-six" />
      </div>

      {/* =========================
          Main Content
      ========================= */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* =========================
              Logo / Brand
          ========================= */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-[30px] border border-[#d4af37]/30 bg-[#111111]/90 shadow-[0_0_55px_rgba(212,175,55,0.15)] backdrop-blur-xl">
              <div className="relative">
                <Flame
                  size={48}
                  strokeWidth={1.6}
                  className="text-[#d4af37]"
                />

                <span className="absolute inset-0 animate-pulse text-[#f5d76e] opacity-40 blur-md">
                  <Flame size={48} strokeWidth={2} />
                </span>
              </div>
            </div>

            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
              أهل <span className="text-[#d4af37]">القمة</span>
            </h1>

            <div className="mx-auto mt-4 h-px w-20 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />

            <p className="mt-4 text-sm font-medium text-white/45">
              نظام إدارة الحسابات والطلبات
            </p>
          </div>

          {/* =========================
              Login Card
          ========================= */}
          <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#101010]/90 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:p-8">
            {/* Gold top line */}
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />

            {/* Card glow */}
            <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-[#d4af37]/8 blur-3xl" />

            <div className="relative">
              {/* Header */}
              <div className="mb-7">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck
                    size={19}
                    className="text-[#d4af37]"
                  />

                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d4af37]/80">
                    تسجيل الدخول
                  </span>
                </div>

                <h2 className="text-2xl font-black text-white">
                  أهلاً بك 👋
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/40">
                  أدخل بيانات حسابك للوصول إلى النظام
                </p>
              </div>

              <form
                onSubmit={handleLogin}
                className="space-y-5"
              >
                {/* =========================
                    Phone
                ========================= */}
                <div>
                  <label className="mb-2.5 block text-sm font-bold text-white/75">
                    رقم الهاتف
                  </label>

                  <div className="relative">
                    <Phone
                      size={19}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#d4af37]/70"
                    />

                    <input
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) =>
                        setPhone(e.target.value)
                      }
                      placeholder="079xxxxxxx"
                      dir="ltr"
                      autoComplete="tel"
                      className="w-full rounded-2xl border border-white/10 bg-black/30 py-3.5 pl-4 pr-12 text-right text-white placeholder:text-white/20 outline-none transition-all duration-300 focus:border-[#d4af37]/60 focus:bg-black/45 focus:shadow-[0_0_25px_rgba(212,175,55,0.08)]"
                    />
                  </div>
                </div>

                {/* =========================
                    Password
                ========================= */}
                <div>
                  <label className="mb-2.5 block text-sm font-bold text-white/75">
                    كلمة المرور
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={19}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#d4af37]/70"
                    />

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      placeholder="••••••••"
                      dir="ltr"
                      autoComplete="current-password"
                      className="w-full rounded-2xl border border-white/10 bg-black/30 py-3.5 pl-12 pr-12 text-white outline-none transition-all duration-300 placeholder:text-white/20 focus:border-[#d4af37]/60 focus:bg-black/45 focus:shadow-[0_0_25px_rgba(212,175,55,0.08)]"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) => !value,
                        )
                      }
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 transition hover:text-[#d4af37]"
                      aria-label={
                        showPassword
                          ? "إخفاء كلمة المرور"
                          : "إظهار كلمة المرور"
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* =========================
                    Error
                ========================= */}
                {error && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium leading-6 text-red-300">
                    {error}
                  </div>
                )}

                {/* =========================
                    Login Button
                ========================= */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border border-[#d4af37]/40 bg-gradient-to-r from-[#b99220] via-[#d4af37] to-[#b99220] px-5 py-4 font-black text-black shadow-[0_10px_35px_rgba(212,175,55,0.18)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_12px_45px_rgba(212,175,55,0.28)] disabled:cursor-not-allowed disabled:scale-100 disabled:opacity-50"
                >
                  {/* Button shine */}
                  <span className="absolute inset-y-0 -left-20 w-16 -skew-x-12 bg-white/30 blur-sm transition-all duration-700 group-hover:left-[120%]" />

                  {loading ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                      <span>جاري تسجيل الدخول...</span>
                    </>
                  ) : (
                    <>
                      <LogIn size={19} />
                      <span>تسجيل الدخول</span>
                    </>
                  )}
                </button>
              </form>

              {/* Footer inside card */}
              <div className="mt-7 border-t border-white/7 pt-5 text-center">
                <p className="text-xs text-white/25">
                  نظام آمن ومخصص لإدارة الحسابات والطلبات
                </p>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <p className="mt-6 text-center text-[11px] font-medium text-white/20">
            © {new Date().getFullYear()} أهل القمة
          </p>
        </div>
      </div>

      {/* =========================
          CSS Animations
      ========================= */}
      <style jsx>{`
        .flame {
          position: relative;
          width: 150px;
          height: 260px;
          border-radius: 55% 45% 45% 55%;
          transform-origin: bottom center;
          filter: blur(1px);
        }

        .flame::before,
        .flame::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: 0;
          transform: translateX(-50%);
          border-radius: 50% 50% 45% 45%;
        }

        .flame::before {
          width: 115px;
          height: 230px;
          background: linear-gradient(
            to top,
            rgba(255, 94, 0, 0.75),
            rgba(255, 178, 0, 0.5),
            rgba(255, 218, 100, 0.15),
            transparent
          );
          filter: blur(8px);
        }

        .flame::after {
          width: 70px;
          height: 175px;
          background: linear-gradient(
            to top,
            rgba(255, 174, 0, 0.75),
            rgba(255, 220, 120, 0.5),
            transparent
          );
          filter: blur(4px);
        }

        .flame-one {
          animation: fireOne 1.25s ease-in-out infinite alternate;
        }

        .flame-two {
          animation: fireTwo 1.55s ease-in-out infinite alternate;
        }

        .flame-three {
          animation: fireThree 1.1s ease-in-out infinite alternate;
        }

        @keyframes fireOne {
          0% {
            transform: scaleX(0.88) rotate(-3deg);
          }

          50% {
            transform: scaleX(1.05) rotate(2deg);
          }

          100% {
            transform: scaleX(0.92) rotate(-1deg);
          }
        }

        @keyframes fireTwo {
          0% {
            transform: scaleX(0.9) rotate(3deg);
          }

          50% {
            transform: scaleX(1.08) rotate(-2deg);
          }

          100% {
            transform: scaleX(0.94) rotate(2deg);
          }
        }

        @keyframes fireThree {
          0% {
            transform: scaleX(0.8) rotate(-2deg);
          }

          50% {
            transform: scaleX(1.12) rotate(2deg);
          }

          100% {
            transform: scaleX(0.9) rotate(0deg);
          }
        }

        .spark {
          position: absolute;
          bottom: 20%;
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: #d4af37;
          box-shadow: 0 0 12px rgba(212, 175, 55, 0.8);
          opacity: 0;
          animation: sparkUp 3.5s ease-in-out infinite;
        }

        .spark-one {
          left: 18%;
          animation-delay: 0s;
        }

        .spark-two {
          left: 27%;
          animation-delay: 1.2s;
        }

        .spark-three {
          left: 42%;
          animation-delay: 0.7s;
        }

        .spark-four {
          left: 57%;
          animation-delay: 2s;
        }

        .spark-five {
          left: 73%;
          animation-delay: 1.5s;
        }

        .spark-six {
          left: 82%;
          animation-delay: 0.4s;
        }

        @keyframes sparkUp {
          0% {
            transform: translateY(20px) scale(0.5);
            opacity: 0;
          }

          20% {
            opacity: 0.8;
          }

          70% {
            opacity: 0.5;
          }

          100% {
            transform: translateY(-130px) translateX(25px)
              scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </main>
  );
}