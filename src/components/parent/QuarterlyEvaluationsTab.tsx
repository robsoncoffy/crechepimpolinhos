import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, GraduationCap, Brain, Heart, MessageCircle, Palette, Target, ArrowRight, Star } from "lucide-react";

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
        <Card key={evaluation.id} className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {quarterLabels[evaluation.quarter]} de {evaluation.year}
                </CardTitle>
                <CardDescription>
                  Avaliação realizada por {evaluation.pedagogue_name}
                </CardDescription>
              </div>
              <Badge>{quarterLabels[evaluation.quarter]}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Development Areas */}
            <div className="grid gap-4 sm:grid-cols-2">
              {evaluation.cognitive_development && (
                <div className="p-4 rounded-lg bg-pimpo-blue/5 border border-pimpo-blue/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-pimpo-blue" />
                    <span className="font-medium text-sm">Desenvolvimento Cognitivo</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{evaluation.cognitive_development}</p>
                </div>
              )}

              {evaluation.motor_development && (
                <div className="p-4 rounded-lg bg-pimpo-green/5 border border-pimpo-green/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-pimpo-green" />
                    <span className="font-medium text-sm">Desenvolvimento Motor</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{evaluation.motor_development}</p>
                </div>
              )}

              {evaluation.social_emotional && (
                <div className="p-4 rounded-lg bg-pimpo-red/5 border border-pimpo-red/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-pimpo-red" />
                    <span className="font-medium text-sm">Socioemocional</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{evaluation.social_emotional}</p>
                </div>
              )}

              {evaluation.language_development && (
                <div className="p-4 rounded-lg bg-pimpo-yellow/5 border border-pimpo-yellow/20">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-4 h-4 text-pimpo-yellow" />
                    <span className="font-medium text-sm">Linguagem</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{evaluation.language_development}</p>
                </div>
              )}

              {evaluation.creativity_arts && (
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-200 sm:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Palette className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-sm">Criatividade e Artes</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{evaluation.creativity_arts}</p>
                </div>
              )}
            </div>

            {/* Summary and Recommendations */}
            {(evaluation.overall_summary || evaluation.recommendations || evaluation.next_steps) && (
              <>
                <Separator />
                <div className="space-y-4">
                  {evaluation.overall_summary && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Star className="w-4 h-4 text-primary" />
                        Resumo Geral
                      </h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {evaluation.overall_summary}
                      </p>
                    </div>
                  )}

                  {evaluation.recommendations && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary" />
                        Recomendações
                      </h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {evaluation.recommendations}
                      </p>
                    </div>
                  )}

                  {evaluation.next_steps && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-primary" />
                        Próximos Passos
                      </h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {evaluation.next_steps}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
