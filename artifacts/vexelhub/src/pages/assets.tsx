import { useListAssets, useDeleteAsset } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, FileVideo, Image as ImageIcon, Trash2, File as FileIcon, Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function Assets() {
  const { data: assets = [], isLoading, refetch } = useListAssets();
  const deleteAsset = useDeleteAsset();
  const { toast } = useToast();

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    try {
      await deleteAsset.mutateAsync({ id });
      toast({ title: "Asset deleted" });
      refetch();
    } catch (e) {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const getIcon = (mimeType: string) => {
    if (mimeType.startsWith('video/')) return <FileVideo size={24} className="text-primary" />;
    if (mimeType.startsWith('image/')) return <ImageIcon size={24} className="text-cyan-400" />;
    return <FileIcon size={24} className="text-muted-foreground" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1 flex items-center gap-3">
          <FolderOpen className="text-primary" /> Media Library
        </h1>
        <p className="text-muted-foreground">All your raw files, ready to deploy.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="bg-card/50 border-border/50">
              <CardContent className="p-4 flex gap-4 items-center">
                <Skeleton className="h-12 w-12 rounded-lg bg-border/50 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-border/50" />
                  <Skeleton className="h-3 w-1/2 bg-border/50" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : assets.length === 0 ? (
          <div className="col-span-full text-center py-20 border border-border/50 border-dashed rounded-xl bg-card/30">
            <FolderOpen size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Library is empty</h3>
            <p className="text-muted-foreground">Files you upload for blasts will appear here.</p>
          </div>
        ) : (
          assets.map(asset => (
            <Card key={asset.id} className="bg-card border-border/50 hover:border-primary/50 transition-colors group">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border/50 group-hover:bg-primary/10 transition-colors">
                  {getIcon(asset.mimeType)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-sm truncate mb-1" title={asset.name}>{asset.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatSize(asset.size)}</span>
                    <span>•</span>
                    <span>{format(new Date(asset.createdAt), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" size="sm" className="h-7 text-xs border-border bg-transparent hover:bg-muted" asChild>
                      <a href={`/api/storage${asset.objectPath}`} target="_blank" rel="noreferrer">
                        <ExternalLink size={12} className="mr-1" /> View
                      </a>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(asset.id)}
                    >
                      <Trash2 size={12} />
                    </Button>
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