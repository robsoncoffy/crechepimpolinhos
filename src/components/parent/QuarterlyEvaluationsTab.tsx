import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2, GraduationCap, Brain, Heart, MessageCircle, Palette, Target, ArrowRight, Star } from "lucide-react";
import { EvaluationDetailDialog } from "./EvaluationDetailDialog";

interface QuarterlyEvaluation {
  id: string;
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
  pedagogue_name?: string;
}

interface QuarterlyEvaluationsTabProps {
  childId: string;
  childName: string;
}

const quarterLabels: Record<number, string> = {
  1: "1º Trimestre",
  2: "2º Trimestre",
  3: "3º Trimestre",
  4: "4º Trimestre",
};

export function QuarterlyEvaluationsTab({ childId, childName }: QuarterlyEvaluationsTabProps) {
  const [evaluations, setEvaluations] = useState<QuarterlyEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvaluation, setSelectedEvaluation] = useState<QuarterlyEvaluation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchEvaluations = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("quarterly_evaluations")
        .select("*")
        .eq("child_id", childId)
        .order("year", { ascending: false })
        .order("quarter", { ascending: false });

      if (error) {
        console.error("Error fetching evaluations:", error);
      } else if (data) {
        // Fetch pedagogue names
        const pedagogueIds = [...new Set(data.map((e) => e.pedagogue_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", pedagogueIds);

        const nameMap: Record<string, string> = {};
        profiles?.forEach((p) => {
          nameMap[p.user_id] = p.full_name;
        });

        const enriched = data.map((e) => ({
          ...e,
          pedagogue_name: nameMap[e.pedagogue_id] || "Pedagoga",
        }));

        setEvaluations(enriched);
      }

      setLoading(false);
    };

    fetchEvaluations();
  }, [childId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (evaluations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <GraduationCap className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Nenhuma avaliação disponível</h3>
        <p className="text-muted-foreground max-w-sm mx-auto">
          As avaliações trimestrais de {childName.split(" ")[0]} aparecerão aqui assim que forem realizadas pela pedagoga.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <GraduationCap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Avaliações Trimestrais</h3>
          <p className="text-sm text-muted-foreground">
            Acompanhamento pedagógico exclusivo do Plano Plus+
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto">
          <Star className="w-3 h-3 mr-1" />
          Plus+
        </Badge>
      </div>

      {evaluations.map((evaluation) => (
        <Card key={evaluation.id} className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-medium">
                  {quarterLabels[evaluation.quarter]} de {evaluation.year}
                </p>
                <p className="text-xs text-muted-foreground">
                  Pedagoga {evaluation.pedagogue_name}
                </p>
              </div>
              <Badge className="bg-green-500 hover:bg-green-600">Disponível</Badge>
            </div>
            
            <div className="space-y-2 text-sm">
              {evaluation.motor_development && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    Desenvolvimento Motor
                  </span>
                  <Badge variant="outline" className="text-xs">Avaliado</Badge>
                </div>
              )}
              {evaluation.social_emotional && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5" />
                    Socioemocional
                  </span>
                  <Badge variant="outline" className="text-xs">Avaliado</Badge>
                </div>
              )}
              {evaluation.language_development && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5" />
                    Linguagem
                  </span>
                  <Badge variant="outline" className="text-xs">Avaliado</Badge>
                </div>
              )}
              {evaluation.cognitive_development && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5" />
                    Cognitivo
                  </span>
                  <Badge variant="outline" className="text-xs">Avaliado</Badge>
                </div>
              )}
              {evaluation.creativity_arts && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" />
                    Criatividade
                  </span>
                  <Badge variant="outline" className="text-xs">Avaliado</Badge>
                </div>
              )}
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-4 border-primary/50 text-primary hover:bg-primary/5"
              onClick={() => {
                setSelectedEvaluation(evaluation);
                setDialogOpen(true);
              }}
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Ver Avaliação Completa
            </Button>
          </CardContent>
        </Card>
      ))}

      {/* Evaluation Detail Dialog */}
      <EvaluationDetailDialog
        evaluation={selectedEvaluation}
        childName={childName}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
