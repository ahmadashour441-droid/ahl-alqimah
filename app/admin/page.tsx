"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Bell, CalendarDays, ChevronLeft, ClipboardList, Home, LayoutDashboard,
  LogOut, Menu, Plus, Settings, Users, Wallet, X, ArrowDownCircle,
  Activity, ShieldCheck, Headphones, BarChart3, CarFront, Search,
  TrendingUp, TrendingDown, Clock3, MoreHorizontal, UserRound,
} from "lucide-react";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

type User = { id:string; full_name:string|null; phone:string|null; email:string|null; role:string; balance:number; is_active:boolean; created_at:string };
type DashboardData = {
  admin: User;
  stats: { totalUsers:number; activeUsers:number; inactiveUsers:number; totalBalance:number; positiveBalance:number; negativeBalance:number; positiveUsersCount:number; negativeUsersCount:number; zeroUsersCount:number; totalOrders:number; activeOrders:number; pendingWithdrawals:number; unreadNotifications:number };
  balances:{positive:User[];negative:User[];zero:User[]};
  users:User[];
  currentWeek:{id:string;start_at:string;end_at:string;is_closed:boolean}|null;
  weeklyOrders:{date:string;label:string;count:number}[];
};

function money(v:number){return `${Number(v||0).toFixed(2)} JD`;}
function initials(n:string|null){if(!n)return "A"; const p=n.trim().split(/\s+/); return p.length>1?`${p[0][0]}${p[1][0]}`:p[0][0];}
function date(v:string){try{return new Date(v).toLocaleDateString("ar-JO",{day:"2-digit",month:"short"});}catch{return "-";}}

