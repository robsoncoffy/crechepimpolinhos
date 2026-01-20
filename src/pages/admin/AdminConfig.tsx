import { useState, useEffect } from "react";
import { 
  Building2, 
  Link2, 
  DollarSign, 
  Bell, 
  Shield, 
  Mail, 
  FileSignature, 
  Clock,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Save,
  Loader2,
  Search
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useGmail } from "@/hooks/useGmail";
import { useCepLookup, formatCep } from "@/hooks/useCepLookup";
import { PLANS, CLASS_NAMES, PLAN_NAMES, ENROLLMENT_FEE } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";

const AdminConfig = () => {
  const { toast } = useToast();
  const { settings, isLoading, getSetting, getSettingWithDefault, updateMultipleSettings, isUpdating } = useSystemSettings();
  const { isAuthorized: gmailConfigured, accountEmail: gmailEmail, checkStatus } = useGmail();
  const { isLoading: isLoadingCep, fetchAddress } = useCepLookup();

  // Handle CEP lookup
  const handleCepBlur = async (cep: string) => {
    const address = await fetchAddress(cep);
    if (address) {
      setSchoolData(prev => ({
        ...prev,
        address: address.street,
        city: address.city,
        state: address.state,
      }));
    }
  };

  // School data state
  const [schoolData, setSchoolData] = useState({
    name: "",
    cnpj: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    instagram: "",
    email: "",
    hoursStart: "",
    hoursEnd: "",
  });

  // Pricing state
  const [pricing, setPricing] = useState({
    bercario_basico: "",
    bercario_intermediario: "",
    bercario_plus: "",
    maternal_basico: "",
    maternal_intermediario: "",
    maternal_plus: "",
    jardim_basico: "",
    jardim_intermediario: "",
    jardim_plus: "",
    enrollment_fee: "",
  });

  // Notifications state
  const [notifications, setNotifications] = useState({
    pushEnabled: true,
    emailAlerts: "",
    dailyReportEnabled: true,
    paymentReminders: true,
  });

  // Integration secrets status
  const [integrationStatus, setIntegrationStatus] = useState({
    zapsign: false,
    asaas: false,
    resend: false,
    controlid: false,
  });

  // Load settings into state
  useEffect(() => {
    if (settings) {
      setSchoolData({
        name: getSettingWithDefault("school_name", "ESCOLA DE ENSINO INFANTIL PIMPOLINHOS LTDA"),
        cnpj: getSettingWithDefault("school_cnpj", "55.025.335/0001-01"),
        address: getSettingWithDefault("school_address", "Rua Estefano Salino, 122"),
        city: getSettingWithDefault("school_city", "Poços de Caldas"),
        state: getSettingWithDefault("school_state", "MG"),
        zipCode: getSettingWithDefault("school_zip", "37701-378"),
        phone: getSettingWithDefault("school_phone", "(35) 3722-4599"),
        instagram: getSettingWithDefault("school_instagram", "@crechepimpolinhos"),
        email: getSettingWithDefault("school_email", "contato@crechepimpolinhos.com.br"),
        hoursStart: getSettingWithDefault("school_hours_start", "07:00"),
        hoursEnd: getSettingWithDefault("school_hours_end", "19:00"),
      });

      setPricing({
        bercario_basico: getSettingWithDefault("price_bercario_basico", "1450"),
        bercario_intermediario: getSettingWithDefault("price_bercario_intermediario", "1550"),
        bercario_plus: getSettingWithDefault("price_bercario_plus", "1650"),
        maternal_basico: getSettingWithDefault("price_maternal_basico", "1250"),
        maternal_intermediario: getSettingWithDefault("price_maternal_intermediario", "1350"),
        maternal_plus: getSettingWithDefault("price_maternal_plus", "1450"),
        jardim_basico: getSettingWithDefault("price_jardim_basico", "1150"),
        jardim_intermediario: getSettingWithDefault("price_jardim_intermediario", "1250"),
        jardim_plus: getSettingWithDefault("price_jardim_plus", "1350"),
        enrollment_fee: getSettingWithDefault("enrollment_fee", "500"),
      });

      setNotifications({
        pushEnabled: getSettingWithDefault("notifications_push_enabled", "true") === "true",
        emailAlerts: getSettingWithDefault("notifications_email", ""),
        dailyReportEnabled: getSettingWithDefault("notifications_daily_report", "true") === "true",
        paymentReminders: getSettingWithDefault("notifications_payment_reminders", "true") === "true",
      });
    }
  }, [settings]);

  // Check integration status
  useEffect(() => {
    checkGmail();
  }, []);

  const checkGmail = async () => {
    await checkStatus();
  };

  const handleSaveSchoolData = async () => {
    await updateMultipleSettings([
      { key: "school_name", value: schoolData.name },
      { key: "school_cnpj", value: schoolData.cnpj },
      { key: "school_address", value: schoolData.address },
      { key: "school_city", value: schoolData.city },
      { key: "school_state", value: schoolData.state },
      { key: "school_zip", value: schoolData.zipCode },
      { key: "school_phone", value: schoolData.phone },
      { key: "school_instagram", value: schoolData.instagram },
      { key: "school_email", value: schoolData.email },
      { key: "school_hours_start", value: schoolData.hoursStart },
      { key: "school_hours_end", value: schoolData.hoursEnd },
    ]);
  };

  const handleSavePricing = async () => {
    await updateMultipleSettings([
      { key: "price_bercario_basico", value: pricing.bercario_basico },
      { key: "price_bercario_intermediario", value: pricing.bercario_intermediario },
      { key: "price_bercario_plus", value: pricing.bercario_plus },
      { key: "price_maternal_basico", value: pricing.maternal_basico },
      { key: "price_maternal_intermediario", value: pricing.maternal_intermediario },
      { key: "price_maternal_plus", value: pricing.maternal_plus },
      { key: "price_jardim_basico", value: pricing.jardim_basico },
      { key: "price_jardim_intermediario", value: pricing.jardim_intermediario },
      { key: "price_jardim_plus", value: pricing.jardim_plus },
      { key: "enrollment_fee", value: pricing.enrollment_fee },
    ]);
  };

  const handleSaveNotifications = async () => {
    await updateMultipleSettings([
      { key: "notifications_push_enabled", value: notifications.pushEnabled.toString() },
      { key: "notifications_email", value: notifications.emailAlerts },
      { key: "notifications_daily_report", value: notifications.dailyReportEnabled.toString() },
      { key: "notifications_payment_reminders", value: notifications.paymentReminders.toString() },
    ]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Texto copiado para a área de transferência.",
    });
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/controlid-webhook`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações do sistema, integrações e preferências.
        </p>
      </div>

      <Tabs defaultValue="escola" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="escola" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Escola</span>
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Integrações</span>
          </TabsTrigger>
          <TabsTrigger value="precos" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Preços</span>
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notificações</span>
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Segurança</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Dados da Escola */}
        <TabsContent value="escola" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dados da Instituição
              </CardTitle>
              <CardDescription>
                Informações gerais da escola que aparecem em contratos, e-mails e documentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="school-name">Nome da Instituição</Label>
                  <Input
                    id="school-name"
                    value={schoolData.name}
                    onChange={(e) => setSchoolData({ ...schoolData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-cnpj">CNPJ</Label>
                  <Input
                    id="school-cnpj"
                    value={schoolData.cnpj}
                    onChange={(e) => setSchoolData({ ...schoolData, cnpj: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="school-address">Endereço</Label>
                <Input
                  id="school-address"
                  value={schoolData.address}
                  onChange={(e) => setSchoolData({ ...schoolData, address: e.target.value })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="school-city">Cidade</Label>
                  <Input
                    id="school-city"
                    value={schoolData.city}
                    onChange={(e) => setSchoolData({ ...schoolData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-state">Estado</Label>
                  <Input
                    id="school-state"
                    value={schoolData.state}
                    onChange={(e) => setSchoolData({ ...schoolData, state: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-zip">CEP</Label>
                  <div className="relative">
                    <Input
                      id="school-zip"
                      value={schoolData.zipCode}
                      onChange={(e) => setSchoolData({ ...schoolData, zipCode: formatCep(e.target.value) })}
                      onBlur={(e) => handleCepBlur(e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    {isLoadingCep && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Digite o CEP para preencher automaticamente</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="school-phone">Telefone</Label>
                  <Input
                    id="school-phone"
                    value={schoolData.phone}
                    onChange={(e) => setSchoolData({ ...schoolData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-email">E-mail</Label>
                  <Input
                    id="school-email"
                    type="email"
                    value={schoolData.email}
                    onChange={(e) => setSchoolData({ ...schoolData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="school-instagram">Instagram</Label>
                  <Input
                    id="school-instagram"
                    value={schoolData.instagram}
                    onChange={(e) => setSchoolData({ ...schoolData, instagram: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-hours-start">Horário de Abertura</Label>
                  <Input
                    id="school-hours-start"
                    type="time"
                    value={schoolData.hoursStart}
                    onChange={(e) => setSchoolData({ ...schoolData, hoursStart: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-hours-end">Horário de Fechamento</Label>
                  <Input
                    id="school-hours-end"
                    type="time"
                    value={schoolData.hoursEnd}
                    onChange={(e) => setSchoolData({ ...schoolData, hoursEnd: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSchoolData} disabled={isUpdating}>
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Dados
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Integrações */}
        <TabsContent value="integracoes" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Gmail Integration */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Mail className="h-5 w-5" />
                    Gmail (Google Workspace)
                  </CardTitle>
                  {gmailConfigured ? (
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-muted text-muted-foreground">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Não Conectado
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  Gerenciamento de e-mails diretamente pelo painel.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {gmailConfigured && gmailEmail && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Conta: </span>
                    <span className="font-medium">{gmailEmail}</span>
                  </div>
                )}
                <Button variant="outline" asChild className="w-full">
                  <a href="/painel/emails">
                    {gmailConfigured ? "Gerenciar E-mails" : "Configurar Gmail"}
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* ZapSign Integration */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileSignature className="h-5 w-5" />
                    ZapSign
                  </CardTitle>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Configurado
                  </Badge>
                </div>
                <CardDescription>
                  Assinatura digital de contratos de matrícula.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  API Key configurada via variáveis de ambiente.
                </p>
                <Button variant="outline" asChild className="w-full">
                  <a href="/painel/contratos">
                    Ver Contratos
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Asaas Integration */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="h-5 w-5" />
                    Asaas
                  </CardTitle>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Configurado
                  </Badge>
                </div>
                <CardDescription>
                  Gestão de cobranças e pagamentos recorrentes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  API Key configurada via variáveis de ambiente.
                </p>
                <Button variant="outline" asChild className="w-full">
                  <a href="/painel/financeiro">
                    Ver Financeiro
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Control iD Integration */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5" />
                    Control iD
                  </CardTitle>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Configurado
                  </Badge>
                </div>
                <CardDescription>
                  Integração com relógio de ponto biométrico.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">URL do Webhook</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={webhookUrl} 
                      readOnly 
                      className="text-xs font-mono"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => copyToClipboard(webhookUrl)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button variant="outline" asChild className="w-full">
                  <a href="/painel/ponto">
                    Ver Ponto Eletrônico
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Preços */}
        <TabsContent value="precos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Tabela de Preços
              </CardTitle>
              <CardDescription>
                Configure os valores mensais por turma e plano. Estes valores são sugeridos no painel financeiro.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Turma</TableHead>
                      <TableHead>Básico (R$)</TableHead>
                      <TableHead>Intermediário (R$)</TableHead>
                      <TableHead>Plus+ (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Berçário</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={pricing.bercario_basico}
                          onChange={(e) => setPricing({ ...pricing, bercario_basico: e.target.value })}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={pricing.bercario_intermediario}
                          onChange={(e) => setPricing({ ...pricing, bercario_intermediario: e.target.value })}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={pricing.bercario_plus}
                          onChange={(e) => setPricing({ ...pricing, bercario_plus: e.target.value })}
                          className="w-28"
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Maternal</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={pricing.maternal_basico}
                          onChange={(e) => setPricing({ ...pricing, maternal_basico: e.target.value })}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={pricing.maternal_intermediario}
                          onChange={(e) => setPricing({ ...pricing, maternal_intermediario: e.target.value })}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={pricing.maternal_plus}
                          onChange={(e) => setPricing({ ...pricing, maternal_plus: e.target.value })}
                          className="w-28"
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Jardim</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={pricing.jardim_basico}
                          onChange={(e) => setPricing({ ...pricing, jardim_basico: e.target.value })}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={pricing.jardim_intermediario}
                          onChange={(e) => setPricing({ ...pricing, jardim_intermediario: e.target.value })}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={pricing.jardim_plus}
                          onChange={(e) => setPricing({ ...pricing, jardim_plus: e.target.value })}
                          className="w-28"
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="enrollment-fee">Taxa de Matrícula (R$)</Label>
                  <Input
                    id="enrollment-fee"
                    type="number"
                    value={pricing.enrollment_fee}
                    onChange={(e) => setPricing({ ...pricing, enrollment_fee: e.target.value })}
                    className="w-full sm:w-40"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSavePricing} disabled={isUpdating}>
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Preços
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Notificações */}
        <TabsContent value="notificacoes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Preferências de Notificações
              </CardTitle>
              <CardDescription>
                Configure como e quando o sistema deve enviar notificações.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações Push</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar notificações push para dispositivos móveis e navegadores.
                    </p>
                  </div>
                  <Switch
                    checked={notifications.pushEnabled}
                    onCheckedChange={(checked) => 
                      setNotifications({ ...notifications, pushEnabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Relatório Diário</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar resumo diário de atividades por e-mail.
                    </p>
                  </div>
                  <Switch
                    checked={notifications.dailyReportEnabled}
                    onCheckedChange={(checked) => 
                      setNotifications({ ...notifications, dailyReportEnabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Lembretes de Pagamento</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar lembretes automáticos antes do vencimento das mensalidades.
                    </p>
                  </div>
                  <Switch
                    checked={notifications.paymentReminders}
                    onCheckedChange={(checked) => 
                      setNotifications({ ...notifications, paymentReminders: checked })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-alerts">E-mail para Alertas Administrativos</Label>
                <Input
                  id="email-alerts"
                  type="email"
                  placeholder="admin@crechepimpolinhos.com.br"
                  value={notifications.emailAlerts}
                  onChange={(e) => setNotifications({ ...notifications, emailAlerts: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  E-mail que receberá alertas do sistema (novos cadastros, problemas, etc).
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications} disabled={isUpdating}>
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Preferências
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Segurança */}
        <TabsContent value="seguranca" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Segurança do Sistema
              </CardTitle>
              <CardDescription>
                Configurações de segurança e políticas de acesso.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-medium mb-2">Políticas de Senha</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Mínimo de 8 caracteres</li>
                  <li>• Pelo menos uma letra maiúscula</li>
                  <li>• Pelo menos um número</li>
                  <li>• Gerenciado pelo sistema de autenticação</li>
                </ul>
              </div>

              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-medium mb-2">Proteção de Dados</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Dados criptografados em trânsito (HTTPS)</li>
                  <li>• Políticas de acesso por função (RLS)</li>
                  <li>• Backups automáticos diários</li>
                  <li>• Conformidade com LGPD</li>
                </ul>
              </div>

              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-medium mb-2">Sessões</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Timeout de sessão: 24 horas</li>
                  <li>• Renovação automática enquanto ativo</li>
                  <li>• Logout automático por inatividade</li>
                </ul>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" asChild>
                  <a href="/lgpd">
                    Ver Política de Privacidade
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminConfig;
