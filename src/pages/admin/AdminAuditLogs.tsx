import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Shield,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AuditLog {
  id: string;
  action_type: string;
  admin_id: string;
  admin_email: string | null;
  target_user_id: string | null;
  target_email: string | null;
  success: boolean;
  error_message: string | null;
  details: any;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  delete_user: { label: "Exclusão de Usuário", color: "destructive" },
  approve_user: { label: "Aprovação de Usuário", color: "default" },
  reject_user: { label: "Rejeição de Usuário", color: "secondary" },
  update_role: { label: "Alteração de Papel", color: "outline" },
  create_child: { label: "Cadastro de Criança", color: "default" },
  update_child: { label: "Atualização de Criança", color: "outline" },
  delete_child: { label: "Exclusão de Criança", color: "destructive" },
  send_contract: { label: "Envio de Contrato", color: "default" },
  login: { label: "Login", color: "outline" },
  logout: { label: "Logout", color: "outline" },
};

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    try {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast.error("Erro ao carregar logs de auditoria");
    } finally {
      setLoading(false);
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getActionLabel = (actionType: string) => {
    return ACTION_LABELS[actionType] || { label: actionType, color: "outline" };
  };

  const actionTypes = [...new Set(logs.map(l => l.action_type))];

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.admin_email?.toLowerCase().includes(search.toLowerCase()) || false) ||
      (log.target_email?.toLowerCase().includes(search.toLowerCase()) || false) ||
      log.action_type.toLowerCase().includes(search.toLowerCase());
    
    const matchesAction = actionFilter === "all" || log.action_type === actionFilter;
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "success" && log.success) ||
      (statusFilter === "error" && !log.success);
    
    return matchesSearch && matchesAction && matchesStatus;
  });

  const successCount = logs.filter(l => l.success).length;
  const errorCount = logs.filter(l => !l.success).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-fredoka text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-7 h-7 text-primary" />
          Logs de Auditoria
        </h1>
        <p className="text-muted-foreground">
          Histórico de ações administrativas no sistema
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{logs.length}</p>
                <p className="text-sm text-muted-foreground">Total de registros</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{successCount}</p>
                <p className="text-sm text-muted-foreground">Sucesso</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{errorCount}</p>
                <p className="text-sm text-muted-foreground">Erros</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email ou ação..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Tipo de ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {actionTypes.map(action => (
                  <SelectItem key={action} value={action}>
                    {getActionLabel(action).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Registros ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum registro encontrado.
            </p>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {filteredLogs.map((log) => {
                  const actionInfo = getActionLabel(log.action_type);
                  const isExpanded = expandedLogs.has(log.id);
                  
                  return (
                    <Collapsible key={log.id} open={isExpanded} onOpenChange={() => toggleExpand(log.id)}>
                      <div className={`p-4 rounded-lg border ${!log.success ? "border-destructive/30 bg-destructive/5" : ""}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              {log.success ? (
                                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-destructive shrink-0" />
                              )}
                              <Badge variant={actionInfo.color as any}>
                                {actionInfo.label}
                              </Badge>
                            </div>
                            
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="w-3 h-3" />
                                <span>Admin: {log.admin_email || "Desconhecido"}</span>
                              </div>
                              {log.target_email && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <User className="w-3 h-3" />
                                  <span>Alvo: {log.target_email}</span>
                                </div>
                              )}
                              {log.error_message && (
                                <p className="text-destructive text-xs mt-1">
                                  Erro: {log.error_message}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                              </div>
                            </div>
                            {log.details && Object.keys(log.details).length > 0 && (
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            )}
                          </div>
                        </div>
                        
                        <CollapsibleContent>
                          {log.details && (
                            <div className="mt-3 pt-3 border-t">
                              <h4 className="text-xs font-medium mb-2">Detalhes:</h4>
                              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
