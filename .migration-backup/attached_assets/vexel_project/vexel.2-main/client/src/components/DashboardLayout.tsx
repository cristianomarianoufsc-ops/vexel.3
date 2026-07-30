import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  Share2,
  Calendar,
  Lightbulb,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  BookOpen,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Redes Sociais", href: "/social-media", icon: Share2 },
  { label: "Lore", href: "/lore", icon: BookOpen },
  { label: "Calendário", href: "/calendar", icon: Calendar },
  { label: "Estratégias", href: "/templates", icon: FileText },
  { label: "Ideias", href: "/ideas", icon: Lightbulb },
  { label: "Assets", href: "/assets", icon: FileText },
  { label: "Tarefas", href: "/tasks", icon: CheckSquare },
  { label: "Configurações", href: "/settings", icon: Settings },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gradient mb-4">VEXEL HUB</h1>
          <p className="text-muted-foreground mb-8">Central de Gerenciamento</p>
          <p className="text-foreground mb-6">Acesse para continuar</p>
          <a href={getLoginUrl()}>
            <Button className="btn-cyberpunk">Sign in</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-card border-r-2 border-primary/30 transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-4 border-b-2 border-primary/30">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <h1 className="text-xl font-bold text-gradient retro-text">VEXEL</h1>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-primary/20 rounded transition-colors"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-sm transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground cyberpunk-glow"
                    : "text-foreground hover:bg-primary/20"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </a>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="border-t-2 border-primary/30 p-4 space-y-3">
          {sidebarOpen && (
            <div className="cyberpunk-border p-3">
              <p className="text-xs text-muted-foreground">Usuário</p>
              <p className="font-bold text-sm truncate">{user.name || "Usuário"}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-destructive/20 text-destructive hover:bg-destructive/30 rounded-sm transition-colors font-medium text-sm"
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && "Logout"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