export default function AdminPage(){
 const [data,setData]=useState<DashboardData|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [menu,setMenu]=useState(false); const [balance,setBalance]=useState<"positive"|"negative"|null>(null);
 useEffect(()=>{load()},[]);
 async function load(){try{setLoading(true);const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token){location.replace("/");return;} const meR=await fetch("/api/auth/me",{headers:{Authorization:`Bearer ${session.access_token}`},cache:"no-store"});const me=await meR.json().catch(()=>null);if(!meR.ok||!me?.user){location.replace("/");return;}if(me.user.role!=="admin"){location.replace("/dashboard");return;} const r=await fetch("/api/admin/dashboard",{headers:{Authorization:`Bearer ${session.access_token}`},cache:"no-store"});const j=await r.json();if(!r.ok||!j.success)throw new Error(j.message||"فشل تحميل لوحة التحكم");setData(j);}catch(e){setError(e instanceof Error?e.message:"حدث خطأ");}finally{setLoading(false)}}
 function go(p:string){setMenu(false);location.href=p}
 async function logout(){await supabase.auth.signOut();localStorage.clear();location.href="/"}
 if(loading)return <main dir="rtl" className="vip-new"><div className="vip-center"><div className="vip-spinner"/><span>جاري تجهيز لوحة التحكم...</span></div></main>;
 if(error||!data)return <main dir="rtl" className="vip-new"><div className="vip-error"><ShieldCheck size={30}/><h2>تعذر تحميل اللوحة</h2><p>{error||"حدث خطأ غير معروف"}</p><button onClick={load}>إعادة المحاولة</button></div></main>;
 const {admin,stats,balances,currentWeek,weeklyOrders}=data;
 const chartMax = Math.max(1, ...(weeklyOrders || []).map(x => x.count));
 return <main dir="rtl" className="vip-new">
   {menu&&<div className="vip-drawer-overlay" onClick={()=>setMenu(false)}/>} 
   <aside className={`vip-new-sidebar ${menu?"is-open":""}`}>
     <div className="vip-new-brand"><div className="vip-logo-box"><CarFront size={25}/></div><div><b>أهل القمة</b><small>لوحة إدارة النظام</small></div><button className="vip-drawer-close" onClick={()=>setMenu(false)}><X size={18}/></button></div>
     <div className="vip-new-user"><div className="vip-new-avatar">{initials(admin.full_name)}</div><div><b>{admin.full_name||"Admin"}</b><span><i/> مدير النظام</span></div></div>
     <div className="vip-side-caption">الإدارة</div>
     <nav className="vip-new-nav">
       <Nav active icon={<LayoutDashboard/>} label="الرئيسية" onClick={()=>go("/admin")}/>
       <Nav icon={<ClipboardList/>} label="الطلبات" onClick={()=>go("/admin/orders")}/>
       <Nav icon={<Users/>} label="المستخدمون" onClick={()=>go("/admin/users")}/>
       <Nav icon={<CarFront/>} label="الكباتن" onClick={()=>go("/admin/users")}/>
       <Nav icon={<Wallet/>} label="محفظة الكباتن" onClick={()=>go("/admin/balances")}/>
       <Nav icon={<Activity/>} label="الحركات" onClick={()=>go("/admin/transactions")}/>
       <Nav icon={<CalendarDays/>} label="الأسابيع" onClick={()=>go("/admin/weeks")}/>
       <Nav icon={<ClipboardList/>} label="التسويات" onClick={()=>go("/admin/settlements")}/>
       <Nav icon={<ArrowDownCircle/>} label="طلبات السحب" onClick={()=>go("/admin/withdrawals")}/>
       <Nav icon={<Bell/>} label="الإشعارات" badge={stats.unreadNotifications} onClick={()=>go("/admin/notifications")}/>
       <Nav icon={<Settings/>} label="الإعدادات" onClick={()=>go("/admin/settings")}/>
     </nav>
     <button className="vip-new-logout" onClick={logout}><LogOut size={18}/> تسجيل الخروج</button>
   </aside>
   <section className="vip-new-main">
     <header className="vip-new-header">
       <button className="vip-header-menu" onClick={()=>setMenu(true)}><Menu size={21}/></button>
       <div className="vip-search"><Search size={18}/><span>ابحث عن طلب، كابتن، مستخدم...</span></div>
       <div className="vip-header-spacer"/>
       <button className="vip-header-icon"><MoreHorizontal size={20}/></button>
       <button className="vip-header-icon" onClick={()=>go("/admin/notifications")}><Bell size={19}/>{stats.unreadNotifications>0&&<b>{stats.unreadNotifications}</b>}</button>
       <div className="vip-header-profile"><div className="vip-new-avatar small">{initials(admin.full_name)}</div><div><b>{admin.full_name||"Admin"}</b><span>مدير النظام</span></div><ChevronLeft size={16}/></div>
       <div className="vip-header-date"><span>{new Date().toLocaleDateString("ar-JO",{weekday:"long",day:"numeric",month:"long"})}</span><b>{new Date().toLocaleTimeString("ar-JO",{hour:"2-digit",minute:"2-digit"})}</b></div>
     </header>
     <div className="vip-new-content">
       <section className="vip-hero-banner">
         <div className="vip-hero-copy"><span>منصة أهل القمة</span><h1>لوحة إدارة النظام</h1><p>إدارة أسهل · متابعة أدق · تشغيل أكثر احترافية</p></div>
         <div className="vip-hero-badges"><HeroBadge icon={<BarChart3/>} text="تقارير دقيقة"/><HeroBadge icon={<Headphones/>} text="دعم دائم"/><HeroBadge icon={<ShieldCheck/>} text="أمان وموثوقية"/></div>
         <div className="vip-hero-city"><div className="cityline city1"/><div className="cityline city2"/><div className="roadline"/><div className="hero-car car-a"><i/><b/><span/></div><div className="hero-car car-b"><i/><b/><span/></div></div>
       </section>
       <section className="vip-new-stats">
         <Stat tone="red" icon={<ClipboardList/>} label="إجمالي الطلبات اليوم" value={stats.totalOrders} trend="نشاط النظام"/>
         <Stat tone="gold" icon={<Users/>} label="الكباتن النشطين" value={stats.activeUsers} trend={`${stats.totalUsers} مستخدم`} />
         <Stat tone="navy" icon={<CarFront/>} label="المستخدمون" value={stats.totalUsers} trend={`${stats.inactiveUsers} غير نشط`} />
         <Stat tone="white" icon={<ArrowDownCircle/>} label="طلبات السحب المعلقة" value={stats.pendingWithdrawals} trend={stats.pendingWithdrawals?"تحتاج مراجعة":"لا توجد طلبات"} alert={stats.pendingWithdrawals>0}/>
       </section>
       <section className="vip-dashboard-grid">
         <div className="vip-panel vip-chart-panel"><PanelHead title="الطلبات خلال الأسبوع" action="آخر 7 أيام"/><div className="fake-chart"><div className="chart-y"><span>{chartMax}</span><span>{Math.ceil(chartMax * .75)}</span><span>{Math.ceil(chartMax * .5)}</span><span>{Math.ceil(chartMax * .25)}</span><span>0</span></div><div className="chart-bars">{(weeklyOrders || []).map((item)=><div className="chart-col" key={item.date}><i style={{height:`${Math.max(4, (item.count / chartMax) * 100)}%`}}/><b>{item.count}</b><span>{item.label}</span></div>)}</div></div></div>
         <div className="vip-panel vip-status-panel"><PanelHead title="حالة الحسابات" action="عرض التفاصيل"/><div className="donut-wrap"><div className="donut"><div><b>{stats.totalUsers}</b><span>إجمالي المستخدمين</span></div></div><div className="donut-legend"><Legend color="red" label="أرصدة سالبة" value={stats.negativeUsersCount}/><Legend color="gold" label="أرصدة موجبة" value={stats.positiveUsersCount}/><Legend color="teal" label="بدون رصيد" value={stats.zeroUsersCount}/><Legend color="gray" label="غير نشط" value={stats.inactiveUsers}/></div></div></div>
         <div className="vip-panel vip-balance-panel"><PanelHead title="أرصدة الكباتن" action="عرض الكل"/><div className="vip-balance-big"><span>إجمالي الأرصدة الحالية</span><strong>{money(stats.totalBalance)}</strong><small>يتم تحديث الأرصدة مباشرة من النظام</small></div><div className="vip-mini-balance"><button onClick={()=>setBalance("positive")}><TrendingUp/><span>أرصدة موجبة</span><b>{money(stats.positiveBalance)}</b></button><button onClick={()=>setBalance("negative")}><TrendingDown/><span>أرصدة سالبة</span><b>{money(Math.abs(stats.negativeBalance))}</b></button></div></div>
       </section>
       <section className="vip-panel vip-quick"><PanelHead title="إدارة سريعة" action=""/><div className="vip-quick-grid"><Quick icon={<Plus/>} title="إضافة طلب" text="إدخال طلب جديد" onClick={()=>go("/admin/orders")}/><Quick icon={<Users/>} title="إضافة كابتن" text="إنشاء حساب جديد" onClick={()=>go("/admin/users")}/><Quick icon={<Wallet/>} title="إدارة الأرصدة" text="تعديل ومراجعة الأرصدة" onClick={()=>go("/admin/balances")}/><Quick icon={<CalendarDays/>} title="الأسبوع الحالي" text={currentWeek?`${date(currentWeek.start_at)} → ${date(currentWeek.end_at)}`:"غير متوفر"} onClick={()=>go("/admin/weeks")}/></div></section>
       <section className="vip-bottom-strip"><div><Clock3 size={18}/><span>الأرضية الأسبوعية تعمل تلقائياً</span></div><b>الجمعة → الخميس</b><button onClick={()=>go("/admin/weeks")}>تفاصيل الأسابيع <ChevronLeft size={15}/></button></section>
     </div>
   </section>
   <div className="vip-mobile-bottom"><MNav icon={<Home/>} text="الرئيسية" active onClick={()=>go("/admin")}/><MNav icon={<ClipboardList/>} text="الطلبات" onClick={()=>go("/admin/orders")}/><MNav icon={<Users/>} text="الكباتن" onClick={()=>go("/admin/users")}/><MNav icon={<Wallet/>} text="الأرصدة" onClick={()=>go("/admin/balances")}/><MNav icon={<Menu/>} text="المزيد" onClick={()=>setMenu(true)}/></div>
   {balance&&<div className="vip-modal-overlay" onClick={()=>setBalance(null)}><div className="vip-modal" onClick={e=>e.stopPropagation()}><div className="vip-modal-head"><div><span>الحسابات</span><h2>{balance==="positive"?"الأرصدة الموجبة":"الأرصدة السالبة"}</h2></div><button onClick={()=>setBalance(null)}><X/></button></div><div className="vip-modal-list">{(balance==="positive"?balances.positive:balances.negative).map(u=><div className="vip-user-row" key={u.id}><div className="vip-new-avatar small">{initials(u.full_name)}</div><div><b>{u.full_name||"بدون اسم"}</b><span>{u.phone||"-"}</span></div><strong className={u.balance>=0?"positive":"negative"}>{money(u.balance)}</strong></div>)}</div></div></div>}
 </main>
}
function Nav({icon,label,badge,active,onClick}:{icon:React.ReactNode;label:string;badge?:number;active?:boolean;onClick:()=>void}){return <button className={`vip-new-nav-item ${active?"active":""}`} onClick={onClick}><span>{icon}</span><b>{label}</b>{badge? <em>{badge}</em>:null}<ChevronLeft size={15}/></button>}
function Stat({icon,label,value,trend,tone,alert}:{icon:React.ReactNode;label:string;value:number|string;trend:string;tone:string;alert?:boolean}){return <div className={`vip-stat ${tone} ${alert?"alert":""}`}><div className="vip-stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{trend}</small></div></div>}
function HeroBadge({icon,text}:{icon:React.ReactNode;text:string}){return <div><span>{icon}</span><b>{text}</b></div>}
function PanelHead({title,action}:{title:string;action:string}){return <div className="vip-panel-head"><h2>{title}</h2>{action&&<button>{action}<ChevronLeft size={14}/></button>}</div>}
function Legend({color,label,value}:{color:string;label:string;value:number}){return <div><i className={color}/><span>{label}</span><b>{value}</b></div>}
function Quick({icon,title,text,onClick}:{icon:React.ReactNode;title:string;text:string;onClick:()=>void}){return <button onClick={onClick}><span>{icon}</span><div><b>{title}</b><small>{text}</small></div><ChevronLeft/></button>}
function MNav({icon,text,active,onClick}:{icon:React.ReactNode;text:string;active?:boolean;onClick:()=>void}){return <button className={active?"active":""} onClick={onClick}>{icon}<span>{text}</span></button>}
