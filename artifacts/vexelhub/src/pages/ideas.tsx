import { useState } from "react";
import { useListIdeas, useCreateIdea, useDeleteIdea } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Lightbulb, Plus, Trash2, Tag as TagIcon, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Ideas() {
  const { data: ideas = [], isLoading, refetch } = useListIdeas();
  const createIdea = useCreateIdea();
  const deleteIdea = useDeleteIdea();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput.split(",").map(t => t.trim()).filter(t => t.length > 0);

    try {
      await createIdea.mutateAsync({
        data: { title, description, tags }
      });
      toast({ title: "Ideia salva!" });
      setOpen(false);
      setTitle("");
      setDescription("");
      setTagsInput("");
      refetch();
    } catch (e) {
      toast({ title: "Falha ao salvar ideia", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteIdea.mutateAsync({ id });
      toast({ title: "Ideia excluída" });
      refetch();
    } catch (e) {
      toast({ title: "Falha ao excluir", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1 flex items-center gap-3">
            <Lightbulb className="text-yellow-400" /> Banco de Ideias
          </h1>
          <p className="text-muted-foreground">Capture insights antes que desapareçam.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold shadow-[0_0_15px_rgba(234,179,8,0.4)] gap-2 border-none">
              <Plus size={18} /> Nova Ideia
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl text-white flex items-center gap-2">
                <Sparkles size={20} className="text-yellow-400" /> Registrar Ideia
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <div className="space-y-2">
                <Input 
                  placeholder="Qual é o conceito?" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  autoFocus
                  className="bg-input border-border text-white text-lg h-12"
                />
              </div>
              <div className="space-y-2">
                <Textarea 
                  placeholder="Desenvolva os detalhes..." 
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                  className="bg-input border-border text-white min-h-[120px] resize-none"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TagIcon size={14} /> Tags (separadas por vírgula)
                </div>
                <Input 
                  placeholder="ex: vlog, tutorial, engraçado" 
                  value={tagsInput} 
                  onChange={e => setTagsInput(e.target.value)}
                  className="bg-input border-border text-white"
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-white">Cancelar</Button>
                <Button type="submit" disabled={!title.trim() || createIdea.isPending} className="bg-yellow-500 text-black hover:bg-yellow-600 font-bold">
                  Salvar no Banco
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="bg-card/50 border-border/50">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 bg-border/50" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full bg-border/50" />
              </CardContent>
            </Card>
          ))
        ) : ideas.length === 0 ? (
          <div className="col-span-full text-center py-20 border border-border/50 border-dashed rounded-xl bg-card/30">
            <Lightbulb size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Nenhuma ideia ainda</h3>
            <p className="text-muted-foreground">Seus conceitos brilhantes pertencem aqui.</p>
          </div>
        ) : (
          ideas.map(idea => (
            <Card key={idea.id} className="bg-card border-border/50 hover:border-yellow-500/30 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white font-bold leading-tight">{idea.title}</CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                  {idea.description || "Nenhum detalhe fornecido."}
                </p>
                {idea.tags && idea.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {idea.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="bg-muted text-xs font-medium text-muted-foreground hover:bg-muted/80">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end pt-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(idea.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
