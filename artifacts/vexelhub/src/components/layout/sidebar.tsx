import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { 
  LayoutDashboard, 
  Settings, 
  LogOut,
  Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";

const classicNavItems = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border h-[100dvh] flex flex-col sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <img
            src={`${basePath}/vexelhub-logo.png`}
            alt="VexelHub"
            className="h-8 w-auto max-w-[142px] object-contain"
          />
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Primary CTA: Studio Oficial */}
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 mb-3",
            location === "/" || location === "/studio"
              ? "bg-primary text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]"
              : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
          )}
        >
          <Smartphone size={18} />
          <span className="flex-1">Studio Oficial</span>
          <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
            Oficial
          </span>
        </Link>

        {/* Section title for stand by items */}
        <div className="pt-2 pb-1 px-3 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Modo Clássico
          </span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400/90 border border-amber-500/30">
            stand by
          </span>
        </div>

        {classicNavItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon size={17} className={isActive ? "text-primary" : "text-sidebar-foreground/50"} />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-sidebar-accent overflow-hidden border border-sidebar-border">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt={user.fullName || ""} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                {user?.firstName?.charAt(0) || "U"}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.fullName || "Criador"}
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ redirectUrl: basePath || "/" })}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}
