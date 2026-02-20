import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Settings, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Loader2,
  AlertTriangle,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimeClockConfig {
  id: string;
  device_ip: string | null;
  device_login: string | null;
  device_password: string | null;
  device_name: string | null;
  last_sync_at: string | null;
  sync_interval_minutes: number | null;
  webhook_secret: string | null;
  is_active: boolean;
}

interface UserMapping {
  id: string;
  employee_id: string;
  controlid_user_id: number;
  cpf: string;
  device_id: string | null;
  synced_at: string | null;
  employee_profiles: {
    full_name: string;
  } | null;
}

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  records_synced: number;
  records_failed: number;
  error_message: string | null;
  device_id: string | null;
  started_at: string;
  completed_at: string | null;
}

export default function AdminTimeClockConfig() {
  const queryClient = useQueryClient();
  const [deviceIp, setDeviceIp] = useState("");
  const [deviceLogin, setDeviceLogin] = useState("admin");
  const [devicePassword, setDevicePassword] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [deviceInfo, setDeviceInfo] = useState<{ name?: string; serial?: string; firmware?: string } | null>(null);

  // Fetch config
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["time-clock-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_clock_config")
        .select("*")
        .eq("is_active", true)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data as TimeClockConfig | null;
    },
  });

  // Fetch user mappings
  const { data: mappings, isLoading: mappingsLoading } = useQuery({
    queryKey: ["controlid-mappings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("controlid_user_mappings")
        .select("*, employee_profiles(full_name)")
        .order("synced_at", { ascending: false });
      
      if (error) throw error;
      return data as UserMapping[];
    },
  });

  // Fetch sync logs
  const { data: syncLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["controlid-sync-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("controlid_sync_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as SyncLog[];
    },
  });

  // Initialize form with config data
  useEffect(() => {
    if (config) {
      setDeviceIp(config.device_ip || "");
      setDeviceLogin(config.device_login || "admin");
      setDevicePassword(config.device_password || "");
      setDeviceName(config.device_name || "");
    }
  }, [config]);

  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      const configData = {
        device_ip: deviceIp || null,
        device_login: deviceLogin || "admin",
        device_password: devicePassword || null,
        device_name: deviceName || null,
        is_active: true,
      };

      if (config?.id) {
        const { error } = await supabase
          .from("time_clock_config")
          .update(configData)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("time_clock_config")
          .insert(configData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-clock-config"] });
      toast.success("Configuração salva com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar configuração: " + error.message);
    },
  });

  // Test connection
  const testConnection = async () => {
    if (!deviceIp) {
      toast.error("Digite o IP do dispositivo");
      return;
    }

    setTestingConnection(true);
    setConnectionStatus("idle");
    setDeviceInfo(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("controlid-test-connection", {
        body: {
          device_ip: deviceIp,
          device_login: deviceLogin,
          device_password: devicePassword,
        },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (response.error) throw response.error;

      if (response.data.success) {
        setConnectionStatus("success");
        setDeviceInfo(response.data.device_info);
        toast.success(`Conectado! ${response.data.user_count} usuários no dispositivo`);
      } else {
        setConnectionStatus("error");
        toast.error(response.data.error || "Falha na conexão");
      }
    } catch (error) {
      setConnectionStatus("error");
      toast.error("Erro ao testar conexão: " + (error as Error).message);
    } finally {
      setTestingConnection(false);
    }
  };

  // Sync employees mutation
  const syncEmployeesMutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("controlid-sync-employees", {
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["controlid-mappings"] });
      toast.success(`Sincronização concluída! ${data.synced} funcionários sincronizados`);
    },
    onError: (error) => {
      toast.error("Erro na sincronização: " + error.message);
    },
  });

  // Manual sync mutation
  const manualSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke("controlid-sync");
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["controlid-sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["time-clock-config"] });
      toast.success(`Sincronização concluída! ${data.records_synced} registros importados`);
    },
    onError: (error) => {
      toast.error("Erro na sincronização: " + error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500">Sucesso</Badge>;
      case "error":
        return <Badge variant="destructive">Erro</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500">Parcial</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSyncTypeBadge = (type: string) => {
    switch (type) {
      case "push":
        return <Badge variant="outline">Push</Badge>;
      case "polling":
        return <Badge variant="outline">Polling</Badge>;
      case "manual":
        return <Badge variant="outline">Manual</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (configLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Configuração Control iD</h1>
            <p className="text-muted-foreground">
              Configure a integração com o relógio de ponto Control iD iDClass Bio
            </p>
          </div>
          {config?.last_sync_at && (
            <div className="text-sm text-muted-foreground">
              Última sincronização: {format(new Date(config.last_sync_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </div>
          )}
        </div>

        <Tabs defaultValue="connection">
          <TabsList>
            <TabsTrigger value="connection" className="gap-2">
              <Settings className="h-4 w-4" />
              Conexão
            </TabsTrigger>
            <TabsTrigger value="employees" className="gap-2">
              <Users className="h-4 w-4" />
              Funcionários
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <Clock className="h-4 w-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  Configuração do Dispositivo
                </CardTitle>
                <CardDescription>
                  Configure o IP e credenciais do relógio de ponto Control iD
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deviceName">Nome do Dispositivo</Label>
                    <Input
                      id="deviceName"
                      placeholder="Ex: Relógio Entrada Principal"
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deviceIp">Endereço IP</Label>
                    <Input
                      id="deviceIp"
                      placeholder="Ex: 192.168.1.100"
                      value={deviceIp}
                      onChange={(e) => setDeviceIp(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deviceLogin">Usuário</Label>
                    <Input
                      id="deviceLogin"
                      placeholder="admin"
                      value={deviceLogin}
                      onChange={(e) => setDeviceLogin(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="devicePassword">Senha</Label>
                    <Input
                      id="devicePassword"
                      type="password"
                      placeholder="Senha do dispositivo"
                      value={devicePassword}
                      onChange={(e) => setDevicePassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <Button
                    variant="outline"
                    onClick={testConnection}
                    disabled={testingConnection || !deviceIp}
                  >
                    {testingConnection ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : connectionStatus === "success" ? (
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    ) : connectionStatus === "error" ? (
                      <XCircle className="h-4 w-4 mr-2 text-red-500" />
                    ) : (
                      <Wifi className="h-4 w-4 mr-2" />
                    )}
                    Testar Conexão
                  </Button>
                  <Button
                    onClick={() => saveConfigMutation.mutate()}
                    disabled={saveConfigMutation.isPending}
                  >
                    {saveConfigMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Salvar Configuração
                  </Button>
                </div>

                {deviceInfo && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Informações do Dispositivo</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Nome:</span>{" "}
                        {deviceInfo.name}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Serial:</span>{" "}
                        {deviceInfo.serial}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Firmware:</span>{" "}
                        {deviceInfo.firmware}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Sincronização Manual
                </CardTitle>
                <CardDescription>
                  Buscar registros de ponto do dispositivo manualmente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => manualSyncMutation.mutate()}
                    disabled={manualSyncMutation.isPending || !config?.device_ip}
                  >
                    {manualSyncMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Buscar Registros Agora
                  </Button>
                  {!config?.device_ip && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Configure o IP do dispositivo primeiro
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Funcionários Sincronizados
                    </CardTitle>
                    <CardDescription>
                      Funcionários vinculados ao relógio de ponto
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => syncEmployeesMutation.mutate()}
                    disabled={syncEmployeesMutation.isPending || !config?.device_ip}
                  >
                    {syncEmployeesMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Sincronizar Funcionários
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {mappingsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : mappings && mappings.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Funcionário</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>ID no Relógio</TableHead>
                        <TableHead>Sincronizado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappings.map((mapping) => (
                        <TableRow key={mapping.id}>
                          <TableCell className="font-medium">
                            {mapping.employee_profiles?.full_name || "—"}
                          </TableCell>
                          <TableCell>{mapping.cpf}</TableCell>
                          <TableCell>{mapping.controlid_user_id}</TableCell>
                          <TableCell>
                            {mapping.synced_at
                              ? format(new Date(mapping.synced_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <WifiOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum funcionário sincronizado ainda.</p>
                    <p className="text-sm">Clique em "Sincronizar Funcionários" para enviar os funcionários ao relógio.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Histórico de Sincronização
                </CardTitle>
                <CardDescription>
                  Últimas sincronizações realizadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : syncLogs && syncLogs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Registros</TableHead>
                        <TableHead>Erros</TableHead>
                        <TableHead>Mensagem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {format(new Date(log.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>{getSyncTypeBadge(log.sync_type)}</TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell>{log.records_synced}</TableCell>
                          <TableCell>{log.records_failed}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {log.error_message || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum log de sincronização ainda.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
