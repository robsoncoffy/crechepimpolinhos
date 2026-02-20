import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  User,
  Phone,
  DollarSign,
  Kanban,
  Plus,
  CheckCircle2,
  XCircle,
  MessageSquare,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OpportunityDetailsDrawer,
  CreateOpportunityDialog,
  PipelineFilters,
} from "./pipeline";

interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
}

interface PipelineStage {
  id: string;
  name: string;
  position: number;
}

interface Opportunity {
  id: string;
  name: string;
  status: string;
  monetaryValue: number;
  pipelineStageId: string;
  assignedTo?: string;
  contact?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export function GhlPipelineTab() {
  const { toast } = useToast();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Details drawer state
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchPipelines = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("ghl-conversations", {
        body: { action: "pipelines" },
      });

      if (error) throw error;

      const pipelinesList = data?.pipelines || [];
      setPipelines(pipelinesList);

      // Select first pipeline by default
      if (pipelinesList.length > 0 && !selectedPipeline) {
        setSelectedPipeline(pipelinesList[0]);
      }
    } catch (error) {
      console.error("Error fetching pipelines:", error);
      toast({
        title: "Erro ao carregar pipelines",
        description: "Não foi possível carregar os pipelines.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchOpportunities = async (pipelineId: string) => {
    setLoadingOpportunities(true);
    try {
      const { data, error } = await supabase.functions.invoke("ghl-conversations", {
        body: { action: "opportunities", pipelineId },
      });

      if (error) throw error;
      setOpportunities(data?.opportunities || []);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
    } finally {
      setLoadingOpportunities(false);
    }
  };

  useEffect(() => {
    fetchPipelines();
  }, []);

  useEffect(() => {
    if (selectedPipeline) {
      fetchOpportunities(selectedPipeline.id);
    }
  }, [selectedPipeline]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPipelines();
    if (selectedPipeline) {
      fetchOpportunities(selectedPipeline.id);
    }
  };

  const handleOpportunityClick = (opp: Opportunity) => {
    setSelectedOpportunity(opp);
    setDetailsOpen(true);
  };

  const handleQuickWhatsApp = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${formattedPhone}`, "_blank");
  };

  // Filter opportunities
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      // Status filter
      if (statusFilter !== "all" && opp.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = opp.name?.toLowerCase().includes(query);
        const matchesContact = opp.contact?.name?.toLowerCase().includes(query);
        const matchesEmail = opp.contact?.email?.toLowerCase().includes(query);
        const matchesPhone = opp.contact?.phone?.includes(query);

        if (!matchesName && !matchesContact && !matchesEmail && !matchesPhone) {
          return false;
        }
      }

      return true;
    });
  }, [opportunities, searchQuery, statusFilter]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch {
      return "";
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStageOpportunities = (stageId: string) => {
    return filteredOpportunities.filter((opp) => opp.pipelineStageId === stageId);
  };

  const getStageColor = (index: number) => {
    const colors = [
      "bg-blue-500/20 border-blue-500/30",
      "bg-yellow-500/20 border-yellow-500/30",
      "bg-orange-500/20 border-orange-500/30",
      "bg-purple-500/20 border-purple-500/30",
      "bg-green-500/20 border-green-500/30",
    ];
    return colors[index % colors.length];
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      won: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      abandoned: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    };

    const labels: Record<string, string> = {
      open: "Aberto",
      won: "Ganho",
      lost: "Perdido",
      abandoned: "Abandonado",
    };

    if (status === "open") return null; // Don't show badge for open

    return (
      <Badge className={cn("text-[10px] px-1.5 py-0", styles[status] || styles.open)}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-72 shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (pipelines.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Kanban className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
        <p className="font-medium">Nenhum pipeline encontrado</p>
        <p className="text-sm text-muted-foreground mt-1">
          Configure seus pipelines para gerenciar oportunidades
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col gap-4">
        {/* Pipeline Selector Row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Kanban className="h-5 w-5 text-primary" />
            <Select
              value={selectedPipeline?.id || ""}
              onValueChange={(value) => {
                const pipeline = pipelines.find((p) => p.id === value);
                setSelectedPipeline(pipeline || null);
              }}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecione um pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
              disabled={!selectedPipeline}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Oportunidade
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Filters Row */}
        {selectedPipeline && (
          <PipelineFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            totalOpportunities={opportunities.length}
            filteredCount={filteredOpportunities.length}
          />
        )}
      </div>

      {/* Kanban Board */}
      {selectedPipeline && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {selectedPipeline.stages
              .sort((a, b) => a.position - b.position)
              .map((stage, index) => {
                const stageOpps = getStageOpportunities(stage.id);

                return (
                  <Card
                    key={stage.id}
                    className={cn(
                      "w-72 shrink-0 flex flex-col border-t-4",
                      getStageColor(index)
                    )}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          {stage.name}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {stageOpps.length}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 p-2">
                      <ScrollArea className="h-[calc(100vh-26rem)]">
                        <div className="space-y-2 pr-2">
                          {loadingOpportunities ? (
                            Array.from({ length: 3 }).map((_, i) => (
                              <Skeleton key={i} className="h-24 w-full" />
                            ))
                          ) : stageOpps.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">
                              Nenhuma oportunidade
                            </p>
                          ) : (
                            stageOpps.map((opp) => (
                              <Card
                                key={opp.id}
                                className="p-3 cursor-pointer hover:shadow-md transition-shadow group"
                                onClick={() => handleOpportunityClick(opp)}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="font-medium text-sm line-clamp-2">
                                      {opp.name}
                                    </span>
                                    {getStatusBadge(opp.status)}
                                  </div>

                                  {opp.contact && (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <User className="h-3 w-3" />
                                        <span className="truncate">{opp.contact.name}</span>
                                      </div>
                                      {opp.contact.phone && (
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Phone className="h-3 w-3" />
                                            <span>{opp.contact.phone}</span>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => handleQuickWhatsApp(e, opp.contact!.phone!)}
                                          >
                                            <MessageSquare className="h-3.5 w-3.5 text-green-600" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between text-xs">
                                    {opp.monetaryValue > 0 && (
                                      <span className="font-medium text-primary flex items-center gap-1">
                                        <DollarSign className="h-3 w-3" />
                                        {formatCurrency(opp.monetaryValue)}
                                      </span>
                                    )}
                                    <span className="text-muted-foreground ml-auto">
                                      {formatDate(opp.updatedAt)}
                                    </span>
                                  </div>
                                </div>
                              </Card>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* Details Drawer */}
      <OpportunityDetailsDrawer
        opportunity={selectedOpportunity}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        stages={selectedPipeline?.stages || []}
        pipelineId={selectedPipeline?.id || ""}
        onUpdated={() => {
          if (selectedPipeline) {
            fetchOpportunities(selectedPipeline.id);
          }
        }}
      />

      {/* Create Dialog */}
      <CreateOpportunityDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        pipelineId={selectedPipeline?.id || ""}
        stages={selectedPipeline?.stages || []}
        onCreated={() => {
          if (selectedPipeline) {
            fetchOpportunities(selectedPipeline.id);
          }
        }}
      />
    </div>
  );
}
