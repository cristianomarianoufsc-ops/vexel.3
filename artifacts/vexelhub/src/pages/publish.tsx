import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useCreatePost, useRequestUploadUrl, useListPlatforms } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { UploadCloud, Video, CalendarIcon, Send, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";

export default function Publish() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [isScheduled, setIsScheduled] = useState(false);
  
  // Upload state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [objectPath, setObjectPath] = useState<string | null>(null);

  // Queries/Mutations
  const { data: platforms = [] } = useListPlatforms();
  const requestUploadUrl = useRequestUploadUrl();
  const createPost = useCreatePost();

  const connectedPlatforms = platforms.filter(p => p.isConnected);
  const isFormValid = title.trim().length > 0 && selectedPlatforms.length > 0 && (objectPath !== null || file !== null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.type.startsWith('video/')) {
        toast({ title: "Invalid file", description: "Please select a video file", variant: "destructive" });
        return;
      }
      setFile(selected);
      setObjectPath(null); // Reset object path if new file
      setUploadProgress(0);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (!selected.type.startsWith('video/')) {
        toast({ title: "Invalid file", description: "Please drop a video file", variant: "destructive" });
        return;
      }
      setFile(selected);
      setObjectPath(null);
      setUploadProgress(0);
    }
  };

  const performUpload = async (): Promise<string | null> => {
    if (!file) return null;
    if (objectPath) return objectPath; // Already uploaded

    setIsUploading(true);
    setUploadProgress(10);
    try {
      // 1. Get presigned URL
      const { uploadURL, objectPath: path } = await requestUploadUrl.mutateAsync({
        data: {
          name: file.name,
          size: file.size,
          contentType: file.type
        }
      });
      setUploadProgress(30);

      // 2. PUT file directly to GCS
      const xhr = new XMLHttpRequest();
      await new Promise((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 70; // 30% to 100%
            setUploadProgress(30 + percentComplete);
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
        xhr.open("PUT", uploadURL);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      setUploadProgress(100);
      setObjectPath(path);
      return path;
    } catch (err) {
      console.error(err);
      toast({
        title: "Upload Failed",
        description: "Could not upload the video file.",
        variant: "destructive"
      });
      setIsUploading(false);
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      setIsUploading(true); // Disable form
      let finalObjectPath = objectPath;
      if (file && !finalObjectPath) {
        finalObjectPath = await performUpload();
      }

      await createPost.mutateAsync({
        data: {
          title,
          caption,
          platforms: selectedPlatforms,
          videoObjectPath: finalObjectPath,
          scheduledAt: isScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : undefined
        }
      });

      toast({
        title: "Success",
        description: "Post created successfully.",
      });
      setLocation("/posts");
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to create post.",
        variant: "destructive"
      });
      setIsUploading(false);
    }
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1 flex items-center gap-3">
          <UploadCloud className="text-primary" /> Create Blast
        </h1>
        <p className="text-muted-foreground">Upload your video and orchestrate its distribution.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Video Upload Area */}
        <Card className="bg-card border-border/50 border-2 overflow-hidden shadow-lg">
          <div 
            className={`p-10 border-2 border-dashed rounded-xl m-4 transition-all duration-200 flex flex-col items-center justify-center min-h-[300px] text-center cursor-pointer ${
              file ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept="video/*" 
              className="hidden" 
            />
            
            {file ? (
              <div className="space-y-4 w-full max-w-md">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary mx-auto shadow-[0_0_20px_rgba(124,58,237,0.3)]">
                  <Video size={40} />
                </div>
                <div>
                  <p className="text-white font-bold text-lg truncate">{file.name}</p>
                  <p className="text-muted-foreground text-sm">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                
                {isUploading && (
                  <div className="space-y-2 mt-6">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-primary">Uploading...</span>
                      <span className="text-white">{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2 bg-muted/50 [&>div]:bg-primary" />
                  </div>
                )}
                
                {!isUploading && !objectPath && (
                  <Button type="button" variant="outline" size="sm" className="mt-4 border-border hover:bg-muted" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                    Remove
                  </Button>
                )}
                {objectPath && !isUploading && (
                  <div className="inline-flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-1 rounded-full text-sm font-medium mt-4 border border-green-400/20">
                    <Sparkles size={14} /> Upload Complete
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground mx-auto">
                  <UploadCloud size={40} />
                </div>
                <div>
                  <p className="text-white font-bold text-xl mb-2">Drag & Drop your video</p>
                  <p className="text-muted-foreground">or click to browse from your computer</p>
                </div>
                <p className="text-xs text-muted-foreground max-w-[250px] mx-auto mt-4">
                  Supports MP4, MOV. Max size 2GB. Vertical format (9:16) recommended for Shorts/Reels/TikTok.
                </p>
              </div>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card className="bg-card border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="text-white">Content Details</CardTitle>
                <CardDescription>This will be used across all platforms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-white">Title</Label>
                  <Input 
                    id="title" 
                    placeholder="E.g., My Awesome Video" 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    disabled={isUploading}
                    className="bg-input border-border focus:border-primary text-white text-lg h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="caption" className="text-white">Caption & Tags</Label>
                  <Textarea 
                    id="caption" 
                    placeholder="Write a compelling caption and add #hashtags..." 
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    disabled={isUploading}
                    className="bg-input border-border focus:border-primary text-white min-h-[150px] resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-card border-border/50 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {connectedPlatforms.length === 0 ? (
                  <Alert className="bg-destructive/10 border-destructive/20 text-destructive mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No platforms</AlertTitle>
                    <AlertDescription className="text-xs mt-1">
                      Connect platforms in settings first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {connectedPlatforms.map(p => (
                      <div key={p.id} className={`flex items-center space-x-3 p-3 rounded-lg border ${selectedPlatforms.includes(p.platform) ? 'border-primary bg-primary/5' : 'border-border/50 bg-muted/20'} transition-colors`}>
                        <Checkbox 
                          id={`platform-${p.id}`} 
                          checked={selectedPlatforms.includes(p.platform)}
                          onCheckedChange={() => togglePlatform(p.platform)}
                          disabled={isUploading}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={`platform-${p.id}`}
                            className="text-sm font-medium leading-none text-white capitalize cursor-pointer"
                          >
                            {p.platform}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {p.accountName || 'Connected account'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">Timing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox 
                    id="schedule" 
                    checked={isScheduled}
                    onCheckedChange={(checked) => setIsScheduled(!!checked)}
                    disabled={isUploading}
                  />
                  <label htmlFor="schedule" className="text-sm font-medium text-white cursor-pointer">
                    Schedule for later
                  </label>
                </div>
                
                {isScheduled && (
                  <div className="space-y-2 animate-in slide-in-from-top-2">
                    <Input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      disabled={isUploading}
                      min={new Date().toISOString().slice(0, 16)}
                      className="bg-input border-border focus:border-primary text-white"
                    />
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-2 pb-6 px-6">
                <Button 
                  type="submit" 
                  disabled={!isFormValid || isUploading || connectedPlatforms.length === 0} 
                  className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] disabled:shadow-none"
                >
                  {isUploading ? (
                    <><RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                  ) : isScheduled ? (
                    <><CalendarIcon className="mr-2 h-5 w-5" /> Schedule Blast</>
                  ) : (
                    <><Send className="mr-2 h-5 w-5" /> Publish Now</>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}