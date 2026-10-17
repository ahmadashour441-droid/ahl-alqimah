"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Settings,
  UserRound,
  Wallet,
  X,
  ArrowDownToLine,
} from "lucide-react";

const items = [
  { href: "/dashboard", label: "الرئيسية", icon: Home },
  { href: "/orders", label: "الطلبات", icon: ClipboardList },
  { href: "/finance", label: "المحفظة", icon: Wallet },
  { href: "/finance/withdraw", label: "السحب", icon: ArrowDownToLine },
  { href: "/weeks", label: "الأسابيع", icon: CalendarDays },
  { href: "/notifications", label: "الإشعارات", icon: Bell },
  { href: "/settings", label: "حسابي", icon: UserRound },
];

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const publicRoute = pathname === "/" || pathname.startsWith("/admin") || pathname === "/dashboard";
  if (publicRoute) return <>{children}</>;

  const active = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  async function logout() {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
      );
      await supabase.auth.signOut();
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      localStorage.removeItem("admin");
      router.replace("/");
    }
  }

  return (
    <div className="captain-route">
      <aside className={`captain-sidebar ${open ? "mobile-open" : ""}`}>
        <div className="captain-brand">
          <div className="captain-brand-mark"><span>V</span></div>
          <div>
            <strong>أهل القمة</strong>
            <small>إدارة التوصيلات</small>
          </div>
          <button className="captain-close" onClick={() => setOpen(false)} aria-label="إغلاق"><X size={20}/></button>
        </div>

        <div className="captain-side-label">مساحة الكابتن</div>
        <nav className="captain-nav">
          {items.map(({ href, label, icon: Icon }) => (
            <button key={href} className={`captain-nav-item ${active(href) ? "active" : ""}`} onClick={() => { setOpen(false); router.push(href); }}>
              <span className="captain-nav-icon"><Icon size={18}/></span>
              <span>{label}</span>
              <ChevronLeft size={15} className="captain-nav-arrow" />
            </button>
          ))}
        </nav>

        <div className="captain-side-bottom">
          <button onClick={() => router.push("/settings")}><Settings size={17}/><span>الإعدادات</span></button>
          <button className="danger" onClick={logout}><LogOut size={17}/><span>تسجيل الخروج</span></button>
        </div>
      </aside>

      <div className="captain-mobile-topbar">
        <button onClick={() => setOpen(true)} aria-label="القائمة"><Menu size={21}/></button>
        <div className="captain-mobile-brand">أهل القمة</div>
        <button onClick={() => router.push("/notifications")} aria-label="الإشعارات"><Bell size={20}/></button>
      </div>

      <div className="captain-mobile-bottom">
        {items.slice(0, 5).map(({ href, label, icon: Icon }) => (
          <button key={href} className={active(href) ? "active" : ""} onClick={() => router.push(href)}>
            <Icon size={19}/><span>{label}</span>
          </button>
        ))}
      </div>

      {open && <button className="captain-overlay" onClick={() => setOpen(false)} aria-label="إغلاق القائمة" />}
      {children}
    </div>
  );
}
