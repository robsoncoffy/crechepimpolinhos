import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Check,
  ChefHat,
  Shield,
  Package
} from "lucide-react";
import { useShoppingList, unitOptions } from "@/hooks/useShoppingList";

const roleLabels: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  admin: { label: "Admin", icon: Shield, color: "bg-primary/10 text-primary" },
  cook: { label: "Cozinha", icon: ChefHat, color: "bg-orange-100 text-orange-700" },
  nutritionist: { label: "Nutrição", icon: Package, color: "bg-green-100 text-green-700" },
};

export default function AdminShoppingList() {
  const { items, loading, addItem, toggleItem, removeItem, clearChecked, pendingCount, completedCount } = useShoppingList();
  const [newItem, setNewItem] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  const [newUnit, setNewUnit] = useState("un");

  const handleAddItem = async () => {
    const success = await addItem(newItem, newQuantity, newUnit);
    if (success) {
      setNewItem("");
      setNewQuantity("1");
      setNewUnit("un");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-fredoka font-bold flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-primary" />
              Lista de Compras
            </h1>
            <p className="text-muted-foreground">
              Lista sincronizada com a cozinha em tempo real
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="py-1.5 px-3">
              <Package className="w-3.5 h-3.5 mr-1.5" />
              {pendingCount} pendentes
            </Badge>
            <Badge variant="outline" className="py-1.5 px-3 text-green-600 border-green-300">
              <Check className="w-3.5 h-3.5 mr-1.5" />
              {completedCount} comprados
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Adicionar Item</CardTitle>
            <CardDescription>
              Adicione itens que serão visíveis para a equipe da cozinha
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Input
                placeholder="Nome do item (ex: Arroz integral)"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                className="flex-1 min-w-[200px]"
              />
              <Input
                placeholder="Qtd"
                type="number"
                min="1"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                className="w-20"
              />
              <Select value={newUnit} onValueChange={setNewUnit}>
                <SelectTrigger className="w-24">
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
              <Button onClick={handleAddItem} disabled={!newItem.trim()}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Itens da Lista</CardTitle>
              <CardDescription>
                Marque os itens conforme forem comprados
              </CardDescription>
            </div>
            {completedCount > 0 && (
              <Button variant="outline" size="sm" onClick={clearChecked}>
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar comprados
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum item na lista</p>
                <p className="text-sm">Adicione itens usando o formulário acima</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {items.map((item) => {
                    const roleInfo = roleLabels[item.added_by_role] || roleLabels.admin;
                    const RoleIcon = roleInfo.icon;
                    
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                          item.checked 
                            ? "bg-muted/50 opacity-60" 
                            : "bg-card hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={item.checked}
                            onCheckedChange={() => toggleItem(item.id, item.checked)}
                            className="h-5 w-5"
                          />
                          <div>
                            <p className={`font-medium ${item.checked ? "line-through text-muted-foreground" : ""}`}>
                              {item.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-muted-foreground">
                                {item.quantity} {item.unit}
                              </span>
                              <Badge variant="outline" className={`text-xs ${roleInfo.color}`}>
                                <RoleIcon className="w-3 h-3 mr-1" />
                                {roleInfo.label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
      </div>
    </AdminLayout>
  );
}
