import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useShoppingList, unitOptions } from "@/hooks/useShoppingList";
import { UtensilsCrossed, ChevronRight, AlertTriangle, Baby, Clock, ShoppingCart, Plus, Trash2, Check, ChefHat, Shield, Package } from "lucide-react";
import { MiniCalendar } from "@/components/calendar/MiniCalendar";

interface ChildWithAllergy {
  id: string;
  full_name: string;
  allergies: string | null;
  dietary_restrictions: string | null;
  special_milk: string | null;
  class_type: string;
}

const roleLabels: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  admin: { label: "Admin", icon: Shield, color: "bg-primary/10 text-primary" },
  cook: { label: "Cozinha", icon: ChefHat, color: "bg-orange-100 text-orange-700" },
  nutritionist: { label: "Nutrição", icon: Package, color: "bg-green-100 text-green-700" },
};

export default function CookDashboard() {
  const { profile } = useAuth();
  const { items: shoppingList, addItem, toggleItem, removeItem, pendingCount, completedCount, loading: shoppingLoading } = useShoppingList();
  const [childrenWithAllergies, setChildrenWithAllergies] = useState<ChildWithAllergy[]>([]);
  const [todayMenu, setTodayMenu] = useState<{ breakfast?: string; lunch?: string; snack?: string; dinner?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  const [newUnit, setNewUnit] = useState("un");

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch children with allergies or special dietary needs
        const { data: children } = await supabase
          .from("children")
          .select("id, full_name, allergies, dietary_restrictions, special_milk, class_type")
          .or("allergies.not.is.null,dietary_restrictions.not.is.null,special_milk.not.is.null");

        if (children) {
          setChildrenWithAllergies(children);
        }

        // Fetch today's menu
        const today = new Date();
        const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // Monday = 1, Sunday = 7
        
        // Get the start of the current week (Monday)
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
        const weekStart = startOfWeek.toISOString().split("T")[0];

        const { data: menu } = await supabase
          .from("weekly_menus")
          .select("*")
          .eq("week_start", weekStart)
          .eq("day_of_week", dayOfWeek)
          .single();

        if (menu) {
          setTodayMenu(menu);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const getClassLabel = (classType: string) => {
    switch (classType) {
      case "bercario": return "Berçário";
      case "maternal": return "Maternal";
      case "jardim": return "Jardim";
      default: return classType;
    }
  };

  const handleAddItem = async () => {
    const success = await addItem(newItem, newQuantity, newUnit);
    if (success) {
      setNewItem("");
      setNewQuantity("1");
      setNewUnit("un");
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground">
          Olá, {profile?.full_name?.split(" ")[0]}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Painel da Cozinha
        </p>
      </div>

      {/* Today's Menu */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
            Cardápio de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : todayMenu ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {todayMenu.breakfast && (
                <div className="p-3 bg-pimpo-yellow/10 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium text-pimpo-yellow mb-1">
                    <Clock className="w-4 h-4" />
                    Café da Manhã
                  </div>
                  <p className="text-sm">{todayMenu.breakfast}</p>
                </div>
              )}
              {todayMenu.lunch && (
                <div className="p-3 bg-pimpo-green/10 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium text-pimpo-green mb-1">
                    <Clock className="w-4 h-4" />
                    Almoço
                  </div>
                  <p className="text-sm">{todayMenu.lunch}</p>
                </div>
              )}
              {todayMenu.snack && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary mb-1">
                    <Clock className="w-4 h-4" />
                    Lanche
                  </div>
                  <p className="text-sm">{todayMenu.snack}</p>
                </div>
              )}
              {todayMenu.dinner && (
                <div className="p-3 bg-pimpo-red/10 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium text-pimpo-red mb-1">
                    <Clock className="w-4 h-4" />
                    Jantar
                  </div>
                  <p className="text-sm">{todayMenu.dinner}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <UtensilsCrossed className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Cardápio de hoje não configurado</p>
              <Link to="/painel/cardapio">
                <Button variant="link">Configurar cardápio</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Children with Allergies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-pimpo-red" />
            Crianças com Restrições Alimentares
            <Badge variant="destructive">{childrenWithAllergies.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : childrenWithAllergies.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {childrenWithAllergies.map((child) => (
                  <div key={child.id} className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Baby className="w-4 h-4 text-primary" />
                        <span className="font-semibold">{child.full_name}</span>
                      </div>
                      <Badge variant="outline">{getClassLabel(child.class_type)}</Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      {child.allergies && (
                        <p className="text-pimpo-red">
                          <strong>Alergias:</strong> {child.allergies}
                        </p>
                      )}
                      {child.dietary_restrictions && (
                        <p className="text-pimpo-yellow">
                          <strong>Restrições:</strong> {child.dietary_restrictions}
                        </p>
                      )}
                      {child.special_milk && (
                        <p className="text-primary">
                          <strong>Leite Especial:</strong> {child.special_milk}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma criança com restrições alimentares cadastradas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shopping List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Lista de Compras
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">{pendingCount} pendentes</Badge>
              <Badge variant="outline" className="text-green-600 border-green-300">
                <Check className="w-3 h-3 mr-1" />
                {completedCount} comprados
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new item */}
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Nome do item"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
              className="flex-1 min-w-[150px]"
            />
            <Input
              placeholder="Qtd"
              type="number"
              min="1"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              className="w-16"
            />
            <Select value={newUnit} onValueChange={setNewUnit}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {unitOptions.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddItem} disabled={!newItem.trim()} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Shopping List Items */}
          {shoppingLoading ? (
            <p className="text-muted-foreground text-center py-4">Carregando...</p>
          ) : shoppingList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum item na lista</p>
            </div>
          ) : (
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {shoppingList.map((item) => {
                  const roleInfo = roleLabels[item.added_by_role] || roleLabels.cook;
                  const RoleIcon = roleInfo.icon;
                  
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        item.checked ? "bg-muted/50 opacity-60" : "bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={() => toggleItem(item.id, item.checked)}
                        />
                        <div>
                          <p className={`font-medium text-sm ${item.checked ? "line-through" : ""}`}>
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {item.quantity} {item.unit}
                            </span>
                            <Badge variant="outline" className={`text-[10px] h-4 px-1 ${roleInfo.color}`}>
                              <RoleIcon className="w-2.5 h-2.5 mr-0.5" />
                              {roleInfo.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link to="/painel/cardapio">
            <Button className="w-full justify-between">
              <span className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4" />
                Ver Cardápio Semanal
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/painel/lista-compras">
            <Button variant="outline" className="w-full justify-start gap-2">
              <ShoppingCart className="w-4 h-4" />
              Lista de Compras Completa
            </Button>
          </Link>
          <Link to="/painel/chat-equipe">
            <Button variant="outline" className="w-full justify-start gap-2">
              Chat com a Equipe
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Mini Calendar */}
      <MiniCalendar />
    </div>
  );
}
