import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Baby, Bell, Car, Clock, UserCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { classTypeLabels } from "@/lib/constants";
import type { Database } from "@/integrations/supabase/types";

type Child = Database["public"]["Tables"]["children"]["Row"];
type DailyRecord = Database["public"]["Tables"]["daily_records"]["Row"];

export interface PickupNotification {
    id: string;
    notification_type: "on_way" | "delay" | "other_person";
    delay_minutes: number | null;
    message: string | null;
    created_at: string;
}

export interface ChildWithRecord extends Child {
    daily_record?: DailyRecord | null;
    pickup_notification?: PickupNotification | null;
}

interface TeacherAgendaTabProps {
    children: ChildWithRecord[];
    completedCount: number;
}

export const getPickupBadgeInfo = (notification: PickupNotification | null | undefined) => {
    if (!notification) return null;
    switch (notification.notification_type) {
        case "on_way":
            return { icon: Car, label: "A caminho", color: "bg-blue-100 text-blue-700 border-blue-300" };
        case "delay":
            return { icon: Clock, label: `Atraso ${notification.delay_minutes}min`, color: "bg-amber-100 text-amber-700 border-amber-300" };
        case "other_person":
            return { icon: UserCheck, label: "Outra pessoa", color: "bg-purple-100 text-purple-700 border-purple-300" };
        default:
            return null;
    }
};

export function TeacherAgendaTab({ children, completedCount }: TeacherAgendaTabProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">Agenda Digital</h3>
                    <p className="text-sm text-muted-foreground">Clique em uma criança para abrir a agenda completa</p>
                </div>
                <Badge variant="outline">{completedCount}/{children.length} preenchidas</Badge>
            </div>

            <ScrollArea className="h-[50vh] max-h-[500px] min-h-[300px]">
                <div className="space-y-2 pr-4">
                    {children.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Baby className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Nenhuma criança encontrada na sua turma</p>
                        </div>
                    ) : (
                        children.map((child) => {
                            const pickupBadge = getPickupBadgeInfo(child.pickup_notification);

                            return (
                                <Link key={child.id} to={`/painel/agenda?child=${child.id}`} className="block">
                                    <div className={`p-3 rounded-lg border transition-colors cursor-pointer ${child.pickup_notification
                                            ? "bg-gradient-to-r from-background to-blue-50/50 border-blue-200 hover:border-blue-300"
                                            : "hover:bg-muted/50"
                                        }`}>
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="relative">
                                                    <Avatar className="h-10 w-10">
                                                        {child.photo_url && <AvatarImage src={child.photo_url} alt={child.full_name} />}
                                                        <AvatarFallback className="bg-primary/10 text-primary">
                                                            {child.full_name.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    {child.pickup_notification && (
                                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                                                            <Bell className="w-2.5 h-2.5 text-white" />
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate">{child.full_name}</p>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-xs text-muted-foreground">
                                                            {classTypeLabels[child.class_type]}
                                                        </p>
                                                        {pickupBadge && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${pickupBadge.color}`}>
                                                                        <pickupBadge.icon className="w-3 h-3 mr-1" />
                                                                        {pickupBadge.label}
                                                                    </Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    {child.pickup_notification?.message || "Notificação de busca"}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {(child.allergies || child.dietary_restrictions) && (
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            {child.allergies || child.dietary_restrictions}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                                {child.daily_record ? (
                                                    <Badge className="bg-pimpo-green text-white">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                                        Pronta
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-muted-foreground">
                                                        <Clock className="w-3 h-3 mr-1" />
                                                        Pendente
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
