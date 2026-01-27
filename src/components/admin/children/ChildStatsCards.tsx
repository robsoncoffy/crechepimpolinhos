import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Baby } from "lucide-react";
import { Database, Constants } from "@/integrations/supabase/types";
import { classTypeLabels } from "@/lib/constants";

type Child = Database["public"]["Tables"]["children"]["Row"];

interface ChildStatsCardsProps {
  children: Child[];
}

export const ChildStatsCards = memo(function ChildStatsCards({ children }: ChildStatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="p-3 rounded-full bg-primary/10">
            <Baby className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-fredoka font-bold">{children.length}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
        </CardContent>
      </Card>
      {Constants.public.Enums.class_type.map((type) => (
        <Card key={type}>
          <CardContent className="flex items-center gap-4 pt-6">
            <div
              className={`p-3 rounded-full ${
                type === "bercario"
                  ? "bg-pimpo-yellow/10"
                  : type === "maternal"
                  ? "bg-pimpo-green/10"
                  : "bg-pimpo-red/10"
              }`}
            >
              <Baby
                className={`w-6 h-6 ${
                  type === "bercario"
                    ? "text-pimpo-yellow"
                    : type === "maternal"
                    ? "text-pimpo-green"
                    : "text-pimpo-red"
                }`}
              />
            </div>
            <div>
              <p className="text-2xl font-fredoka font-bold">
                {children.filter((c) => c.class_type === type).length}
              </p>
              <p className="text-sm text-muted-foreground">{classTypeLabels[type]}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});
