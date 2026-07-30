import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background text-center px-4">
      <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-6">
        <FileQuestion size={40} />
      </div>
      <h1 className="text-4xl font-extrabold text-white mb-2">404 — Sinal Perdido</h1>
      <p className="text-xl text-muted-foreground max-w-md mb-8">
        A frequência que você está procurando não existe no nosso centro de comando.
      </p>
      <Link href="/dashboard">
        <Button className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]">
          Voltar ao Painel
        </Button>
      </Link>
    </div>
  );
}
