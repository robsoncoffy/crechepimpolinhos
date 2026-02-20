import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { classTypeLabels } from "@/lib/constants";
import type { Database } from "@/integrations/supabase/types";

type Child = Database["public"]["Tables"]["children"]["Row"];

interface TeacherClassTabProps {
    children: Child[];
}

export function TeacherClassTab({ children }: TeacherClassTabProps) {
    return (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {children.map((child) => (
                <Card key={child.id} className="overflow-hidden">
                    <CardContent className="p-3 text-center">
                        <Avatar className="h-16 w-16 mx-auto mb-2">
                            {child.photo_url && <AvatarImage src={child.photo_url} />}
                            <AvatarFallback className="text-lg bg-primary/10 text-primary">
                                {child.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                        </Avatar>
                        <p className="font-medium text-sm truncate">{child.full_name}</p>
                        <p className="text-xs text-muted-foreground">{classTypeLabels[child.class_type]}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
