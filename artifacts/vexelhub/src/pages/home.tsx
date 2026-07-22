import { Link } from "wouter";
import { Zap, Repeat, Sparkles, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
      
      <header className="h-20 px-6 md:px-12 flex items-center justify-between border-b border-border/50 bg-background/50 backdrop-blur-md relative z-10">
        <div className="flex items-center">
          <img src={`${basePath}/logo.svg`} alt="VexelHub" className="h-8 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in">
            <Button variant="ghost" className="text-muted-foreground hover:text-white">Entrar</Button>
          </Link>
          <Link href="/sign-up">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(124,58,237,0.3)] border border-primary-border">
              Começar Agora
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
          <Sparkles size={14} />
          <span>O Centro de Comando para Criadores</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
          Publique em Todo Lugar. <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">
            Controle Tudo.
          </span>
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
          Suba um vídeo. Escreva uma legenda. Publique no YouTube Shorts, Instagram Reels e TikTok ao mesmo tempo. Pare de gerenciar abas, comece a construir seu império.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link href="/sign-up">
            <Button size="lg" className="h-14 px-8 text-lg bg-primary hover:bg-primary/90 text-white shadow-[0_0_30px_rgba(124,58,237,0.4)] gap-2">
              Lançar Meu Hub <ChevronRight size={18} />
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-border hover:bg-white/5 text-white">
              Ver Como Funciona
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mt-24 text-left">
          <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-transform">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary mb-4">
              <Zap size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Publicação Instantânea</h3>
            <p className="text-muted-foreground leading-relaxed">
              Suba uma vez e distribua para todas as principais plataformas de vídeo curto. Cuidamos dos requisitos específicos de cada rede.
            </p>
          </div>
          
          <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-transform">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
              <CalendarDays size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Agendamento Visual</h3>
            <p className="text-muted-foreground leading-relaxed">
              Planeje seu conteúdo com semanas de antecedência usando nosso calendário intuitivo. Configure, esqueça e veja suas visualizações crescerem.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-transform">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary mb-4">
              <Repeat size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Status Centralizado</h3>
            <p className="text-muted-foreground leading-relaxed">
              Acompanhe exatamente o que foi publicado com sucesso e o que falhou em todas as plataformas em uma visão unificada.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
