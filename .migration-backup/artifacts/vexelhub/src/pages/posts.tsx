import { useState } from "react";
import { useListPosts, useDeletePost, usePublishPost } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListVideo, Trash2, CalendarIcon, Play, AlertCircle, FileVideo, MoreVertical, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListPostsStatus } from "@workspace/api-client-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "RASCUNHO",
  scheduled: "AGENDADO",
  published: "PUBLICADO",
  failed: "FALHOU",
};

export default function Posts() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: posts = [], isLoading, refetch } = useListPosts(
    statusFilter !== "all" ? { status: statusFilter as ListPostsStatus } : undefined
  );
  const deletePost = useDeletePost();
  const publishPost = usePublishPost();
  const { toast } = useToast();

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este post?")) return;
    try {
      await deletePost.mutateAsync({ id });
      toast({ title: "Post excluído" });
      refetch();
    } catch (e) {
      toast({ title: "Falha ao excluir", variant: "destructive" });
    }
  };

  const handlePublish = async (id: number) => {
    try {
      await publishPost.mutateAsync({ id });
      toast({ title: "Publicação iniciada", description: "Seu post está sendo enviado às plataformas." });
      refetch();
    } catch (e) {
      toast({ title: "Falha ao publicar", variant: "destructive" });
    }
  };

  const statusColors = {
    draft: "bg-muted text-muted-foreground border-border",
    scheduled: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    published: "bg-green-500/10 text-green-400 border-green-500/20",
    failed: "bg-destructive/10 text-destructive border-destructive/20"
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1 flex items-center gap-3">
            <ListVideo className="text-primary" /> Biblioteca de Conteúdo
          </h1>
          <p className="text-muted-foreground">Gerencie seus posts publicados e agendamentos.</p>
        </div>
        
        <div className="w-[200px]">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-card border-border/50 text-white">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border/50">
              <SelectItem value="all">Todos os Posts</SelectItem>
              <SelectItem value="published">Publicados</SelectItem>
              <SelectItem value="scheduled">Agendados</SelectItem>
              <SelectItem value="draft">Rascunhos</SelectItem>
              <SelectItem value="failed">Com Falha</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <Card key={i} className="bg-card/50 border-border/50">
              <CardContent className="p-4 flex gap-4 h-28 items-center">
                <Skeleton className="h-20 w-20 rounded-md bg-border/50 shrink-0" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-1/3 bg-border/50" />
                  <Skeleton className="h-4 w-1/4 bg-border/50" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : posts.length === 0 ? (
          <div className="text-center py-20 border border-border/50 border-dashed rounded-xl bg-card/30">
            <ListVideo size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Nenhum post encontrado</h3>
            <p className="text-muted-foreground">Tente mudar o filtro ou crie um novo post.</p>
          </div>
        ) : (
          posts.map(post => (
            <Card key={post.id} className="bg-card border-border/50 overflow-hidden hover:border-border transition-colors group">
              <CardContent className="p-0 sm:flex items-stretch">
                <div className="w-full sm:w-48 h-48 sm:h-auto bg-muted shrink-0 relative flex items-center justify-center border-r border-border/50">
                  {post.thumbnailUrl ? (
                    <img src={post.thumbnailUrl} alt={post.title} className="w-full h-full object-cover" />
                  ) : (
                    <FileVideo size={32} className="text-muted-foreground" />
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge variant="outline" className={`${statusColors[post.status as keyof typeof statusColors]} font-bold`}>
                      {STATUS_LABELS[post.status] ?? post.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                
                <div className="p-5 flex-1 flex flex-col justify-between min-w-0">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold text-white mb-2 truncate" title={post.title}>{post.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                        {post.caption || "Nenhuma legenda fornecida."}
                      </p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white shrink-0">
                          <MoreVertical size={18} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border/50">
                        {(post.status === "draft" || post.status === "scheduled" || post.status === "failed") && (
                          <DropdownMenuItem className="cursor-pointer text-white focus:bg-primary/20" onClick={() => handlePublish(post.id)}>
                            <Send className="mr-2 h-4 w-4 text-primary" /> Publicar Agora
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="cursor-pointer text-destructive focus:bg-destructive/20 focus:text-destructive" onClick={() => handleDelete(post.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir Post
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/30">
                    <div className="flex items-center gap-4 text-xs font-medium">
                      {post.scheduledAt && (
                        <div className="flex items-center gap-1.5 text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-md">
                          <CalendarIcon size={14} />
                          {format(new Date(post.scheduledAt), "d 'de' MMM, HH:mm", { locale: ptBR })}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Play size={14} /> Criado em {format(new Date(post.createdAt), "d 'de' MMM", { locale: ptBR })}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {post.platformResults && post.platformResults.length > 0 ? (
                        post.platformResults.map(pr => (
                          <div 
                            key={pr.platform} 
                            className={`flex flex-col items-center justify-center w-10 h-10 rounded-md border ${
                              pr.status === "success" ? "border-green-500/30 bg-green-500/10 text-green-400" :
                              pr.status === "failed" ? "border-destructive/30 bg-destructive/10 text-destructive" :
                              "border-border bg-muted text-muted-foreground"
                            }`}
                            title={`${pr.platform}: ${pr.status} ${pr.errorMessage ? `- ${pr.errorMessage}` : ''}`}
                          >
                            <span className="text-[10px] font-bold uppercase">{pr.platform.substring(0, 2)}</span>
                            {pr.status === "failed" && <AlertCircle size={10} className="mt-0.5" />}
                          </div>
                        ))
                      ) : (
                        post.platforms.map(p => (
                          <div key={p} className="flex items-center justify-center w-8 h-8 rounded border border-border/50 bg-muted/50 text-muted-foreground text-[10px] font-bold uppercase">
                            {p.substring(0, 2)}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
