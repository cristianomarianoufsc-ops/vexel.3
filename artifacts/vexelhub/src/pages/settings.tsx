import { useListPlatforms, useConnectPlatform, useDisconnectPlatform } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Link2, Unlink2, ShieldCheck, AlertCircle } from "lucide-react";
import { SiYoutube, SiInstagram, SiTiktok } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function Settings() {
  const { data: platforms = [], isLoading, refetch } = useListPlatforms();
  const connectPlatform = useConnectPlatform();
  const disconnectPlatform = useDisconnectPlatform();
  const { toast } = useToast();

  const handleConnect = async (platformId: 'youtube' | 'instagram' | 'tiktok') => {
    try {
      // In a real flow, this mutation returns an OAuth URL that we redirect to.
      // The API spec returns { url: string }
      const res = await connectPlatform.mutateAsync({ platform: platformId });
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (e) {
      toast({ title: "Connection failed", description: "Could not initiate OAuth flow", variant: "destructive" });
    }
  };

  const handleDisconnect = async (platformId: 'youtube' | 'instagram' | 'tiktok') => {
    if (!confirm(`Are you sure you want to disconnect ${platformId}?`)) return;
    try {
      await disconnectPlatform.mutateAsync({ platform: platformId });
      toast({ title: "Disconnected successfully" });
      refetch();
    } catch (e) {
      toast({ title: "Disconnection failed", variant: "destructive" });
    }
  };

  const platformIcons = {
    youtube: <SiYoutube size={24} className="text-[#FF0000]" />,
    instagram: <SiInstagram size={24} className="text-[#E1306C]" />,
    tiktok: <SiTiktok size={24} className="text-white" />
  };

  const platformNames = {
    youtube: "YouTube Shorts",
    instagram: "Instagram Reels",
    tiktok: "TikTok"
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1 flex items-center gap-3">
          <SettingsIcon className="text-primary" /> Settings & Integrations
        </h1>
        <p className="text-muted-foreground">Connect the pipes. Wire the hub.</p>
      </div>

      <Card className="bg-card border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <Link2 size={20} className="text-primary" /> Connected Platforms
          </CardTitle>
          <CardDescription>
            Authorize VexelHub to publish directly to these accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded bg-border/50" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32 bg-border/50" />
                    <Skeleton className="h-3 w-20 bg-border/50" />
                  </div>
                </div>
                <Skeleton className="h-9 w-24 rounded bg-border/50" />
              </div>
            ))
          ) : (
            ['youtube', 'instagram', 'tiktok'].map((pKey) => {
              const platform = platforms.find(p => p.platform === pKey);
              const isConnected = platform?.isConnected;

              return (
                <div key={pKey} className={`flex items-center justify-between p-4 rounded-xl border ${isConnected ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-muted/20'} transition-all`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isConnected ? 'bg-background shadow-inner' : 'bg-background opacity-50 grayscale'}`}>
                      {platformIcons[pKey as keyof typeof platformIcons]}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{platformNames[pKey as keyof typeof platformNames]}</h3>
                      {isConnected ? (
                        <div className="flex items-center gap-1.5 text-sm text-green-400 font-medium">
                          <ShieldCheck size={14} /> Connected as {platform?.accountName || 'Authorized'}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                          <AlertCircle size={14} /> Not connected
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    {isConnected ? (
                      <Button 
                        variant="outline" 
                        onClick={() => handleDisconnect(pKey as any)}
                        className="border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                      >
                        <Unlink2 size={16} className="mr-2" /> Disconnect
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleConnect(pKey as any)}
                        className="bg-white text-black hover:bg-white/90 font-bold"
                        disabled={connectPlatform.isPending}
                      >
                        <Link2 size={16} className="mr-2" /> Connect
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
      
      {/* Visual filler for empty space */}
      <div className="p-6 rounded-xl border border-border/50 bg-[repeating-linear-gradient(45deg,var(--tw-gradient-stops))] from-muted/5 to-transparent to-[10px] via-transparent via-[20px] flex items-center justify-center opacity-50">
        <p className="text-muted-foreground text-sm font-medium tracking-widest uppercase">System Configured</p>
      </div>
    </div>
  );
}