import { Link } from "wouter";
import { Smartphone, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "./sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] bg-background flex-col">
      {/* Stand by notice banner */}
      <div className="bg-zinc-950/95 border-b border-border/40 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-zinc-400 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 text-[10px] font-bold">
            MODO STAND BY
          </Badge>
          <span className="hidden sm:inline">
            Painel Clássico Avançado mantido em stand by. A interface oficial agora é o <strong>Studio 9:16</strong>.
          </span>
        </div>
        <Link 
          href="/"
          className="font-bold text-white bg-primary hover:bg-primary/90 px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)] text-xs"
        >
          <Smartphone size={13} />
          <span>Voltar ao Studio Oficial</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-6 md:p-8 overflow-y-auto">
            <div className="max-w-6xl mx-auto w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}