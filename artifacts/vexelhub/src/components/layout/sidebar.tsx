import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { 
  LayoutDashboard, 
  UploadCloud, 
  ListVideo, 
  CalendarDays, 
  Lightbulb, 
  FolderOpen, 
  Settings, 
  LogOut 
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/publish", label: "Publish", icon: UploadCloud },
  { href: "/posts", label: "Posts", icon: ListVideo },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/assets", label: "Assets", icon: FolderOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border h-[100dvh] flex flex-col sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <img src={`${basePath}/logo.svg`} alt="VexelHub" className="h-8 w-auto object-contain" />
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon size={18} className={isActive ? "text-primary" : "text-sidebar-foreground/50"} />
              {item.label}
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
              {user?.fullName || "Creator"}
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
          Sign Out
        </button>
      </div>
    </aside>
  );
}