import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { 
  useListPlatforms, 
  useConnectPlatform, 
  useRequestUploadUrl, 
  useCreatePost, 
  usePublishPost,
  getPost 
} from "@workspace/api-client-react";
import type { PlatformResult } from "@workspace/api-zod";
import { 
  UploadCloud, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  Zap, 
  Check, 
  Crown, 
  ArrowRight, 
  LayoutDashboard, 
  LogOut,
  Smartphone,
  Info,
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Heart,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Share2,
  Bookmark,
  Music,
  MoreVertical,
  Search,
  Send
} from "lucide-react";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth, 
  isToday, 
  isBefore, 
  startOfDay 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { SiYoutube, SiInstagram, SiTiktok } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const QUICK_HASHTAGS = ["#shorts", "#reels", "#tiktok", "#viral", "#foryou", "#cortes", "#podcast", "#musica"];

export default function Studio() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [, setLocation] = useLocation();
  const { user, isSignedIn } = useUser();
  const { signOut, openSignIn } = useClerk();
  const { toast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  // Platform Preview Simulation Overlay State
  const [previewPlatform, setPreviewPlatform] = useState<"clean" | "youtube" | "instagram" | "tiktok">("clean");

  // Studio Form State
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["youtube", "instagram", "tiktok"]);
  
  // Video Player Controls
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [fitMode, setFitMode] = useState<"contain" | "cover">("cover");

  // Helper: Obter horário local atual no formato HH:mm
  const getCurrentLocalTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // Scheduling State (Modal)
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [scheduledTime, setScheduledTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const [isScheduledSuccess, setIsScheduledSuccess] = useState(false);

  const openScheduleModal = () => {
    const now = new Date();
    setSelectedDate(now);
    setCalendarMonth(now);
    setScheduledTime(getCurrentLocalTime());
    setIsSchedulingModalOpen(true);
  };

  // Mini-calendar calculations (Domingo a Sábado)
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const calendarStartDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Domingo
  const calendarEndDate = endOfWeek(monthEnd, { weekStartsOn: 0 }); // Sábado
  const calendarDays = eachDayOfInterval({ start: calendarStartDate, end: calendarEndDate });

  // Publishing Workflow State
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [publishStep, setPublishStep] = useState<"uploading" | "thumbnail" | "distributing" | "done" | "error">("uploading");
  const [statusMessage, setStatusMessage] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [livePlatformResults, setLivePlatformResults] = useState<PlatformResult[]>([]);
  const [currentPostId, setCurrentPostId] = useState<number | null>(null);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);

  // API Hooks
  const { data: platforms = [], refetch: refetchPlatforms } = useListPlatforms();
  const connectPlatform = useConnectPlatform();
  const requestUploadUrl = useRequestUploadUrl();
  const createPost = useCreatePost();
  const publishPost = usePublishPost();

  // Restore draft or handle OAuth returns
  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem("vexel_studio_draft");
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.caption) setCaption(parsed.caption);
        if (Array.isArray(parsed.selectedPlatforms)) setSelectedPlatforms(parsed.selectedPlatforms);
        sessionStorage.removeItem("vexel_studio_draft");
      }

      const justConnected = sessionStorage.getItem("vexel_just_connected");
      if (justConnected) {
        toast({
          title: "Plataforma conectada!",
          description: `Sua conta foi vinculada com sucesso ao Studio.`,
        });
        sessionStorage.removeItem("vexel_just_connected");
      }
    } catch {
      // ignore JSON parse errors
    }
  }, [toast]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Video metadata handler
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      const width = videoRef.current.videoWidth;
      const height = videoRef.current.videoHeight;
      setVideoDuration(duration);
      setVideoDimensions({ width, height });
      const landscape = width > height;
      setIsLandscape(landscape);
      if (landscape) {
        setFitMode("contain"); // Exibe centralizado com tarjas pretas (letterboxing)
        toast({
          title: "Vídeo Horizontal Detectado (16:9)",
          description: "Exibindo com tarjas pretas (letterbox), exatamente como aparecerá no Reels e Shorts.",
        });
      } else {
        setFitMode("cover");
      }
    }
  };

  const handleSelectVideoFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("video/") && !selectedFile.name.match(/\.(mp4|mov|webm)$/i)) {
      toast({
        title: "Formato Inválido",
        description: "Por favor, selecione um arquivo de vídeo (.mp4 ou .mov).",
        variant: "destructive",
      });
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const url = URL.createObjectURL(selectedFile);
    setFile(selectedFile);
    setPreviewUrl(url);
    setIsPlaying(true);
    setIsMuted(true);

    // If title is empty, generate from filename
    if (!title.trim()) {
      const cleanName = selectedFile.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .slice(0, 100);
      setTitle(cleanName);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectVideoFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectVideoFile(e.dataTransfer.files[0]);
    }
  };

  const toggleVideoPlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleVideoMute = (e?: React.MouseEvent) => {
    if (e && typeof e.stopPropagation === "function") {
      e.stopPropagation();
    }
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      if (!nextMuted) {
        videoRef.current.volume = 1.0;
        videoRef.current.play().catch(() => {});
      }
      setIsMuted(nextMuted);
    }
  };

  const handleRemoveVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setVideoDuration(null);
    setVideoDimensions(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddHashtag = (tag: string) => {
    if (caption.includes(tag)) return;
    setCaption((prev) => (prev ? `${prev.trim()} ${tag}` : tag));
  };

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const handleConnectPlatform = async (platformId: "youtube" | "instagram" | "tiktok") => {
    if (!isSignedIn) {
      // Save draft and open sign in
      sessionStorage.setItem("vexel_studio_draft", JSON.stringify({ title, caption, selectedPlatforms }));
      sessionStorage.setItem("vexel_oauth_return_to", "/studio");
      if (openSignIn) {
        openSignIn();
      } else {
        setLocation("/sign-in");
      }
      return;
    }

    try {
      sessionStorage.setItem("vexel_studio_draft", JSON.stringify({ title, caption, selectedPlatforms }));
      sessionStorage.setItem("vexel_oauth_return_to", "/studio");
      const res = await connectPlatform.mutateAsync({ platform: platformId });
      if (res.url) {
        window.location.href = res.url;
      }
    } catch {
      toast({
        title: "Erro ao conectar",
        description: "Não foi possível iniciar o login da plataforma.",
        variant: "destructive",
      });
    }
  };

  // Thumbnail generator helper
  const captureVideoThumbnail = async (videoFile: File): Promise<Blob | null> => {
    const objectUrl = URL.createObjectURL(videoFile);
    try {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      video.src = objectUrl;

      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error("Timeout ao gerar miniatura")), 15000);
        video.onloadedmetadata = () => {
          window.clearTimeout(timeout);
          resolve();
        };
        video.onerror = () => {
          window.clearTimeout(timeout);
          reject(new Error("Erro ao ler vídeo para miniatura"));
        };
      });

      await new Promise<void>((resolve) => {
        const timeout = window.setTimeout(resolve, 5000);
        video.onseeked = () => {
          window.clearTimeout(timeout);
          resolve();
        };
        video.currentTime = 0.001;
      });

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1080;
      canvas.height = video.videoHeight || 1920;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      return await new Promise<Blob | null>((res) => {
        canvas.toBlob(res, "image/jpeg", 0.85);
      });
    } catch (e) {
      console.warn("Falha ao gerar miniatura:", e);
      return null;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  // Execute publication or scheduling
  const handlePublish = async (mode: "now" | "schedule" = "now") => {
    if (!file) {
      toast({ title: "Vídeo obrigatório", description: "Por favor, arraste ou selecione um vídeo.", variant: "destructive" });
      return;
    }

    if (!title.trim()) {
      toast({ title: "Título obrigatório", description: "Digite um título para o vídeo.", variant: "destructive" });
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast({ title: "Selecione as redes", description: "Escolha ao menos uma rede social para publicar.", variant: "destructive" });
      return;
    }

    if (mode === "schedule" && (!selectedDate || !scheduledTime)) {
      toast({ title: "Data e hora obrigatórias", description: "Escolha a data e o horário para agendar o post.", variant: "destructive" });
      return;
    }

    if (!isSignedIn) {
      sessionStorage.setItem("vexel_studio_draft", JSON.stringify({ title, caption, selectedPlatforms }));
      sessionStorage.setItem("vexel_oauth_return_to", "/studio");
      if (openSignIn) {
        openSignIn();
      } else {
        setLocation("/sign-in");
      }
      return;
    }

    // Check if selected platforms are connected
    const unconnected = selectedPlatforms.filter((p) => {
      const pl = platforms.find((item) => item.platform === p);
      return !pl?.isConnected;
    });

    if (unconnected.length > 0) {
      toast({
        title: "Contas desconectadas",
        description: `Conecte sua conta do ${unconnected.join(", ")} antes de continuar.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsPublishing(true);
      setShowStatusModal(true);
      setPublishStep("uploading");
      setStatusMessage("Enviando vídeo para o Supabase Storage...");
      setUploadProgress(10);

      // 1. Request upload URL for video
      const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
        data: {
          name: file.name,
          size: file.size,
          contentType: file.type || "video/mp4",
        },
      });

      // 2. Perform video binary upload with progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 75);
            setUploadProgress(10 + percent);
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Falha no upload do vídeo (${xhr.status})`));
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Falha na conexão durante upload do vídeo")));
        xhr.open("PUT", uploadURL);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
        xhr.send(file);
      });

      setUploadProgress(85);
      setPublishStep("thumbnail");
      setStatusMessage("Gerando capa e miniatura em alta resolução...");

      // 3. Capture & upload thumbnail
      let finalThumbnailUrl: string | null = null;
      try {
        const thumbBlob = await captureVideoThumbnail(file);
        if (thumbBlob) {
          const thumbUpload = await requestUploadUrl.mutateAsync({
            data: {
              name: `${file.name.replace(/\.[^/.]+$/, "")}-thumb.jpg`,
              size: thumbBlob.size,
              contentType: "image/jpeg",
            },
          });

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.addEventListener("load", () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve();
              else reject(new Error("Falha no upload da miniatura"));
            });
            xhr.addEventListener("error", () => reject(new Error("Erro de rede na miniatura")));
            xhr.open("PUT", thumbUpload.uploadURL);
            xhr.setRequestHeader("Content-Type", "image/jpeg");
            xhr.send(thumbBlob);
          });
          finalThumbnailUrl = thumbUpload.publicURL;
        }
      } catch (err) {
        console.warn("Miniatura opcional falhou:", err);
      }

      setUploadProgress(100);

      // 4. Se for agendamento, salva no banco e encerra com sucesso
      if (mode === "schedule") {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const day = String(selectedDate.getDate()).padStart(2, "0");
        const scheduledAtISO = new Date(`${year}-${month}-${day}T${scheduledTime}:00`).toISOString();

        await createPost.mutateAsync({
          data: {
            title: title.trim(),
            caption: caption.trim() || title.trim(),
            platforms: selectedPlatforms,
            videoObjectPath: objectPath,
            thumbnailUrl: finalThumbnailUrl,
            scheduledAt: scheduledAtISO,
          },
        });

        setIsPublishing(false);
        setShowStatusModal(false);
        setIsScheduledSuccess(true);
        toast({
          title: "Post agendado com sucesso!",
          description: `Seu post foi programado para ${format(selectedDate, "dd/MM", { locale: ptBR })} às ${scheduledTime}.`,
        });
        return;
      }

      // 5. Se for publicação imediata
      setPublishStep("distributing");
      setStatusMessage("Distribuindo simultaneamente para as redes selecionadas...");

      const created = await createPost.mutateAsync({
        data: {
          title: title.trim(),
          caption: caption.trim() || title.trim(),
          platforms: selectedPlatforms,
          videoObjectPath: objectPath,
          thumbnailUrl: finalThumbnailUrl,
        },
      });

      setCurrentPostId(created.id);
      await publishPost.mutateAsync({ id: created.id });

      // 6. Polling loop to get platform results
      let pollCount = 0;
      const pollInterval = window.setInterval(async () => {
        pollCount++;
        try {
          const postData = await getPost(created.id);
          if (postData.platformResults) {
            setLivePlatformResults(postData.platformResults);
          }

          const isAllDone =
            postData.status === "published" ||
            postData.status === "failed" ||
            (postData.platformResults &&
              postData.platformResults.every(
                (r) => r.status === "success" || r.status === "failed"
              ));

          if (isAllDone || pollCount > 60) {
            window.clearInterval(pollInterval);
            setPublishStep("done");
            setIsPublishing(false);
            setShowStatusModal(false);
            setIsCelebrationOpen(true);
          }
        } catch {
          // Keep polling
        }
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setIsPublishing(false);
      setPublishStep("error");
      setStatusMessage(err?.message || "Erro inesperado ao publicar.");
      toast({
        title: "Erro na publicação",
        description: err?.message || "Ocorreu uma falha durante o processo.",
        variant: "destructive",
      });
    }
  };

  const handleResetForNewPost = () => {
    setIsCelebrationOpen(false);
    setShowStatusModal(false);
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setTitle("");
    setCaption("");
    setLivePlatformResults([]);
    setCurrentPostId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col selection:bg-primary/30">
      {/* Sleek Minimalist Studio Header */}
      <header className="h-16 border-b border-border/40 bg-background/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/studio" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <img
              src={`${basePath}/vexelhub-logo.png`}
              alt="VexelHub"
              className="h-7 w-auto max-w-[130px] object-contain"
            />
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Smartphone size={12} />
            <span>Studio 9:16</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white flex items-center gap-1.5 text-xs sm:text-sm">
                  <LayoutDashboard size={16} />
                  <span className="hidden md:inline">Painel Completo</span>
                </Button>
              </Link>
              <div className="flex items-center gap-2 pl-2 border-l border-border/50">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20 border border-border">
                  {user?.imageUrl ? (
                    <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary">
                      {user?.firstName?.charAt(0) || "U"}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => signOut({ redirectUrl: basePath || "/" })}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Sair"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  sessionStorage.setItem("vexel_studio_draft", JSON.stringify({ title, caption, selectedPlatforms }));
                  if (openSignIn) openSignIn();
                  else setLocation("/sign-in");
                }}
                className="text-xs sm:text-sm border-border hover:bg-white/5"
              >
                Entrar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  sessionStorage.setItem("vexel_studio_draft", JSON.stringify({ title, caption, selectedPlatforms }));
                  if (openSignIn) openSignIn();
                  else setLocation("/sign-in");
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm"
              >
                1º Post Grátis
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Studio Arena */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 pt-2 sm:pt-3 pb-8 sm:pb-12 lg:px-8 flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* COLUMN 1: Quick Navigation on the Left (Simple Text Links, No Outline) */}
          <div className="lg:col-span-2 flex flex-row lg:flex-col items-center lg:items-start justify-between lg:justify-start gap-4 lg:gap-3 py-1 lg:sticky lg:top-20 border-b border-border/30 lg:border-none pb-3 lg:pb-0">
            <Link 
              href="/posts"
              className="text-xs sm:text-[13px] font-medium text-zinc-400 hover:text-white flex items-center gap-2 transition-colors hover:underline group"
            >
              <LayoutDashboard size={15} className="text-primary group-hover:scale-110 transition-transform shrink-0" />
              <span>Ver histórico de publicações</span>
            </Link>

            <button
              type="button"
              onClick={openScheduleModal}
              className="text-xs sm:text-[13px] font-medium text-zinc-400 hover:text-white flex items-center gap-2 transition-colors hover:underline group text-left cursor-pointer"
            >
              <CalendarIcon size={15} className="text-primary group-hover:scale-110 transition-transform shrink-0" />
              <span>Calendário de agendamento</span>
            </button>
          </div>

          {/* COLUMN 2: The 9:16 Smartphone Mockup Preview */}
          <div className="lg:col-span-4 flex flex-col items-center lg:sticky lg:top-16">
            {/* Phone Device Bezel */}
            <div className="relative w-full max-w-[320px] sm:max-w-[335px] lg:w-auto lg:h-[min(510px,calc(100vh-140px))] aspect-[9/16] rounded-[38px] p-2.5 sm:p-3 bg-zinc-950/90 border border-white/10 shadow-[0_0_40px_rgba(124,58,237,0.22)] ring-1 ring-white/5 backdrop-blur-2xl flex flex-col transition-all">
              
              {/* Speaker & Dynamic Notch */}
              <div className="w-full flex justify-center pb-2 pt-1 select-none pointer-events-none">
                <div className="w-24 h-4 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-zinc-800" />
                  <div className="w-8 h-1 rounded-full bg-zinc-800/80" />
                </div>
              </div>

              {/* Screen Area */}
              <div 
                className={`relative flex-1 w-full rounded-[30px] overflow-hidden bg-zinc-900/90 flex flex-col items-center justify-center transition-all ${
                  !file ? (isDragging ? 'border-2 border-primary bg-primary/10' : 'border border-dashed border-white/15 hover:border-primary/50 cursor-pointer') : 'border border-white/10'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !file && fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept="video/mp4,video/quicktime,video/webm"
                  className="hidden"
                />

                {file && previewUrl ? (
                  // Video Playing State
                  <div className="relative w-full h-full group bg-black flex items-center justify-center overflow-hidden rounded-[28px]" onClick={toggleVideoPlayback}>
                    <video
                      ref={videoRef}
                      src={previewUrl}
                      loop
                      autoPlay
                      muted={isMuted}
                      playsInline
                      onLoadedMetadata={handleLoadedMetadata}
                      className={`w-full h-full transition-all duration-300 ${
                        fitMode === "contain" ? "object-contain bg-black" : "object-cover"
                      }`}
                    />

                    {/* Top Overlay Controls: Mute/Sound on Top-Left, Trash on Top-Right */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between z-20 pointer-events-auto">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={toggleVideoMute}
                          className="w-8 h-8 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                          title={isMuted ? "Ativar som" : "Desativar som"}
                        >
                          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} className="text-green-400" />}
                        </button>
                        {isLandscape && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFitMode((prev) => (prev === "contain" ? "cover" : "contain"));
                            }}
                            className="px-2 py-1 rounded-full bg-black/75 hover:bg-black/90 backdrop-blur-md border border-white/15 text-[10px] text-white/90 hover:text-white flex items-center gap-1 transition-all"
                            title="Alternar entre modo com tarjas pretas ou tela cheia"
                          >
                            {fitMode === "contain" ? "↕ Com Tarjas" : "⤢ Preencher"}
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveVideo();
                        }}
                        className="w-8 h-8 rounded-full bg-black/75 hover:bg-destructive text-white/80 hover:text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all shadow-lg hover:scale-105 active:scale-95"
                        title="Remover vídeo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Play/Pause Overlay indicator */}
                    {!isPlaying && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none z-10">
                        <div className="w-14 h-14 rounded-full bg-primary/80 text-white flex items-center justify-center shadow-lg">
                          <Play size={24} className="ml-1" />
                        </div>
                      </div>
                    )}

                    {/* OVERLAY: YouTube Shorts Mockup */}
                    {previewPlatform === "youtube" && (
                      <div className="absolute inset-0 pointer-events-none z-15 flex flex-col justify-between p-3 select-none">
                        {/* Top Bar */}
                        <div className="flex items-center justify-between pt-12 px-1">
                          <span className="text-[11px] font-black tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] flex items-center gap-1.5">
                            <SiYoutube className="text-red-600" size={15} /> Shorts
                          </span>
                          <div className="flex items-center gap-2.5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                            <Search size={15} />
                            <MoreVertical size={15} />
                          </div>
                        </div>

                        {/* Bottom Section (Posicionado no rodapé real) */}
                        <div className="relative flex items-end justify-between pb-3 sm:pb-3.5">
                          {/* Left Info: Channel & Title */}
                          <div className="space-y-1.5 max-w-[72%] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                            <div className="flex items-center gap-1.5 flex-nowrap">
                              <div className="w-6 h-6 rounded-full bg-red-600 border border-white/40 flex items-center justify-center font-bold text-[9px] text-white shrink-0">
                                VX
                              </div>
                              <span className="text-xs font-bold text-white truncate max-w-[90px]">@seu.canal</span>
                              <span className="bg-white text-black font-bold text-[9px] px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                                Inscrever-se
                              </span>
                            </div>
                            <p className="text-[11px] text-white font-medium line-clamp-2 leading-tight">
                              {title.trim() || "Título do seu vídeo no Shorts #shorts #viral"}
                            </p>
                            <div className="flex items-center gap-1 text-[10px] text-zinc-200">
                              <Music size={10} className="shrink-0" />
                              <span className="truncate">Som original - @seu.canal</span>
                            </div>
                          </div>

                          {/* Right Action Stack */}
                          <div className="flex flex-col items-center gap-2.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-white">
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="w-8 h-8 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center">
                                <ThumbsUp size={15} />
                              </div>
                              <span className="text-[9px] font-semibold">124K</span>
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="w-8 h-8 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center">
                                <ThumbsDown size={15} />
                              </div>
                              <span className="text-[9px]">Dislike</span>
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="w-8 h-8 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center">
                                <MessageCircle size={15} />
                              </div>
                              <span className="text-[9px] font-semibold">1.4K</span>
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="w-8 h-8 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center">
                                <Share2 size={15} />
                              </div>
                              <span className="text-[9px] font-semibold">Share</span>
                            </div>
                            <div className="w-6 h-6 rounded-lg border border-white/60 bg-zinc-800 flex items-center justify-center mt-0.5">
                              <Music size={10} className="text-white animate-pulse" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* OVERLAY: Instagram Reels Mockup */}
                    {previewPlatform === "instagram" && (
                      <div className="absolute inset-0 pointer-events-none z-15 flex flex-col justify-between p-3 select-none">
                        {/* Top Bar */}
                        <div className="flex items-center justify-between pt-12 px-1">
                          <span className="text-sm font-bold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                            Reels
                          </span>
                          <div className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                            <MoreVertical size={16} />
                          </div>
                        </div>

                        {/* Bottom Section (Posicionado no rodapé real) */}
                        <div className="relative flex items-end justify-between pb-3 sm:pb-3.5">
                          {/* Left Info: Profile & Caption */}
                          <div className="space-y-1.5 max-w-[72%] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                            <div className="flex items-center gap-1.5 flex-nowrap">
                              <div className="w-6 h-6 rounded-full p-[1.5px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 shrink-0">
                                <div className="w-full h-full rounded-full bg-black flex items-center justify-center font-bold text-[8px] text-white">
                                  IG
                                </div>
                              </div>
                              <span className="text-xs font-bold text-white truncate max-w-[90px]">seu_perfil</span>
                              <span className="border border-white/60 text-white font-semibold text-[9px] px-2 py-0.5 rounded-md shrink-0">
                                Seguir
                              </span>
                            </div>
                            <p className="text-[11px] text-white leading-tight line-clamp-2">
                              {title.trim() || "Legenda do Reels aqui... 🔥 #reels #explorar"}
                            </p>
                            <div className="flex items-center gap-1 text-[10px] text-zinc-200">
                              <Music size={10} className="shrink-0" />
                              <span className="truncate">Áudio original • seu_perfil</span>
                            </div>
                          </div>

                          {/* Right Action Stack */}
                          <div className="flex flex-col items-center gap-2.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-white">
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="w-8 h-8 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center">
                                <Heart size={16} className="text-white" />
                              </div>
                              <span className="text-[9px] font-semibold">89.4K</span>
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="w-8 h-8 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center">
                                <MessageCircle size={16} className="text-white" />
                              </div>
                              <span className="text-[9px] font-semibold">942</span>
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="w-8 h-8 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center">
                                <Send size={15} className="text-white" />
                              </div>
                              <span className="text-[9px] font-semibold">14.2K</span>
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="w-8 h-8 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center">
                                <MoreVertical size={16} />
                              </div>
                            </div>
                            <div className="w-6 h-6 rounded border border-white/50 bg-black/50 overflow-hidden flex items-center justify-center">
                              <Music size={10} className="text-white" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* OVERLAY: TikTok Mockup */}
                    {previewPlatform === "tiktok" && (
                      <div className="absolute inset-0 pointer-events-none z-15 flex flex-col justify-between p-3 select-none">
                        {/* Top Bar */}
                        <div className="flex items-center justify-between pt-12 px-1">
                          <div className="w-5" />
                          <div className="flex items-center gap-3 text-xs drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                            <span className="text-white/60">Seguindo</span>
                            <span className="font-bold text-white border-b-2 border-white pb-0.5">Para Você</span>
                          </div>
                          <div className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                            <Search size={16} />
                          </div>
                        </div>

                        {/* Bottom Section (Posicionado no rodapé real) */}
                        <div className="relative flex items-end justify-between pb-3 sm:pb-3.5">
                          {/* Left Info: User & Description */}
                          <div className="space-y-1.5 max-w-[72%] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                            <span className="text-xs font-bold text-white">@seutiktok</span>
                            <p className="text-[11px] text-white leading-tight line-clamp-2">
                              {title.trim() || "Assista até o final! 🔥 #fyp #viral #foryou"}
                            </p>
                            <div className="flex items-center gap-1 text-[10px] text-zinc-200">
                              <Music size={10} className="shrink-0" />
                              <span className="truncate">som original - @seutiktok</span>
                            </div>
                          </div>

                          {/* Right Action Stack */}
                          <div className="flex flex-col items-center gap-2.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-white">
                            {/* Profile with red + */}
                            <div className="relative mb-0.5">
                              <div className="w-7 h-7 rounded-full border border-white bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-white">
                                TT
                              </div>
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-bold">
                                +
                              </div>
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="w-8 h-8 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center">
                                <Heart size={16} className="text-red-500 fill-red-500" />
                              </div>
                              <span className="text-[9px] font-semibold">248K</span>
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="w-8 h-8 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center">
                                <MessageCircle size={16} className="text-white fill-white/10" />
                              </div>
                              <span className="text-[9px] font-semibold">3.8K</span>
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="w-8 h-8 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center">
                                <Bookmark size={16} className="text-yellow-400 fill-yellow-400" />
                              </div>
                              <span className="text-[9px] font-semibold">19.2K</span>
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="w-8 h-8 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center">
                                <Share2 size={15} className="text-white" />
                              </div>
                              <span className="text-[9px] font-semibold">8.7K</span>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center animate-[spin_4s_linear_infinite] mt-0.5">
                              <div className="w-2 h-2 rounded-full bg-zinc-400" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Empty State - Drag & Drop Target
                  <div className="p-6 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(124,58,237,0.25)] group-hover:scale-105 transition-transform">
                      <Plus size={32} />
                    </div>
                    <p className="font-bold text-white text-base sm:text-lg mb-1">
                      Toque para escolher seu vídeo
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                      ou arraste aqui (9:16 ou 16:9)
                    </p>
                    <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-300">
                      <span>MP4 • MOV • WebM</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Phone Indicator Bar */}
              <div className="w-full flex justify-center pt-2 pb-0.5 select-none pointer-events-none">
                <div className="w-28 h-1 rounded-full bg-white/20" />
              </div>
            </div>

            {/* 3 Botões de Simulação de Prévia nas Plataformas */}
            <div className="w-full max-w-[320px] mt-3 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={12} className="text-primary" />
                  <span>Simular prévia nativa:</span>
                </span>
                {previewPlatform !== "clean" && (
                  <button
                    type="button"
                    onClick={() => setPreviewPlatform("clean")}
                    className="text-[10px] text-zinc-400 hover:text-white transition-colors"
                  >
                    Desativar ✕
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {/* 1. YouTube Shorts */}
                <button
                  type="button"
                  onClick={() => setPreviewPlatform((prev) => (prev === "youtube" ? "clean" : "youtube"))}
                  className={`h-9 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                    previewPlatform === "youtube"
                      ? "bg-red-500/20 border-red-500/70 text-white shadow-[0_0_12px_rgba(239,68,68,0.3)] ring-1 ring-red-500/50"
                      : "bg-card/70 hover:bg-white/5 border-border/60 text-muted-foreground hover:text-white"
                  }`}
                  title="Simular visual no YouTube Shorts"
                >
                  <SiYoutube className={previewPlatform === "youtube" ? "text-red-500" : "text-zinc-400"} size={14} />
                  <span>Shorts</span>
                </button>

                {/* 2. Instagram Reels */}
                <button
                  type="button"
                  onClick={() => setPreviewPlatform((prev) => (prev === "instagram" ? "clean" : "instagram"))}
                  className={`h-9 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                    previewPlatform === "instagram"
                      ? "bg-gradient-to-r from-pink-500/25 via-purple-500/25 to-orange-500/25 border-pink-500/70 text-white shadow-[0_0_12px_rgba(236,72,153,0.3)] ring-1 ring-pink-500/50"
                      : "bg-card/70 hover:bg-white/5 border-border/60 text-muted-foreground hover:text-white"
                  }`}
                  title="Simular visual no Instagram Reels"
                >
                  <SiInstagram className={previewPlatform === "instagram" ? "text-pink-400" : "text-zinc-400"} size={13} />
                  <span>Reels</span>
                </button>

                {/* 3. TikTok */}
                <button
                  type="button"
                  onClick={() => setPreviewPlatform((prev) => (prev === "tiktok" ? "clean" : "tiktok"))}
                  className={`h-9 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                    previewPlatform === "tiktok"
                      ? "bg-cyan-500/20 border-cyan-400/70 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400/50"
                      : "bg-card/70 hover:bg-white/5 border-border/60 text-muted-foreground hover:text-white"
                  }`}
                  title="Simular visual no TikTok"
                >
                  <SiTiktok className={previewPlatform === "tiktok" ? "text-cyan-400" : "text-zinc-400"} size={13} />
                  <span>TikTok</span>
                </button>
              </div>

              {isLandscape && (
                <p className="text-[11px] text-amber-400/90 text-center flex items-center justify-center gap-1 pt-1">
                  <Info size={11} className="shrink-0" />
                  <span>Vídeo horizontal: letterbox automático nas redes.</span>
                </p>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: The Ultra-Focused Publisher Cockpit */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            
            <div className="space-y-1 text-center lg:text-left">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Publicação Instantânea em 1 Clique
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto lg:mx-0">
                Envie uma vez e veja seu corte cair simultaneamente no YouTube Shorts, Instagram Reels e TikTok.
              </p>
            </div>

            {/* Field: Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-white flex items-center gap-1.5">
                  Título do Vídeo <span className="text-primary">*</span>
                </label>
                <span className={`text-xs font-mono ${title.length > 90 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                  {title.length}/100
                </span>
              </div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                placeholder="Ex: Como dobrei minhas visualizações em 7 dias 🚀"
                className="bg-card border-border/60 focus:border-primary text-white h-12 text-base rounded-xl px-4"
              />
            </div>

            {/* Field: Caption & Hashtags */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white flex items-center justify-between">
                <span>Legenda e Descrição (opcional)</span>
                <span className="text-xs text-muted-foreground font-normal">Replicada para todas as redes</span>
              </label>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Escreva a legenda para o Reels, TikTok e descrição do Shorts..."
                rows={3}
                className="bg-card border-border/60 focus:border-primary text-white text-sm rounded-xl resize-none p-3.5"
              />
              {/* Quick Hashtag helper chips */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                <span className="text-[11px] text-muted-foreground mr-1">Tags rápidas:</span>
                {QUICK_HASHTAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddHashtag(tag)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-muted/40 hover:bg-primary/20 hover:text-primary text-muted-foreground border border-border/40 transition-colors"
                  >
                    +{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Field: Trio de Ouro Platform Selectors */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-white">
                  Publicar em: <span className="text-xs font-normal text-muted-foreground">(O Trio de Ouro)</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPlatforms.length === 3) setSelectedPlatforms([]);
                    else setSelectedPlatforms(["youtube", "instagram", "tiktok"]);
                  }}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {selectedPlatforms.length === 3 ? "Desmarcar todas" : "Selecionar todas"}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {/* 1. YouTube Shorts */}
                {(() => {
                  const yt = platforms.find((p) => p.platform === "youtube");
                  const isConnected = yt?.isConnected;
                  const isSelected = selectedPlatforms.includes("youtube");

                  return (
                    <div
                      onClick={() => isConnected && togglePlatform("youtube")}
                      className={`relative p-2.5 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-between text-center min-h-[96px] sm:min-h-[110px] select-none ${
                        isSelected && isConnected
                          ? "bg-primary/10 border-primary/60 shadow-[0_0_15px_rgba(124,58,237,0.2)]"
                          : isConnected
                          ? "bg-card border-border/50 hover:border-border"
                          : "bg-muted/10 border-border/30 opacity-75"
                      }`}
                    >
                      {/* Check badge in top-right */}
                      {isConnected && (
                        <div
                          className={`absolute top-2 right-2 w-4 h-4 sm:w-5 sm:h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isSelected ? "bg-primary border-primary text-white" : "border-border/70 bg-card/80"
                          }`}
                        >
                          {isSelected && <Check size={11} strokeWidth={3} />}
                        </div>
                      )}

                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#FF0000]/15 flex items-center justify-center text-[#FF0000] shrink-0 mb-1 sm:mb-1.5 mt-0.5">
                        <SiYoutube size={18} />
                      </div>

                      <div className="w-full">
                        <p className="font-bold text-white text-xs sm:text-sm truncate">
                          <span className="sm:hidden">Shorts</span>
                          <span className="hidden sm:inline">YouTube Shorts</span>
                        </p>
                        {isConnected ? (
                          <div className="flex flex-col items-center">
                            <p className="text-[10px] sm:text-[11px] text-green-400 font-medium truncate flex items-center justify-center gap-1 mt-0.5 max-w-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                              <span className="truncate">{yt?.accountName || "Conectado"}</span>
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConnectPlatform("youtube");
                              }}
                              className="text-[9px] text-muted-foreground hover:text-white underline mt-0.5"
                              title="Reconectar conta do YouTube"
                            >
                              reconectar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConnectPlatform("youtube");
                            }}
                            className="text-[10px] sm:text-[11px] text-primary hover:underline font-semibold mt-0.5 block w-full truncate"
                          >
                            Conectar ➔
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Instagram Reels */}
                {(() => {
                  const ig = platforms.find((p) => p.platform === "instagram");
                  const isConnected = ig?.isConnected;
                  const isSelected = selectedPlatforms.includes("instagram");

                  return (
                    <div
                      onClick={() => isConnected && togglePlatform("instagram")}
                      className={`relative p-2.5 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-between text-center min-h-[96px] sm:min-h-[110px] select-none ${
                        isSelected && isConnected
                          ? "bg-primary/10 border-primary/60 shadow-[0_0_15px_rgba(124,58,237,0.2)]"
                          : isConnected
                          ? "bg-card border-border/50 hover:border-border"
                          : "bg-muted/10 border-border/30 opacity-75"
                      }`}
                    >
                      {/* Check badge in top-right */}
                      {isConnected && (
                        <div
                          className={`absolute top-2 right-2 w-4 h-4 sm:w-5 sm:h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isSelected ? "bg-primary border-primary text-white" : "border-border/70 bg-card/80"
                          }`}
                        >
                          {isSelected && <Check size={11} strokeWidth={3} />}
                        </div>
                      )}

                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#E1306C]/15 flex items-center justify-center text-[#E1306C] shrink-0 mb-1 sm:mb-1.5 mt-0.5">
                        <SiInstagram size={18} />
                      </div>

                      <div className="w-full">
                        <p className="font-bold text-white text-xs sm:text-sm truncate">
                          <span className="sm:hidden">Reels</span>
                          <span className="hidden sm:inline">Instagram Reels</span>
                        </p>
                        {isConnected ? (
                          <div className="flex flex-col items-center">
                            <p className="text-[10px] sm:text-[11px] text-green-400 font-medium truncate flex items-center justify-center gap-1 mt-0.5 max-w-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                              <span className="truncate">{ig?.accountName ? `@${ig.accountName}` : "Conectado"}</span>
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConnectPlatform("instagram");
                              }}
                              className="text-[9px] text-muted-foreground hover:text-white underline mt-0.5"
                              title="Reconectar conta do Instagram"
                            >
                              reconectar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConnectPlatform("instagram");
                            }}
                            className="text-[10px] sm:text-[11px] text-primary hover:underline font-semibold mt-0.5 block w-full truncate"
                          >
                            Conectar ➔
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 3. TikTok */}
                {(() => {
                  const tt = platforms.find((p) => p.platform === "tiktok");
                  const isConnected = tt?.isConnected;
                  const isSelected = selectedPlatforms.includes("tiktok");

                  return (
                    <div
                      onClick={() => isConnected && togglePlatform("tiktok")}
                      className={`relative p-2.5 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-between text-center min-h-[96px] sm:min-h-[110px] select-none ${
                        isSelected && isConnected
                          ? "bg-primary/10 border-primary/60 shadow-[0_0_15px_rgba(124,58,237,0.2)]"
                          : isConnected
                          ? "bg-card border-border/50 hover:border-border"
                          : "bg-muted/10 border-border/30 opacity-75"
                      }`}
                    >
                      {/* Check badge in top-right */}
                      {isConnected && (
                        <div
                          className={`absolute top-2 right-2 w-4 h-4 sm:w-5 sm:h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isSelected ? "bg-primary border-primary text-white" : "border-border/70 bg-card/80"
                          }`}
                        >
                          {isSelected && <Check size={11} strokeWidth={3} />}
                        </div>
                      )}

                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0 mb-1 sm:mb-1.5 mt-0.5">
                        <SiTiktok size={16} />
                      </div>

                      <div className="w-full">
                        <p className="font-bold text-white text-xs sm:text-sm truncate">
                          TikTok
                        </p>
                        {isConnected ? (
                          <div className="flex flex-col items-center">
                            <p className="text-[10px] sm:text-[11px] text-green-400 font-medium truncate flex items-center justify-center gap-1 mt-0.5 max-w-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                              <span className="truncate">{tt?.accountName || "Conectado"}</span>
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConnectPlatform("tiktok");
                              }}
                              className="text-[9px] text-muted-foreground hover:text-white underline mt-0.5"
                              title="Reconectar conta do TikTok"
                            >
                              reconectar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConnectPlatform("tiktok");
                            }}
                            className="text-[10px] sm:text-[11px] text-primary hover:underline font-semibold mt-0.5 block w-full truncate"
                          >
                            Conectar ➔
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Action CTA: PUBLICAR AGORA */}
            <div className="pt-2">
              <Button
                type="button"
                onClick={() => handlePublish("now")}
                disabled={isPublishing}
                className="w-full h-15 py-6 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-lg shadow-[0_0_30px_rgba(124,58,237,0.4)] border border-white/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="animate-spin" size={22} />
                    <span>Publicando seu corte...</span>
                  </>
                ) : !isSignedIn ? (
                  <>
                    <Sparkles size={20} />
                    <span>Entrar e Publicar (1º Post 100% Grátis) 🚀</span>
                  </>
                ) : (
                  <>
                    <Zap size={22} className="fill-current" />
                    <span>PUBLICAR AGORA 🚀</span>
                  </>
                )}
              </Button>

              {/* Opção de Agendamento com Alto Destaque que abre o Modal */}
              <div className="pt-3">
                <Button
                  type="button"
                  onClick={openScheduleModal}
                  className="w-full h-14 sm:h-15 py-5 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white shadow-[0_0_25px_rgba(99,102,241,0.35)] border border-indigo-400/40"
                >
                  <CalendarIcon size={20} className="text-white" />
                  <span>AGENDAR PARA MAIS TARDE 📅</span>
                </Button>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Modal do Calendário de Agendamento */}
      <Dialog open={isSchedulingModalOpen} onOpenChange={setIsSchedulingModalOpen}>
        <DialogContent className="sm:max-w-md bg-card/95 border-2 border-primary/40 backdrop-blur-2xl text-foreground p-5 sm:p-6 rounded-3xl shadow-[0_0_50px_rgba(124,58,237,0.35)]">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <CalendarIcon size={20} className="text-primary" />
              <span>Agendar Publicação</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              Escolha a data e o horário local para disparo automático nas suas redes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Calendar Header with Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-primary">
                  <CalendarIcon size={14} />
                </div>
                <span className="text-sm font-bold text-white capitalize">
                  {format(calendarMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isSameMonth(calendarMonth, new Date()) || isBefore(calendarMonth, new Date())}
                  onClick={() => setCalendarMonth((prev) => subMonths(prev, 1))}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-20"
                  title="Mês anterior"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCalendarMonth((prev) => addMonths(prev, 1))}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg"
                  title="Próximo mês"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>

            {/* Days of Week (Dom a Sáb) */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((dayName, idx) => (
                <div
                  key={dayName}
                  className={`text-[10px] sm:text-[11px] font-bold py-1 select-none ${
                    idx === 0 || idx === 6 ? "text-primary/70" : "text-muted-foreground"
                  }`}
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Calendar Day Squares */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {calendarDays.map((day) => {
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, calendarMonth);
                const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
                const isCurrentDay = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={isPast}
                    onClick={() => {
                      setSelectedDate(day);
                      if (isToday(day)) {
                        setScheduledTime(getCurrentLocalTime());
                      }
                    }}
                    className={`aspect-square h-8 sm:h-9 w-full rounded-xl text-xs font-semibold flex flex-col items-center justify-center relative transition-all ${
                      isSelected
                        ? "bg-primary text-white font-bold shadow-[0_0_15px_rgba(124,58,237,0.45)] ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : isPast
                        ? "text-zinc-600 opacity-25 cursor-not-allowed hover:bg-transparent"
                        : !isCurrentMonth
                        ? "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                        : "text-zinc-200 hover:bg-white/10 hover:text-white"
                    } ${isCurrentDay && !isSelected ? "border border-primary/50 text-primary" : ""}`}
                  >
                    <span>{format(day, "d")}</span>
                    {isCurrentDay && !isSelected && (
                      <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Horário da Publicação (Limpo e Centralizado com Relógio em Destaque) */}
            <div className="pt-3 border-t border-border/40 flex flex-col items-center justify-center text-center space-y-2">
              <label
                className="text-xs sm:text-sm font-bold text-zinc-200 flex items-center justify-center gap-2 cursor-pointer hover:text-primary transition-colors"
                onClick={() => {
                  try {
                    timeInputRef.current?.showPicker?.();
                  } catch {
                    timeInputRef.current?.focus();
                  }
                }}
              >
                <Clock size={16} className="text-primary animate-pulse" />
                <span>Horário da publicação:</span>
              </label>
              <div className="w-full max-w-[210px] relative">
                <Input
                  ref={timeInputRef}
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full text-center text-lg sm:text-xl font-bold font-mono h-12 rounded-xl bg-background border-2 border-primary/50 focus:border-primary text-white shadow-[0_0_15px_rgba(124,58,237,0.25)] cursor-pointer pr-3"
                />
              </div>
              <p className="text-[11px] text-zinc-400 flex items-center justify-center gap-1">
                <Sparkles size={11} className="text-primary shrink-0" />
                <span>Dica: clique no reloginho para escolher horários rápidos</span>
              </p>
            </div>

            {/* Summary Card */}
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-zinc-300">
                  Programado: <strong className="text-white capitalize">{format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}</strong> às <strong className="text-primary font-mono">{scheduledTime}</strong>
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                Fuso local
              </Badge>
            </div>

            {/* Confirm Schedule Button */}
            <Button
              type="button"
              onClick={() => {
                setIsSchedulingModalOpen(false);
                handlePublish("schedule");
              }}
              disabled={isPublishing || !selectedDate || !scheduledTime}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-sm h-12 rounded-xl transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] flex items-center justify-center gap-2"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  <span>Agendando publicação...</span>
                </>
              ) : (
                <>
                  <CalendarIcon size={16} />
                  <span>
                    Confirmar Agendamento ({format(selectedDate, "dd/MM", { locale: ptBR })} às {scheduledTime})
                  </span>
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Progress & Live Publishing Modal */}
      <Dialog open={showStatusModal} onOpenChange={(open) => !isPublishing && setShowStatusModal(open)}>
        <DialogContent className="sm:max-w-md bg-card border-border/80 text-foreground p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Loader2 className="animate-spin text-primary" size={20} />
              Publicando nas Redes
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Distribuindo seu vídeo 9:16 diretamente aos servidores oficiais.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-zinc-300">{statusMessage}</span>
                <span className="text-primary font-mono">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2 bg-muted/30" />
            </div>

            {/* Platform status cards */}
            <div className="space-y-2">
              {selectedPlatforms.map((plat) => {
                const result = livePlatformResults.find((r) => r.platform === plat);
                const isPending = !result || result.status === "pending";
                const isSuccess = result?.status === "success";
                const isFailed = result?.status === "failed";

                return (
                  <div
                    key={plat}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40"
                  >
                    <div className="flex items-center gap-2.5">
                      {plat === "youtube" && <SiYoutube className="text-[#FF0000]" size={18} />}
                      {plat === "instagram" && <SiInstagram className="text-[#E1306C]" size={18} />}
                      {plat === "tiktok" && <SiTiktok className="text-white" size={16} />}
                      <span className="text-sm font-semibold capitalize text-white">
                        {plat === "youtube" ? "YouTube Shorts" : plat === "instagram" ? "Instagram Reels" : "TikTok"}
                      </span>
                    </div>

                    <div>
                      {isSuccess ? (
                        <span className="text-xs font-semibold text-green-400 flex items-center gap-1">
                          <CheckCircle2 size={14} /> Publicado!
                        </span>
                      ) : isFailed ? (
                        <span className="text-xs font-semibold text-destructive flex items-center gap-1">
                          <AlertCircle size={14} /> Falhou
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 size={12} className="animate-spin text-primary" />
                          {result?.stage || (publishStep === "uploading" ? "Aguardando envio..." : "Processando...")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Celebration & R$ 14,90/mês Monetization Modal */}
      <Dialog open={isCelebrationOpen} onOpenChange={setIsCelebrationOpen}>
        <DialogContent className="sm:max-w-lg bg-zinc-950 border border-white/10 text-foreground p-6 sm:p-8 rounded-[32px] shadow-2xl">
          <div className="text-center space-y-4">
            
            {/* Celebration Icon */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center mx-auto shadow-[0_0_35px_rgba(124,58,237,0.5)]">
              <Sparkles size={32} />
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                🎉 Publicado com Sucesso!
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Seu vídeo está sendo exibido para os seus seguidores e novos espectadores.
              </p>
            </div>

            {/* Direct Links to Published Posts */}
            <div className="space-y-2 text-left bg-zinc-900/80 p-3.5 rounded-2xl border border-white/5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Acesse seus posts:
              </p>
              {livePlatformResults.map((r) => (
                <div key={r.platform} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2">
                    {r.platform === "youtube" && <SiYoutube className="text-[#FF0000]" size={14} />}
                    {r.platform === "instagram" && <SiInstagram className="text-[#E1306C]" size={14} />}
                    {r.platform === "tiktok" && <SiTiktok className="text-white" size={13} />}
                    <span className="capitalize font-medium text-white">{r.platform}</span>
                  </div>
                  {r.postUrl ? (
                    <a
                      href={r.postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      Ver post ↗
                    </a>
                  ) : r.status === "success" ? (
                    <span className="text-green-400 font-medium">Publicado ✓</span>
                  ) : (
                    <span className="text-destructive font-medium">Erro ao publicar</span>
                  )}
                </div>
              ))}
            </div>

            {/* Free First Post Banner */}
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-medium flex items-center justify-center gap-2">
              <Crown size={15} />
              <span>Seu 1º post no VexelHub foi 100% gratuito!</span>
            </div>

            {/* Monetization Pricing Card: R$ 14,90/mês */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-primary/40 relative overflow-hidden text-left shadow-lg">
              <div className="absolute top-2 right-2">
                <Badge className="bg-primary text-white text-[10px] uppercase font-bold">Oferta de Lançamento</Badge>
              </div>

              <p className="text-xs font-bold text-primary uppercase tracking-wider">Plano Criador Ilimitado</p>
              <div className="flex items-baseline gap-1 my-1">
                <span className="text-3xl font-black text-white">R$ 14,90</span>
                <span className="text-xs text-muted-foreground">/ mês</span>
              </div>
              <p className="text-xs text-zinc-300 mb-3">
                Publique cortes ilimitados com 1 clique no Shorts, Reels e TikTok sem complicação.
              </p>

              <ul className="space-y-1.5 text-xs text-zinc-400 mb-4">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-green-400" /> Publicações simultâneas ilimitadas
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-green-400" /> Economize até 25h de trabalho por mês
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-green-400" /> Cancele quando quiser, sem fidelidade
                </li>
              </ul>

              <Button
                onClick={() => {
                  toast({
                    title: "Em breve!",
                    description: "O checkout Stripe com a assinatura de R$ 14,90/mês estará disponível nas próximas atualizações.",
                  });
                }}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-sm h-11 rounded-xl shadow-[0_0_20px_rgba(124,58,237,0.3)]"
              >
                Garantir Assinatura por R$ 14,90
              </Button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleResetForNewPost}
                className="flex-1 border-white/10 hover:bg-white/5 text-white rounded-xl h-11"
              >
                Publicar Outro Vídeo
              </Button>
              <Link href="/posts" className="flex-1">
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-white rounded-xl h-11"
                >
                  Ver Histórico
                </Button>
              </Link>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Agendamento */}
      <Dialog open={isScheduledSuccess} onOpenChange={setIsScheduledSuccess}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border border-white/10 text-foreground p-6 rounded-[28px] shadow-2xl text-center">
          <div className="w-14 h-14 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-3 border border-primary/30 shadow-[0_0_25px_rgba(124,58,237,0.4)]">
            <CalendarIcon size={28} />
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white text-center">
              📅 Post Agendado com Sucesso!
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm text-center">
              Seu corte foi programado e está salvo para envio nas plataformas escolhidas.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-xl bg-muted/20 border border-border/50 text-left space-y-2 my-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Data e Horário:</span>
              <span className="font-semibold text-white">
                {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : ""} às {scheduledTime}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Plataformas:</span>
              <span className="font-semibold text-primary capitalize">{selectedPlatforms.join(", ")}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleResetForNewPost}
              className="flex-1 border-white/10 hover:bg-white/5 text-white rounded-xl h-10 text-xs"
            >
              Criar Outro Post
            </Button>
            <Link href="/calendar" className="flex-1">
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-10 text-xs font-semibold"
              >
                Ver no Calendário
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
