import { useEffect, useState } from "react";
import { useListPosts, useDeletePost, usePublishPost, customFetch } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Trash2,
  CalendarIcon,
  Play,
  AlertCircle,
  FileVideo,
  Send,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Eye,
  Heart,
  MessageCircle,
  ExternalLink,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { SiYoutube, SiInstagram, SiTiktok } from "react-icons/si";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListPostsStatus } from "@workspace/api-client-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "RASCUNHO",
  scheduled: "AGENDADO",
  publishing: "PUBLICANDO",
  published: "PUBLICADO",
  failed: "FALHOU",
};

function formatCompactNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "—";
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toLocaleString("pt-BR");
}

function getPlatformConfig(platform: string) {
  switch (platform) {
    case "youtube":
      return {
        name: "YouTube Shorts",
        shortName: "YouTube",
        icon: SiYoutube,
        iconColor: "text-red-500",
        borderColor: "border-red-500/25 hover:border-red-500/50",
        badgeBg: "border-red-500/30 bg-red-500/10 text-red-400",
      };
    case "instagram":
      return {
        name: "Instagram Reels",
        shortName: "Reels",
        icon: SiInstagram,
        iconColor: "text-pink-500",
        borderColor: "border-pink-500/25 hover:border-pink-500/50",
        badgeBg: "border-pink-500/30 bg-pink-500/10 text-pink-400",
      };
    case "instagram_2":
      return {
        name: "Instagram (Conta 2)",
        shortName: "Reels 2",
        icon: SiInstagram,
        iconColor: "text-purple-400",
        borderColor: "border-purple-500/25 hover:border-purple-500/50",
        badgeBg: "border-purple-500/30 bg-purple-500/10 text-purple-400",
      };
    case "tiktok":
      return {
        name: "TikTok",
        shortName: "TikTok",
        icon: SiTiktok,
        iconColor: "text-cyan-400",
        borderColor: "border-cyan-500/25 hover:border-cyan-500/50",
        badgeBg: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
      };
    default:
      return {
        name: platform,
        shortName: platform,
        icon: null,
        iconColor: "text-muted-foreground",
        borderColor: "border-border/40 hover:border-border",
        badgeBg: "border-border bg-muted text-muted-foreground",
      };
  }
}

