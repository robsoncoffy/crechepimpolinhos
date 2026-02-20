import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Brain, Heart, Loader2, Target, Sparkles, MessageSquare, Palette, ArrowRight, Star, FileText, GraduationCap, ChevronLeft, ChevronRight } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Child = Database["public"]["Tables"]["children"]["Row"];

interface Evaluation {
    cognitive: string;
    motor: string;
    socialEmotional: string;
    language: string;
    creativity: string;
    summary: string;
    recommendations: string;
    nextSteps: string;
}

const emptyEvaluation: Evaluation = {
    cognitive: "",
    motor: "",
    socialEmotional: "",
    language: "",
    creativity: "",
    summary: "",
    recommendations: "",
    nextSteps: "",
};

interface EvaluationsTabProps {
    plusChildren: Child[];
}

export function EvaluationsTab({ plusChildren }: EvaluationsTabProps) {
    const { user } = useAuth();
    const [selectedEvalChild, setSelectedEvalChild] = useState<string | null>(null);
    const [selectedQuarter, setSelectedQuarter] = useState(() => Math.ceil((new Date().getMonth() + 1) / 3));
    const [evaluation, setEvaluation] = useState<Evaluation>(emptyEvaluation);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [savingEval, setSavingEval] = useState(false);

    // Pagination for children list
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const totalPages = Math.ceil(plusChildren.length / ITEMS_PER_PAGE);
    const paginatedChildren = useMemo(() =>
        plusChildren.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
        [plusChildren, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [plusChildren]);

    // Fetch evaluation when child/quarter changes
    useEffect(() => {
        if (!selectedEvalChild) {
            setEvaluation(emptyEvaluation);
            return;
        }

        async function fetchEvaluation() {
            const year = new Date().getFullYear();

            const { data, error } = await supabase
                .from("quarterly_evaluations")
                .select("*")
                .eq("child_id", selectedEvalChild)
                .eq("quarter", selectedQuarter)
                .eq("year", year)
                .maybeSingle();

            if (error) {
                console.error("Error fetching evaluation:", error);
                return;
            }

            if (data) {
                setEvaluation({
                    cognitive: data.cognitive_development || "",
                    motor: data.motor_development || "",
                    socialEmotional: data.social_emotional || "",
                    language: data.language_development || "",
                    creativity: data.creativity_arts || "",
                    summary: data.overall_summary || "",
                    recommendations: data.recommendations || "",
                    nextSteps: data.next_steps || "",
                });
            } else {
                setEvaluation(emptyEvaluation);
            }
        }

        fetchEvaluation();
    }, [selectedEvalChild, selectedQuarter]);

    // AI Generation for evaluation
    const generateWithAI = async (field: keyof Evaluation | "all") => {
        if (!selectedEvalChild) return;

        const child = plusChildren.find((c) => c.id === selectedEvalChild);
        if (!child) return;

        setIsGeneratingAI(true);

        try {
            const { data, error } = await supabase.functions.invoke("evaluation-ai-suggestions", {
                body: {
                    childName: child.full_name,
                    childClass: child.class_type,
                    quarter: selectedQuarter,
                    field,
                    existingData: evaluation,
                },
            });

            if (error) throw error;

            if (data?.error) {
                toast.error(data.error);
                return;
            }

            if (field === "all" && data?.evaluation) {
                setEvaluation(data.evaluation);
                toast.success("Avaliação gerada com sucesso pela IA");
            } else if (data?.text) {
                setEvaluation((prev) => ({ ...prev, [field]: data.text }));
                toast.success("Campo gerado com sucesso pela IA");
            }
        } catch (error: any) {
            console.error("Error generating AI evaluation:", error);
            toast.error(error.message || "Erro ao gerar avaliação com IA. Verifique as configurações.");
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleSaveEvaluation = async () => {
        if (!selectedEvalChild || !user) return;

        setSavingEval(true);
        const year = new Date().getFullYear();

        try {
            const existingQuery = supabase
                .from("quarterly_evaluations")
                .select("id")
                .eq("child_id", selectedEvalChild)
                .eq("quarter", selectedQuarter)
                .eq("year", year)
                .maybeSingle();

            const { data: existing, error: existingError } = await existingQuery;

            if (existingError && existingError.code !== 'PGRST116') {
                throw existingError;
            }

            const evalData = {
                cognitive_development: evaluation.cognitive,
                motor_development: evaluation.motor,
                social_emotional: evaluation.socialEmotional,
                language_development: evaluation.language,
                creativity_arts: evaluation.creativity,
                overall_summary: evaluation.summary,
                recommendations: evaluation.recommendations,
                next_steps: evaluation.nextSteps,
            };

            if (existing) {
                const { error } = await supabase
                    .from("quarterly_evaluations")
                    .update(evalData)
                    .eq("id", existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("quarterly_evaluations").insert({
                    child_id: selectedEvalChild,
                    quarter: selectedQuarter,
                    year,
                    created_by: user.id,
                    ...evalData,
                });
                if (error) throw error;
            }

            toast.success("Avaliação salva com sucesso!");
        } catch (error) {
            console.error("Error saving evaluation:", error);
            toast.error("Erro ao salvar avaliação");
        } finally {
            setSavingEval(false);
        }
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-purple-100">
                    <GraduationCap className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                    <h3 className="font-semibold">Avaliações Trimestrais - Plano Plus+</h3>
                    <p className="text-sm text-muted-foreground">Crie avaliações detalhadas para os alunos Plus+</p>
                </div>
                <Badge variant="secondary" className="ml-auto flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Plus+
                </Badge>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                {/* Child List */}
                <div className="space-y-2">
                    <Label>Selecione o aluno:</Label>

                    <div className="flex items-center justify-between text-sm py-1">
                        <span className="text-muted-foreground ml-1">
                            Página {currentPage} de {Math.max(1, totalPages)}
                        </span>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="w-4 h-4 rounded" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                            >
                                <ChevronRight className="w-4 h-4 rounded" />
                            </Button>
                        </div>
                    </div>

                    {plusChildren.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border rounded-lg">
                            <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Nenhum aluno Plus+ cadastrado</p>
                        </div>
                    ) : (
                        paginatedChildren.map((child) => (
                            <div
                                key={child.id}
                                onClick={() => setSelectedEvalChild(child.id)}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedEvalChild === child.id ? "bg-purple-50 border-purple-300" : "hover:bg-muted/50"
                                    }`}
                            >
                                <Avatar className="h-10 w-10">
                                    {child.photo_url && <AvatarImage src={child.photo_url} alt={child.full_name} />}
                                    <AvatarFallback className="bg-purple-100 text-purple-600">
                                        {child.full_name.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{child.full_name}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{child.class_type}</p>
                                </div>
                                <Badge variant="outline" className="ml-auto text-xs shrink-0">
                                    Plus+
                                </Badge>
                            </div>
                        ))
                    )}
                </div>

                {/* Evaluation Form */}
                <div className="lg:col-span-2">
                    {selectedEvalChild ? (
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            {plusChildren.find((c) => c.id === selectedEvalChild)?.photo_url && (
                                                <AvatarImage src={plusChildren.find((c) => c.id === selectedEvalChild)?.photo_url || undefined} />
                                            )}
                                            <AvatarFallback className="bg-purple-100 text-purple-600">
                                                {plusChildren.find((c) => c.id === selectedEvalChild)?.full_name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-lg">
                                                {plusChildren.find((c) => c.id === selectedEvalChild)?.full_name}
                                            </CardTitle>
                                            <CardDescription>Avaliação Trimestral</CardDescription>
                                        </div>
                                    </div>
                                    <Select value={String(selectedQuarter)} onValueChange={(v) => setSelectedQuarter(Number(v))}>
                                        <SelectTrigger className="w-[150px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1º Trimestre</SelectItem>
                                            <SelectItem value="2">2º Trimestre</SelectItem>
                                            <SelectItem value="3">3º Trimestre</SelectItem>
                                            <SelectItem value="4">4º Trimestre</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    onClick={() => generateWithAI("all")}
                                    disabled={isGeneratingAI}
                                    className="mt-3 w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                >
                                    {isGeneratingAI ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Gerando com IA...
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="w-4 h-4 mr-2" />
                                            Preencher Tudo com IA
                                        </>
                                    )}
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[50vh] max-h-[500px] min-h-[300px] pr-4">
                                    <div className="space-y-4">
                                        {/* Cognitive */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="flex items-center gap-2">
                                                    <Brain className="w-4 h-4 text-blue-500" />
                                                    Desenvolvimento Cognitivo
                                                </Label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => generateWithAI("cognitive")}
                                                    disabled={isGeneratingAI}
                                                >
                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                    IA
                                                </Button>
                                            </div>
                                            <Textarea
                                                value={evaluation.cognitive}
                                                onChange={(e) => setEvaluation((prev) => ({ ...prev, cognitive: e.target.value }))}
                                                rows={3}
                                                placeholder="Descreva o desenvolvimento cognitivo..."
                                            />
                                        </div>

                                        {/* Motor */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="flex items-center gap-2">
                                                    <Target className="w-4 h-4 text-green-500" />
                                                    Desenvolvimento Motor
                                                </Label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => generateWithAI("motor")}
                                                    disabled={isGeneratingAI}
                                                >
                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                    IA
                                                </Button>
                                            </div>
                                            <Textarea
                                                value={evaluation.motor}
                                                onChange={(e) => setEvaluation((prev) => ({ ...prev, motor: e.target.value }))}
                                                rows={3}
                                                placeholder="Descreva o desenvolvimento motor..."
                                            />
                                        </div>

                                        {/* Social-Emotional */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="flex items-center gap-2">
                                                    <Heart className="w-4 h-4 text-red-500" />
                                                    Socioemocional
                                                </Label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => generateWithAI("socialEmotional")}
                                                    disabled={isGeneratingAI}
                                                >
                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                    IA
                                                </Button>
                                            </div>
                                            <Textarea
                                                value={evaluation.socialEmotional}
                                                onChange={(e) => setEvaluation((prev) => ({ ...prev, socialEmotional: e.target.value }))}
                                                rows={3}
                                                placeholder="Descreva o desenvolvimento socioemocional..."
                                            />
                                        </div>

                                        {/* Language */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="flex items-center gap-2">
                                                    <MessageSquare className="w-4 h-4 text-yellow-500" />
                                                    Linguagem
                                                </Label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => generateWithAI("language")}
                                                    disabled={isGeneratingAI}
                                                >
                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                    IA
                                                </Button>
                                            </div>
                                            <Textarea
                                                value={evaluation.language}
                                                onChange={(e) => setEvaluation((prev) => ({ ...prev, language: e.target.value }))}
                                                rows={3}
                                                placeholder="Descreva o desenvolvimento da linguagem..."
                                            />
                                        </div>

                                        {/* Creativity */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="flex items-center gap-2">
                                                    <Palette className="w-4 h-4 text-purple-500" />
                                                    Criatividade e Artes
                                                </Label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => generateWithAI("creativity")}
                                                    disabled={isGeneratingAI}
                                                >
                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                    IA
                                                </Button>
                                            </div>
                                            <Textarea
                                                value={evaluation.creativity}
                                                onChange={(e) => setEvaluation((prev) => ({ ...prev, creativity: e.target.value }))}
                                                rows={3}
                                                placeholder="Descreva a criatividade e artes..."
                                            />
                                        </div>

                                        {/* Summary */}
                                        <div className="space-y-2 pt-4 border-t">
                                            <div className="flex items-center justify-between">
                                                <Label className="flex items-center gap-2">
                                                    <Star className="w-4 h-4 text-amber-500" />
                                                    Resumo Geral
                                                </Label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => generateWithAI("summary")}
                                                    disabled={isGeneratingAI}
                                                >
                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                    IA
                                                </Button>
                                            </div>
                                            <Textarea
                                                value={evaluation.summary}
                                                onChange={(e) => setEvaluation((prev) => ({ ...prev, summary: e.target.value }))}
                                                rows={3}
                                                placeholder="Resumo geral do desenvolvimento..."
                                            />
                                        </div>

                                        {/* Recommendations */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-blue-500" />
                                                    Recomendações
                                                </Label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => generateWithAI("recommendations")}
                                                    disabled={isGeneratingAI}
                                                >
                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                    IA
                                                </Button>
                                            </div>
                                            <Textarea
                                                value={evaluation.recommendations}
                                                onChange={(e) => setEvaluation((prev) => ({ ...prev, recommendations: e.target.value }))}
                                                rows={3}
                                                placeholder="Recomendações para casa..."
                                            />
                                        </div>

                                        {/* Next Steps */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="flex items-center gap-2">
                                                    <ArrowRight className="w-4 h-4 text-green-500" />
                                                    Próximos Passos
                                                </Label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => generateWithAI("nextSteps")}
                                                    disabled={isGeneratingAI}
                                                >
                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                    IA
                                                </Button>
                                            </div>
                                            <Textarea
                                                value={evaluation.nextSteps}
                                                onChange={(e) => setEvaluation((prev) => ({ ...prev, nextSteps: e.target.value }))}
                                                rows={3}
                                                placeholder="Próximos passos para o trimestre..."
                                            />
                                        </div>

                                        <Button
                                            className="w-full bg-purple-600 hover:bg-purple-700"
                                            onClick={handleSaveEvaluation}
                                            disabled={savingEval}
                                        >
                                            {savingEval ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4 mr-2" />
                                            )}
                                            Salvar Avaliação
                                        </Button>
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="flex items-center justify-center h-[50vh] max-h-[500px] min-h-[300px] border rounded-lg bg-muted/30">
                            <div className="text-center">
                                <GraduationCap className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                                <h4 className="font-semibold mb-1">Selecione um aluno</h4>
                                <p className="text-sm text-muted-foreground">Escolha um aluno Plus+ para criar a avaliação</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
