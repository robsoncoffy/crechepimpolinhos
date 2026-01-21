import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Baby, Milk, Apple, ShieldAlert, Bell } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

interface ChildWithAllergy {
  id: string;
  full_name: string;
  allergies: string | null;
  dietary_restrictions: string | null;
  special_milk: string | null;
  class_type: string;
  created_at: string;
  isNew?: boolean;
}

const classLabels: Record<string, string> = {
  bercario: "Berçário",
  maternal: "Maternal",
  jardim: "Jardim",
};

export function AllergyAlertsWidget() {
  const [children, setChildren] = useState<ChildWithAllergy[]>([]);
  const [newAlerts, setNewAlerts] = useState<ChildWithAllergy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllergies() {
      try {
        const { data } = await supabase
          .from("children")
          .select("id, full_name, allergies, dietary_restrictions, special_milk, class_type, created_at")
          .or("allergies.not.is.null,dietary_restrictions.not.is.null,special_milk.not.is.null")
          .order("created_at", { ascending: false });

        if (data) {
          // Mark children added in the last 7 days as "new"
          const enrichedData = data.map((child) => ({
            ...child,
            isNew: differenceInDays(new Date(), parseISO(child.created_at)) <= 7,
          }));

          setChildren(enrichedData);
          setNewAlerts(enrichedData.filter((c) => c.isNew));
        }
      } catch (error) {
        console.error("Error fetching allergies:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAllergies();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("allergy-alerts-widget")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "children" },
        () => fetchAllergies()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getCategoryIcon = (child: ChildWithAllergy) => {
    if (child.allergies) return AlertTriangle;
    if (child.special_milk) return Milk;
    return Apple;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            Alertas de Alergias
          </div>
          <Badge variant="destructive">{children.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-muted-foreground text-center py-4">Carregando...</div>
        ) : (
          <>
            {/* New Alerts Banner */}
            {newAlerts.length > 0 && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <Bell className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>{newAlerts.length} nova(s) criança(s)</strong> com restrições cadastradas esta semana
                </AlertDescription>
              </Alert>
            )}

            {/* Allergy List */}
            {children.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <ShieldAlert className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma criança com restrições</p>
              </div>
            ) : (
              <ScrollArea className="h-[250px]">
                <div className="space-y-2">
                  {children.map((child) => {
                    const CategoryIcon = getCategoryIcon(child);

                    return (
                      <div
                        key={child.id}
                        className={`p-3 rounded-lg border ${
                          child.isNew ? "bg-yellow-50 border-yellow-200" : "bg-muted/30"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Baby className="w-4 h-4 text-primary" />
                            <span className="font-medium text-sm">{child.full_name}</span>
                            {child.isNew && (
                              <Badge className="bg-yellow-100 text-yellow-700 text-[10px] h-4">
                                NOVO
                              </Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {classLabels[child.class_type] || child.class_type}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-xs">
                          {child.allergies && (
                            <div className="flex items-center gap-1.5 text-red-600">
                              <AlertTriangle className="w-3 h-3" />
                              <span><strong>Alergias:</strong> {child.allergies}</span>
                            </div>
                          )}
                          {child.dietary_restrictions && (
                            <div className="flex items-center gap-1.5 text-yellow-600">
                              <Apple className="w-3 h-3" />
                              <span><strong>Restrições:</strong> {child.dietary_restrictions}</span>
                            </div>
                          )}
                          {child.special_milk && (
                            <div className="flex items-center gap-1.5 text-blue-600">
                              <Milk className="w-3 h-3" />
                              <span><strong>Leite Especial:</strong> {child.special_milk}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
