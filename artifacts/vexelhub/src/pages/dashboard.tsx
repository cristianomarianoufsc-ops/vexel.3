import { useGetDashboardStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, UploadCloud, Video, Calendar as CalendarIcon, FileVideo, Lightbulb, Clock, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">Command Center</h1>
          <p className="text-muted-foreground">Welcome back. Here is the pulse of your content engine.</p>
        </div>
        <Link href="/publish">
          <Button className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-[0_0_15px_rgba(124,58,237,0.3)]">
            <UploadCloud size={18} />
            New Blast
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24 bg-border/50" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-16 bg-border/50" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Total Posts" 
              value={stats.totalPosts} 
              icon={<Video className="h-4 w-4 text-primary" />} 
              gradient="from-primary/20"
            />
            <StatCard 
              title="Published" 
              value={stats.publishedPosts} 
              icon={<CheckCircle2 className="h-4 w-4 text-green-400" />} 
              gradient="from-green-500/20"
            />
            <StatCard 
              title="Scheduled" 
              value={stats.scheduledPosts} 
              icon={<CalendarIcon className="h-4 w-4 text-cyan-400" />} 
              gradient="from-cyan-500/20"
            />
            <StatCard 
              title="Content Ideas" 
              value={stats.totalIdeas} 
              icon={<Lightbulb className="h-4 w-4 text-yellow-400" />} 
              gradient="from-yellow-500/20"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity size={20} className="text-primary" />
                  Recent Activity
                </h2>
                <Link href="/posts">
                  <Button variant="link" className="text-muted-foreground hover:text-white px-0">
                    View All
                  </Button>
                </Link>
              </div>
              
              <div className="space-y-3">
                {stats.recentPosts.length === 0 ? (
                  <Card className="bg-card border-border border-dashed">
                    <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                        <Video size={24} className="text-muted-foreground" />
                      </div>
                      <p className="text-white font-medium mb-1">No posts yet</p>
                      <p className="text-sm text-muted-foreground mb-4">Your broadcast history will appear here.</p>
                      <Link href="/publish">
                        <Button variant="outline" className="border-primary/50 hover:bg-primary/10 text-primary">
                          Create your first post
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  stats.recentPosts.map((post) => (
                    <Card key={post.id} className="bg-card border-border/50 hover:border-primary/30 transition-colors group overflow-hidden relative">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center shrink-0 border border-border/50">
                          {post.thumbnailUrl ? (
                            <img src={post.thumbnailUrl} alt={post.title} className="w-full h-full object-cover rounded-md" />
                          ) : (
                            <FileVideo size={24} className="text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white truncate text-base mb-1">{post.title}</h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              {post.status === "published" ? (
                                <CheckCircle2 size={14} className="text-green-400" />
                              ) : post.status === "scheduled" ? (
                                <Clock size={14} className="text-cyan-400" />
                              ) : (
                                <Video size={14} />
                              )}
                              <span className="capitalize">{post.status}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <CalendarIcon size={14} />
                              {format(new Date(post.createdAt), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {post.platforms.map((p) => (
                            <span key={p} className="text-[10px] uppercase font-bold bg-muted text-muted-foreground px-2 py-1 rounded-sm border border-border/50">
                              {p.substring(0, 2)}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">System Status</h2>
              <Card className="bg-card border-border/50">
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Platforms Connected</span>
                    <span className="text-xl font-bold text-white">{stats.connectedPlatforms}/3</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)]" 
                      style={{ width: `${(stats.connectedPlatforms / 3) * 100}%` }}
                    />
                  </div>
                  <div className="pt-4 mt-4 border-t border-border/50">
                    <Link href="/settings">
                      <Button variant="outline" className="w-full w-full border-border hover:bg-muted/50">
                        Manage Connections
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                      <FolderOpen size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">Media Library</h3>
                      <p className="text-sm text-muted-foreground">{stats.totalAssets} assets stored</p>
                    </div>
                  </div>
                  <Link href="/assets">
                    <Button variant="secondary" className="w-full bg-secondary hover:bg-secondary/80 text-white">
                      Browse Files
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatCard({ title, value, icon, gradient }: { title: string, value: number, icon: React.ReactNode, gradient: string }) {
  return (
    <Card className="bg-card border-border/50 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${gradient} to-transparent rounded-bl-full opacity-20 group-hover:opacity-40 transition-opacity`} />
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-extrabold text-white">{value}</div>
      </CardContent>
    </Card>
  );
}

// Ensure FolderOpen is imported
import { FolderOpen } from "lucide-react";