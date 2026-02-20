import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Child = Database["public"]["Tables"]["children"]["Row"];

interface TeacherAllergiesTabProps {
    childrenWithAllergies: Child[];
}

export function TeacherAllergiesTab({ childrenWithAllergies }: TeacherAllergiesTabProps) {
    if (childrenWithAllergies.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50 text-pimpo-green" />
                <p>Nenhuma criança com alergias ou restrições</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {childrenWithAllergies.map((child) => (
                <Card key={child.id} className="border-amber-200 bg-amber-50/50">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                                {child.photo_url && <AvatarImage src={child.photo_url} />}
                                <AvatarFallback className="bg-amber-100 text-amber-700">
                                    {child.full_name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold">{child.full_name}</p>
                                {child.allergies && (
                                    <div className="mt-1">
                                        <Badge variant="destructive" className="text-xs">Alergias</Badge>
                                        <p className="text-sm mt-1">{child.allergies}</p>
                                    </div>
                                )}
                                {child.dietary_restrictions && (
                                    <div className="mt-2">
                                        <Badge variant="secondary" className="text-xs">Restrições</Badge>
                                        <p className="text-sm mt-1">{child.dietary_restrictions}</p>
                                    </div>
                                )}
                                {child.special_milk && (
                                    <div className="mt-2">
                                        <Badge className="text-xs bg-blue-100 text-blue-700">Leite Especial</Badge>
                                        <p className="text-sm mt-1">{child.special_milk}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
