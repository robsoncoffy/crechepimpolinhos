import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GraduationCap,
  Brain,
  Heart,
  MessageCircle,
  Palette,
  Target,
  ArrowRight,
  Star,
  User,
  Calendar,
} from "lucide-react";

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

interface EvaluationDetailDialogProps {
  evaluation: QuarterlyEvaluation | null;
  childName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const quarterLabels: Record<number, string> = {
  1: "1º Trimestre",
  2: "2º Trimestre",
  3: "3º Trimestre",
  4: "4º Trimestre",
};

export function EvaluationDetailDialog({
  evaluation,
  childName,
  open,
  onOpenChange,
}: EvaluationDetailDialogProps) {
  if (!evaluation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl">
                    Avaliação Trimestral
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {quarterLabels[evaluation.quarter]} de {evaluation.year} - {childName}
                  </DialogDescription>
                </div>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                Plus+
              </Badge>
            </div>
          </DialogHeader>

          {/* Meta info */}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <span>{evaluation.pedagogue_name || "Pedagoga"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(evaluation.created_at).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-6">
            {/* Development Areas */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-lg">
                <Target className="w-5 h-5 text-primary" />
                Áreas de Desenvolvimento
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {evaluation.cognitive_development && (
                  <DevelopmentCard
                    icon={<Brain className="w-5 h-5 text-blue-600" />}
                    title="Desenvolvimento Cognitivo"
                    content={evaluation.cognitive_development}
                    bgColor="bg-blue-50"
                    borderColor="border-blue-200"
                  />
                )}

                {evaluation.motor_development && (
                  <DevelopmentCard
                    icon={<Target className="w-5 h-5 text-green-600" />}
                    title="Desenvolvimento Motor"
                    content={evaluation.motor_development}
                    bgColor="bg-green-50"
                    borderColor="border-green-200"
                  />
                )}

                {evaluation.social_emotional && (
                  <DevelopmentCard
                    icon={<Heart className="w-5 h-5 text-red-500" />}
                    title="Socioemocional"
                    content={evaluation.social_emotional}
                    bgColor="bg-red-50"
                    borderColor="border-red-200"
                  />
                )}

                {evaluation.language_development && (
                  <DevelopmentCard
                    icon={<MessageCircle className="w-5 h-5 text-yellow-600" />}
                    title="Linguagem e Comunicação"
                    content={evaluation.language_development}
                    bgColor="bg-yellow-50"
                    borderColor="border-yellow-200"
                  />
                )}

                {evaluation.creativity_arts && (
                  <div className="sm:col-span-2">
                    <DevelopmentCard
                      icon={<Palette className="w-5 h-5 text-purple-600" />}
                      title="Criatividade e Artes"
                      content={evaluation.creativity_arts}
                      bgColor="bg-purple-50"
                      borderColor="border-purple-200"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Summary and Recommendations */}
            {(evaluation.overall_summary || evaluation.recommendations || evaluation.next_steps) && (
              <>
                <Separator />

                <div className="space-y-5">
                  {evaluation.overall_summary && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Star className="w-4 h-4 text-primary" />
                        Resumo Geral
                      </h4>
                      <div className="p-4 bg-muted/50 rounded-lg border">
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {evaluation.overall_summary}
                        </p>
                      </div>
                    </div>
                  )}

                  {evaluation.recommendations && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary" />
                        Recomendações para Casa
                      </h4>
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {evaluation.recommendations}
                        </p>
                      </div>
                    </div>
                  )}

                  {evaluation.next_steps && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-primary" />
                        Próximos Passos
                      </h4>
                      <div className="p-4 bg-muted/50 rounded-lg border">
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {evaluation.next_steps}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for development cards
function DevelopmentCard({
  icon,
  title,
  content,
  bgColor,
  borderColor,
}: {
  icon: React.ReactNode;
  title: string;
  content: string;
  bgColor: string;
  borderColor: string;
}) {
  return (
    <div className={`p-4 rounded-lg ${bgColor} border ${borderColor}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="font-medium text-sm">{title}</span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
    </div>
  );
}
