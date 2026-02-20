import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, GraduationCap, Plus, Star, Search, Brain, Heart, MessageCircle, Palette, Target, Save, Pencil } from "lucide-react";

interface Child {
  id: string;
  full_name: string;
  class_type: string;
  photo_url: string | null;
  plan_type: string | null;
}

interface Evaluation {
  id: string;
  child_id: string;
  quarter: number;
  year: number;
  cognitive_development: string | null;
  motor_development: string | null;
  social_emotional: string | null;
  language_development: string | null;
  creativity_arts: string | null;
  overall_summary: string | null;
  recommendations: string | null;
  next_steps: string | null;
  created_at: string;
}

const classTypeLabels: Record<string, string> = {
  bercario: "Berçário",
  maternal: "Maternal",
  jardim: "Jardim",
};

const quarterLabels: Record<number, string> = {
  1: "1º Trimestre",
  2: "2º Trimestre",
  3: "3º Trimestre",
  4: "4º Trimestre",
};

export default function AdminQuarterlyEvaluations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [children, setChildren] = useState<Child[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState<Evaluation | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    quarter: "",
    year: new Date().getFullYear().toString(),
    cognitive_development: "",
    motor_development: "",
    social_emotional: "",
    language_development: "",
    creativity_arts: "",
    overall_summary: "",
    recommendations: "",
    next_steps: "",
  });

  // Fetch Plus+ children
  useEffect(() => {
    const fetchChildren = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("children")
        .select("id, full_name, class_type, photo_url, plan_type")
        .eq("plan_type", "plus")
        .order("full_name");

      if (error) {
        console.error("Error fetching children:", error);
      } else {
        setChildren(data || []);
      }
      setLoading(false);
    };

    fetchChildren();
  }, []);

  // Fetch evaluations for selected child
  useEffect(() => {
    if (!selectedChild) {
      setEvaluations([]);
      return;
    }

    const fetchEvaluations = async () => {
      const { data, error } = await supabase
        .from("quarterly_evaluations")
        .select("*")
        .eq("child_id", selectedChild.id)
        .order("year", { ascending: false })
        .order("quarter", { ascending: false });

      if (error) {
        console.error("Error fetching evaluations:", error);
      } else {
        setEvaluations(data || []);
      }
    };

    fetchEvaluations();
  }, [selectedChild]);

  const resetForm = () => {
    setFormData({
      quarter: "",
      year: new Date().getFullYear().toString(),
      cognitive_development: "",
      motor_development: "",
      social_emotional: "",
      language_development: "",
      creativity_arts: "",
      overall_summary: "",
      recommendations: "",
      next_steps: "",
    });
    setEditingEvaluation(null);
  };

  const handleEdit = (evaluation: Evaluation) => {
    setEditingEvaluation(evaluation);
    setFormData({
      quarter: evaluation.quarter.toString(),
      year: evaluation.year.toString(),
      cognitive_development: evaluation.cognitive_development || "",
      motor_development: evaluation.motor_development || "",
      social_emotional: evaluation.social_emotional || "",
      language_development: evaluation.language_development || "",
      creativity_arts: evaluation.creativity_arts || "",
      overall_summary: evaluation.overall_summary || "",
      recommendations: evaluation.recommendations || "",
      next_steps: evaluation.next_steps || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedChild || !user || !formData.quarter || !formData.year) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione o trimestre e o ano.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const evaluationData = {
      child_id: selectedChild.id,
      pedagogue_id: user.id,
      quarter: parseInt(formData.quarter),
      year: parseInt(formData.year),
      cognitive_development: formData.cognitive_development || null,
      motor_development: formData.motor_development || null,
      social_emotional: formData.social_emotional || null,
      language_development: formData.language_development || null,
      creativity_arts: formData.creativity_arts || null,
      overall_summary: formData.overall_summary || null,
      recommendations: formData.recommendations || null,
      next_steps: formData.next_steps || null,
    };

    let error;

    if (editingEvaluation) {
      const result = await supabase
        .from("quarterly_evaluations")
        .update(evaluationData)
        .eq("id", editingEvaluation.id);
      error = result.error;
    } else {
      const result = await supabase
        .from("quarterly_evaluations")
        .insert(evaluationData);
      error = result.error;
    }

    if (error) {
      console.error("Error saving evaluation:", error);
      toast({
        title: "Erro ao salvar",
        description: error.code === "23505" 
          ? "Já existe uma avaliação para este trimestre/ano." 
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: editingEvaluation ? "Avaliação atualizada!" : "Avaliação salva!",
        description: `Avaliação de ${selectedChild.full_name} para o ${quarterLabels[parseInt(formData.quarter)]} de ${formData.year} foi salva.`,
      });
      setDialogOpen(false);
      resetForm();

      // Refresh evaluations
      const { data } = await supabase
        .from("quarterly_evaluations")
        .select("*")
        .eq("child_id", selectedChild.id)
        .order("year", { ascending: false })
        .order("quarter", { ascending: false });
      setEvaluations(data || []);
    }

    setSaving(false);
  };

  const filteredChildren = children.filter((child) =>
    child.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-fredoka text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-primary" />
            Avaliações Trimestrais
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhamento pedagógico exclusivo para alunos Plus+
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          <Star className="w-3 h-3 mr-1" />
          {children.length} alunos Plus+
        </Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Children List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Alunos Plus+</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar aluno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredChildren.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum aluno Plus+ encontrado
                  </p>
                ) : (
                  filteredChildren.map((child) => (
                    <div
                      key={child.id}
                      onClick={() => setSelectedChild(child)}
                      className={`p-3 rounded-lg cursor-pointer transition-all flex items-center gap-3 ${
                        selectedChild?.id === child.id
                          ? "bg-primary/10 ring-1 ring-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={child.photo_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-fredoka">
                          {child.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{child.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {classTypeLabels[child.class_type]}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        <Star className="w-3 h-3 mr-1" />
                        Plus+
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Evaluations */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedChild
                    ? `Avaliações de ${selectedChild.full_name}`
                    : "Selecione um aluno"}
                </CardTitle>
                <CardDescription>
                  {selectedChild
                    ? `${classTypeLabels[selectedChild.class_type]} • Plano Plus+`
                    : "Escolha um aluno na lista para gerenciar as avaliações"}
                </CardDescription>
              </div>
              {selectedChild && (
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Nova Avaliação
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingEvaluation ? "Editar Avaliação" : "Nova Avaliação Trimestral"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      {/* Period Selection */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Trimestre *</Label>
                          <Select
                            value={formData.quarter}
                            onValueChange={(v) => setFormData({ ...formData, quarter: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1º Trimestre</SelectItem>
                              <SelectItem value="2">2º Trimestre</SelectItem>
                              <SelectItem value="3">3º Trimestre</SelectItem>
                              <SelectItem value="4">4º Trimestre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Ano *</Label>
                          <Select
                            value={formData.year}
                            onValueChange={(v) => setFormData({ ...formData, year: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2024">2024</SelectItem>
                              <SelectItem value="2025">2025</SelectItem>
                              <SelectItem value="2026">2026</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Tabs defaultValue="development" className="w-full">
                        <TabsList className="grid grid-cols-2 w-full">
                          <TabsTrigger value="development">Desenvolvimento</TabsTrigger>
                          <TabsTrigger value="summary">Resumo</TabsTrigger>
                        </TabsList>

                        <TabsContent value="development" className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <Brain className="w-4 h-4 text-pimpo-blue" />
                              Desenvolvimento Cognitivo
                            </Label>
                            <Textarea
                              placeholder="Observações sobre raciocínio, memória, atenção, resolução de problemas..."
                              value={formData.cognitive_development}
                              onChange={(e) => setFormData({ ...formData, cognitive_development: e.target.value })}
                              rows={3}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-pimpo-green" />
                              Desenvolvimento Motor
                            </Label>
                            <Textarea
                              placeholder="Observações sobre coordenação, equilíbrio, motricidade fina e grossa..."
                              value={formData.motor_development}
                              onChange={(e) => setFormData({ ...formData, motor_development: e.target.value })}
                              rows={3}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <Heart className="w-4 h-4 text-pimpo-red" />
                              Socioemocional
                            </Label>
                            <Textarea
                              placeholder="Observações sobre interação social, gestão de emoções, empatia..."
                              value={formData.social_emotional}
                              onChange={(e) => setFormData({ ...formData, social_emotional: e.target.value })}
                              rows={3}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <MessageCircle className="w-4 h-4 text-pimpo-yellow" />
                              Linguagem
                            </Label>
                            <Textarea
                              placeholder="Observações sobre comunicação verbal, vocabulário, expressão..."
                              value={formData.language_development}
                              onChange={(e) => setFormData({ ...formData, language_development: e.target.value })}
                              rows={3}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <Palette className="w-4 h-4 text-purple-600" />
                              Criatividade e Artes
                            </Label>
                            <Textarea
                              placeholder="Observações sobre expressão artística, imaginação, atividades criativas..."
                              value={formData.creativity_arts}
                              onChange={(e) => setFormData({ ...formData, creativity_arts: e.target.value })}
                              rows={3}
                            />
                          </div>
                        </TabsContent>

                        <TabsContent value="summary" className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label>Resumo Geral</Label>
                            <Textarea
                              placeholder="Visão geral do desenvolvimento da criança neste trimestre..."
                              value={formData.overall_summary}
                              onChange={(e) => setFormData({ ...formData, overall_summary: e.target.value })}
                              rows={4}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Recomendações</Label>
                            <Textarea
                              placeholder="Sugestões de atividades para a família fazer em casa..."
                              value={formData.recommendations}
                              onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                              rows={4}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Próximos Passos</Label>
                            <Textarea
                              placeholder="Objetivos e focos para o próximo trimestre..."
                              value={formData.next_steps}
                              onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
                              rows={4}
                            />
                          </div>
                        </TabsContent>
                      </Tabs>

                      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {editingEvaluation ? "Atualizar Avaliação" : "Salvar Avaliação"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedChild ? (
              <div className="text-center py-12 text-muted-foreground">
                <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Selecione um aluno para ver e criar avaliações</p>
              </div>
            ) : evaluations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma avaliação registrada</p>
                <p className="text-sm mt-1">Clique em "Nova Avaliação" para começar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {evaluations.map((evaluation) => (
                  <Card key={evaluation.id} className="overflow-hidden">
                    <CardHeader className="py-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">
                            {quarterLabels[evaluation.quarter]} de {evaluation.year}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Criado em {new Date(evaluation.created_at).toLocaleDateString("pt-BR")}
                          </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(evaluation)}>
                          <Pencil className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="grid gap-2 text-sm">
                        {evaluation.cognitive_development && (
                          <div className="flex gap-2">
                            <Brain className="w-4 h-4 text-pimpo-blue shrink-0 mt-0.5" />
                            <p className="text-muted-foreground line-clamp-2">{evaluation.cognitive_development}</p>
                          </div>
                        )}
                        {evaluation.overall_summary && (
                          <div className="flex gap-2">
                            <Star className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-muted-foreground line-clamp-2">{evaluation.overall_summary}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