export default function Posts() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [publishingIds, setPublishingIds] = useState<Set<number>>(new Set());
  const [refreshingPostId, setRefreshingPostId] = useState<number | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  const { data: posts = [], isLoading, refetch } = useListPosts(
    statusFilter !== "all" ? { status: statusFilter as ListPostsStatus } : undefined
  );
  const deletePost = useDeletePost();
  const publishPost = usePublishPost();
  const { toast } = useToast();

  // `publishing` is an explicit persisted job state. Historical platform
  // results with `pending` alone must not reopen a progress bar.
  useEffect(() => {
    const activeIds = posts
      .filter((post) => post.status === "publishing")
      .map((post) => post.id);

    setPublishingIds((current) => {
      const next = new Set(activeIds);
      current.forEach((id) => {
        if (posts.some((post) => post.id === id && post.status === "publishing")) {
          next.add(id);
        }
      });
      return next;
    });
  }, [posts]);

  useEffect(() => {
    const hasActivePublishing =
      publishingIds.size > 0 || posts.some((post) => post.status === "publishing");
    if (!hasActivePublishing) return;

    const interval = window.setInterval(() => {
      refetch();
    }, 2000);

    return () => window.clearInterval(interval);
  }, [publishingIds.size, refetch]);

  // Sincroniza automaticamente métricas em segundo plano ao abrir o painel se houver posts sem métricas
  useEffect(() => {
    if (isLoading || posts.length === 0) return;
    const hasUnsynced = posts.some(
      (p) =>
        (p.status === "published" || p.status === "failed") &&
        p.platformResults?.some(
          (pr) => pr.status === "success" && (pr.views === undefined || pr.views === null)
        )
    );
    if (hasUnsynced && !isRefreshingAll) {
      customFetch("/api/posts/refresh-metrics", { method: "POST" })
        .then(() => refetch())
        .catch(() => {});
    }
  }, [posts.length, isLoading]);

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
    setPublishingIds((current) => new Set(current).add(id));
    try {
      await publishPost.mutateAsync({ id });
      toast({ title: "Publicação iniciada", description: "Seu post está sendo enviado às plataformas." });
      refetch();
    } catch (e) {
      toast({ title: "Falha ao publicar", variant: "destructive" });
      setPublishingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  const handleRefreshPostMetrics = async (postId: number) => {
    setRefreshingPostId(postId);
    try {
      await customFetch(`/api/posts/${postId}/refresh-metrics`, { method: "POST" });
      toast({ title: "Métricas sincronizadas!", description: "Dados atualizados com sucesso nas plataformas." });
      refetch();
    } catch (e: any) {
      toast({
        title: "Falha ao sincronizar métricas",
        description: e?.message || "Verifique se as contas estão conectadas.",
        variant: "destructive",
      });
    } finally {
      setRefreshingPostId(null);
    }
  };

  const handleRefreshAllMetrics = async () => {
    setIsRefreshingAll(true);
    try {
      await customFetch("/api/posts/refresh-metrics", { method: "POST" });
      toast({
        title: "Sincronização concluída",
        description: "Métricas dos vídeos recentes foram atualizadas.",
      });
      refetch();
    } catch (e: any) {
      toast({
        title: "Falha ao sincronizar todas as métricas",
        description: e?.message || "Ocorreu um erro ao sincronizar.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshingAll(false);
    }
  };

  const statusColors = {
    draft: "bg-muted text-muted-foreground border-border",
    scheduled: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    publishing: "bg-primary/10 text-primary border-primary/20",
    published: "bg-green-500/10 text-green-400 border-green-500/20",
    failed: "bg-destructive/10 text-destructive border-destructive/20"
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1 flex items-center gap-3">
            <BarChart3 className="text-primary" /> Histórico & Métricas
          </h1>
          <p className="text-muted-foreground">Acompanhe suas postagens e o desempenho em cada plataforma.</p>
        </div>
        
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            disabled={isRefreshingAll}
            onClick={handleRefreshAllMetrics}
            className="border-primary/40 bg-primary/10 text-white hover:bg-primary/20 hover:text-white gap-2 font-medium"
            title="Atualizar métricas de todas as postagens publicadas"
          >
            <RefreshCw size={14} className={isRefreshingAll ? "animate-spin text-primary" : "text-primary"} />
            <span>{isRefreshingAll ? "Atualizando..." : "Atualizar Métricas"}</span>
          </Button>

          <div className="w-[180px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-card border-border/50 text-white">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                <SelectItem value="all">Todos os Posts</SelectItem>
                <SelectItem value="published">Publicados</SelectItem>
                <SelectItem value="scheduled">Agendados</SelectItem>
                <SelectItem value="publishing">Publicando</SelectItem>
                <SelectItem value="draft">Rascunhos</SelectItem>
                <SelectItem value="failed">Com Falha</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
            <BarChart3 size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Nenhum post encontrado</h3>
            <p className="text-muted-foreground">Tente mudar o filtro ou crie um novo post.</p>
          </div>
        ) : (
          posts.map(post => (
            (() => {
              const resultsByPlatform = post.platforms.map((platform) =>
                post.platformResults.find((result) => result.platform === platform) ?? {
                  platform,
                  status: "pending" as const,
                  postId: null,
                  postUrl: null,
                  errorMessage: null,
                }
              );
              const progressPercent = post.platforms.length > 0
                ? Math.round(
                    resultsByPlatform.reduce(
                      (total, result) =>
                        total + (result.progress ?? (result.status === "success" || result.status === "failed" ? 100 : 0)),
                      0,
                    ) / post.platforms.length,
                  )
                : 0;
              const isPublishing = publishingIds.has(post.id) || post.status === "publishing";
              const activeResult = resultsByPlatform.find(
                (result) => result.status === "pending" && (result.progress ?? 0) < 100,
              );
              const successPlatforms = resultsByPlatform.filter((pr) => pr.status === "success");

              return (
                <Card key={post.id} className="bg-card border-border/50 overflow-hidden hover:border-border transition-colors group">
                  <CardContent className="p-0 sm:flex items-stretch">
                    <div className="w-full sm:w-48 h-48 sm:h-auto min-h-[160px] bg-muted shrink-0 relative flex items-center justify-center border-r border-border/50">
                      {post.thumbnailUrl ? (
                        <img
                          src={post.thumbnailUrl}
                          alt={`Miniatura de ${post.title}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <FileVideo size={32} />
                          <span className="text-[11px]">Sem miniatura</span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <Badge variant="outline" className={`${statusColors[post.status as keyof typeof statusColors]} font-bold`}>
                          {STATUS_LABELS[post.status] ?? post.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="p-5 flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex justify-between items-start gap-4">
                          <div className="min-w-0">
                            <h3 className="text-xl font-bold text-white mb-1.5 truncate" title={post.title}>{post.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                              {post.caption || "Nenhuma legenda fornecida."}
                            </p>
                          </div>
                          
                          <div className="flex shrink-0 items-center gap-2">
                            {(post.status === "draft" || post.status === "scheduled" || post.status === "failed") && (
                              <Button
                                size="sm"
                                disabled={isPublishing}
                                className="bg-primary px-3 font-bold text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_22px_hsl(var(--primary)/0.35)]"
                                onClick={() => handlePublish(post.id)}
                              >
                                {isPublishing ? <Loader2 className="animate-spin" /> : <Send />}
                                {isPublishing ? "Publicando..." : "Publicar agora"}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-destructive/30 bg-destructive/5 px-3 text-destructive hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDelete(post.id)}
                              title="Excluir post"
                            >
                              <Trash2 />
                              <span className="hidden sm:inline">Excluir</span>
                            </Button>
                          </div>
                        </div>

                        {/* Barra de progresso ao publicar */}
                        {isPublishing && (
                          <div className="mt-4 space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                            <div className="flex items-center justify-between gap-3 text-xs">
                              <span className="font-semibold text-white">
                                {activeResult?.stage || "Publicando nas plataformas..."}
                              </span>
                              <span className="font-bold text-primary">{progressPercent}%</span>
                            </div>
                            <Progress value={progressPercent} className="h-2 bg-primary/10" />
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                              {resultsByPlatform.map((result) => (
                                <span
                                  key={result.platform}
                                  className={`flex items-center gap-1 ${
                                    result.status === "success" ? "text-green-400" :
                                    result.status === "failed" ? "text-destructive" :
                                    "text-muted-foreground"
                                  }`}
                                >
                                  {result.status === "success" ? <CheckCircle2 size={12} /> :
                                    result.status === "failed" ? <AlertCircle size={12} /> :
                                    <Loader2 size={12} className="animate-spin" />}
                                  <span className="capitalize">{result.platform}</span>
                                  {result.status === "pending" && result.progress !== undefined && (
                                    <span className="text-muted-foreground">{result.progress}%</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Cards de Métricas por Plataforma (estilo Clipfy / Analytics) */}
                        {successPlatforms.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <TrendingUp size={13} className="text-primary" /> Desempenho por Plataforma
                              </span>
                              {post.status === "published" && (
                                <button
                                  type="button"
                                  disabled={refreshingPostId === post.id}
                                  onClick={() => handleRefreshPostMetrics(post.id)}
                                  className="text-xs text-muted-foreground hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                                  title="Atualizar métricas deste post"
                                >
                                  <RefreshCw size={11} className={refreshingPostId === post.id ? "animate-spin text-primary" : ""} />
                                  <span>{refreshingPostId === post.id ? "Sincronizando..." : "Sincronizar"}</span>
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                              {successPlatforms.map((pr) => {
                                const cfg = getPlatformConfig(pr.platform);
                                const Icon = cfg.icon;
                                return (
                                  <div
                                    key={pr.platform}
                                    className={`rounded-xl border ${cfg.borderColor} bg-zinc-950/60 p-2.5 flex flex-col justify-between transition-all`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-1.5">
                                        {Icon && <Icon className={`${cfg.iconColor} shrink-0`} size={15} />}
                                        <span className="text-xs font-bold text-white truncate max-w-[130px]">{cfg.name}</span>
                                      </div>
                                      {pr.postUrl && (
                                        <a
                                          href={pr.postUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1 rounded-md text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                                          title="Ver post na plataforma"
                                        >
                                          <ExternalLink size={12} />
                                        </a>
                                      )}
                                    </div>

                                    {/* Métricas: Views, Likes, Comentários, Shares */}
                                    <div className="grid grid-cols-4 gap-1 py-1.5 text-center bg-black/40 rounded-lg border border-border/20">
                                      <div className="flex flex-col items-center justify-center p-0.5">
                                        <div className="flex items-center gap-1 text-cyan-400 mb-0.5">
                                          <Eye size={11} />
                                        </div>
                                        <span className="text-xs font-extrabold text-white">
                                          {formatCompactNumber(pr.views)}
                                        </span>
                                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Views</span>
                                      </div>

                                      <div className="flex flex-col items-center justify-center p-0.5 border-x border-border/20">
                                        <div className="flex items-center gap-1 text-rose-400 mb-0.5">
                                          <Heart size={11} />
                                        </div>
                                        <span className="text-xs font-extrabold text-white">
                                          {formatCompactNumber(pr.likes)}
                                        </span>
                                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Likes</span>
                                      </div>

                                      <div className="flex flex-col items-center justify-center p-0.5 border-r border-border/20">
                                        <div className="flex items-center gap-1 text-amber-400 mb-0.5">
                                          <MessageCircle size={11} />
                                        </div>
                                        <span className="text-xs font-extrabold text-white">
                                          {formatCompactNumber(pr.comments)}
                                        </span>
                                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Coment.</span>
                                      </div>

                                      <div className="flex flex-col items-center justify-center p-0.5">
                                        <div className="flex items-center gap-1 text-green-400 mb-0.5">
                                          <Send size={11} />
                                        </div>
                                        <span className="text-xs font-extrabold text-white">
                                          {formatCompactNumber(pr.shares)}
                                        </span>
                                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Shares</span>
                                      </div>
                                    </div>

                                    {pr.lastSyncAt && (
                                      <div className="mt-1.5 text-[10px] text-muted-foreground/60 text-right truncate">
                                        {formatDistanceToNow(new Date(pr.lastSyncAt), { addSuffix: true, locale: ptBR })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Rodapé do card */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 mt-4 border-t border-border/30">
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
                          {resultsByPlatform.length > 0 ? (
                            resultsByPlatform.map(pr => {
                              const cfg = getPlatformConfig(pr.platform);
                              return (
                                <div key={pr.platform} className="flex flex-col items-center gap-1">
                                  <div
                                    className={`flex flex-col items-center justify-center w-8 h-8 rounded-md border ${
                                      pr.status === "success" ? cfg.badgeBg :
                                      pr.status === "failed" ? "border-destructive/30 bg-destructive/10 text-destructive" :
                                      "border-border bg-muted text-muted-foreground"
                                    }`}
                                    title={`${cfg.name}: ${pr.status} ${pr.errorMessage ? `- ${pr.errorMessage}` : ''}`}
                                  >
                                    <span className="text-[9px] font-bold uppercase">{pr.platform === "instagram_2" ? "I2" : pr.platform.substring(0, 2)}</span>
                                    {pr.status === "failed" && <AlertCircle size={9} className="mt-0.5" />}
                                  </div>
                                  {pr.status === "failed" && pr.errorMessage && (
                                    <span className="max-w-[200px] text-[10px] leading-tight text-destructive text-right">
                                      {pr.errorMessage}
                                    </span>
                                  )}
                                </div>
                              );
                            })
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
              );
            })()
          ))
        )}
      </div>
    </div>
  );
}
