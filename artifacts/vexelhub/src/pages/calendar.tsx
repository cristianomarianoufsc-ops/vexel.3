import { useListPosts } from "@workspace/api-client-react";
import { CalendarDays, Video } from "lucide-react";
import { format, startOfWeek, addDays, getMonth, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Calendar() {
  const { data: posts = [], isLoading } = useListPosts();
  
  const today = new Date();
  const startDate = startOfWeek(new Date(today.getFullYear(), today.getMonth(), 1));
  
  const days = [];
  for (let i = 0; i < 35; i++) {
    days.push(addDays(startDate, i));
  }

  const getPostsForDay = (date: Date) => {
    return posts.filter(p => {
      const pDate = new Date(p.scheduledAt || p.createdAt);
      return isSameDay(pDate, date);
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1 flex items-center gap-3">
          <CalendarDays className="text-cyan-400" /> Agenda de Publicações
        </h1>
        <p className="text-muted-foreground capitalize">{format(today, "MMMM 'de' yyyy", { locale: ptBR })}</p>
      </div>

      <Card className="flex-1 bg-card border-border/50 overflow-hidden flex flex-col shadow-lg">
        <div className="grid grid-cols-7 border-b border-border/50 bg-muted/30">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-bold text-muted-foreground uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 flex-1 min-h-[600px]">
          {isLoading ? (
            [...Array(35)].map((_, i) => (
              <div key={i} className="border-r border-b border-border/30 p-2 min-h-[120px]">
                <Skeleton className="w-6 h-6 rounded-full bg-border/30 mb-2" />
              </div>
            ))
          ) : (
            days.map((date, i) => {
              const isCurrentMonth = getMonth(date) === getMonth(today);
              const isToday = isSameDay(date, today);
              const dayPosts = getPostsForDay(date);
              
              return (
                <div 
                  key={i} 
                  className={`border-r border-b border-border/30 p-2 min-h-[120px] transition-colors hover:bg-muted/10 ${
                    !isCurrentMonth ? 'bg-muted/5' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-2 ${
                    isToday ? 'bg-primary text-primary-foreground shadow-[0_0_10px_rgba(124,58,237,0.5)]' : 
                    isCurrentMonth ? 'text-white' : 'text-muted-foreground/50'
                  }`}>
                    {format(date, "d")}
                  </div>
                  
                  <div className="space-y-1.5 overflow-y-auto max-h-[100px] scrollbar-hide">
                    {dayPosts.map(post => (
                      <div 
                        key={post.id} 
                        className={`text-xs px-2 py-1.5 rounded border truncate cursor-pointer ${
                          post.status === "published" ? "bg-green-500/10 border-green-500/20 text-green-400" :
                          post.status === "scheduled" ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" :
                          "bg-muted border-border text-muted-foreground"
                        }`}
                        title={post.title}
                      >
                        <div className="flex items-center gap-1 font-medium">
                          <Video size={10} className="shrink-0" />
                          <span className="truncate">{post.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
