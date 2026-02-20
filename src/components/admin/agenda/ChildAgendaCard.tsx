import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Baby, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { classTypeLabels } from "@/lib/constants";
import { ChildWithRecord } from "./types";
import { mealOptions } from "./constants";

export function ChildAgendaCard({
    child,
    onClick,
}: {
    child: ChildWithRecord;
    onClick: () => void;
}) {
    const record = child.daily_record;
    const hasRecord = !!record;
    const isComplete =
        hasRecord &&
        record.breakfast &&
        record.lunch &&
        (record.snack || record.dinner);

    const age = child.birth_date
        ? Math.floor(
            (new Date().getTime() - new Date(child.birth_date).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25)
        )
        : 0;

    return (
        <Card
            className={cn(
                "cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]",
                isComplete && "ring-2 ring-pimpo-green/50 bg-pimpo-green/5"
            )}
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {child.photo_url ? (
                            <img
                                src={child.photo_url}
                                alt={child.full_name}
                                className="w-full h-full rounded-full object-cover"
                            />
                        ) : (
                            <Baby className="w-6 h-6 text-primary" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="font-semibold truncate">{child.full_name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {classTypeLabels[child.class_type]} • {age}{" "}
                                    {age === 1 ? "ano" : "anos"}
                                </p>
                            </div>
                            {isComplete ? (
                                <Badge className="bg-pimpo-green text-white shrink-0">
                                    <Check className="w-3 h-3 mr-1" />
                                    Completo
                                </Badge>
                            ) : hasRecord ? (
                                <Badge variant="secondary" className="shrink-0">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Parcial
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="shrink-0">
                                    Pendente
                                </Badge>
                            )}
                        </div>

                        {hasRecord && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {record.breakfast && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                                        ☕ {mealOptions.find((m) => m.value === record.breakfast)?.label}
                                    </span>
                                )}
                                {record.lunch && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                                        🍽️ {mealOptions.find((m) => m.value === record.lunch)?.label}
                                    </span>
                                )}
                                {(record.slept_morning || record.slept_afternoon) && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                                        😴 Dormiu
                                    </span>
                                )}
                                {record.had_fever && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                                        🌡️ Febre
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
