import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Loader2, ArrowLeft, ArrowRight, Check, UserPlus, KeyRound } from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";

interface FormData {
  // Auth
  email: string;
  password: string;
  confirmPassword: string;
  inviteCode: string;
  
  // Dados Pessoais
  fullName: string;
  birthDate: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  placeOfBirth: string;
  motherName: string;
  fatherName: string;
  
  // Documentos
  cpf: string;
  rg: string;
  rgIssuer: string;
  rgIssueDate: string;
  pisPasep: string;
  ctpsNumber: string;
  ctpsSeries: string;
  ctpsState: string;
  voterTitle: string;
  voterZone: string;
  voterSection: string;
  militaryCertificate: string;
  
  // Endereço
  zipCode: string;
  street: string;
  streetNumber: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  
  // Contato
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  
  // Dados Bancários
  bankName: string;
  bankAgency: string;
  bankAccount: string;
  bankAccountType: string;
  pixKey: string;
  
  // Dados Profissionais
  educationLevel: string;
  specialization: string;
  jobTitle: string;
  workShift: string;
  
  // Outros
  hasDisability: boolean;
  disabilityDescription: string;
}

const initialFormData: FormData = {
  email: "",
  password: "",
  confirmPassword: "",
  inviteCode: "",
  fullName: "",
  birthDate: "",
  gender: "",
  maritalStatus: "",
  nationality: "Brasileira",
  placeOfBirth: "",
  motherName: "",
  fatherName: "",
  cpf: "",
  rg: "",
  rgIssuer: "",
  rgIssueDate: "",
  pisPasep: "",
  ctpsNumber: "",
  ctpsSeries: "",
  ctpsState: "",
  voterTitle: "",
  voterZone: "",
  voterSection: "",
  militaryCertificate: "",
  zipCode: "",
  street: "",
  streetNumber: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  phone: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  bankName: "",
  bankAgency: "",
  bankAccount: "",
  bankAccountType: "",
  pixKey: "",
  educationLevel: "",
  specialization: "",
  jobTitle: "",
  workShift: "",
  hasDisability: false,
  disabilityDescription: "",
};

const steps = [
  { id: 1, title: "Convite", icon: KeyRound },
  { id: 2, title: "Dados Pessoais", icon: UserPlus },
  { id: 3, title: "Documentos", icon: UserPlus },
  { id: 4, title: "Endereço", icon: UserPlus },
  { id: 5, title: "Contato & Banco", icon: UserPlus },
  { id: 6, title: "Profissional", icon: UserPlus },
];

const brazilianStates = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function EmployeeRegistration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [inviteValid, setInviteValid] = useState(false);
  const [inviteRole, setInviteRole] = useState<string>("");
  const [formData, setFormData] = useState<FormData>({
    ...initialFormData,
    inviteCode: searchParams.get("code") || "",
  });

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateInviteCode = async () => {
    if (!formData.inviteCode.trim()) {
      toast.error("Digite o código de convite");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("employee_invites")
      .select("*")
      .eq("invite_code", formData.inviteCode.trim().toUpperCase())
      .eq("is_used", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error || !data) {
      toast.error("Código de convite inválido ou expirado");
      setLoading(false);
      return;
    }

    // Store role in both state and formData to ensure persistence across steps
    const role = data.role || "";
    setInviteValid(true);
    setInviteRole(role);
    // Also store in formData for redundancy
    setFormData(prev => ({ ...prev, jobTitle: role }));
    
    console.log("Invite validated - role:", role);
    toast.success("Código válido! Continue o cadastro.");
    setStep(2);
    setLoading(false);
  };

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        updateField("street", data.logradouro || "");
        updateField("neighborhood", data.bairro || "");
        updateField("city", data.localidade || "");
        updateField("state", data.uf || "");
      }
    } catch (error) {
      console.error("Error fetching address:", error);
    }
  };

  const handleSubmit = async () => {
    if (formData.password !== formData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
        },
      });

      // Check for user already exists error
      if (authError) {
        if (authError.message?.toLowerCase().includes("already registered") || 
            authError.message?.toLowerCase().includes("already exists")) {
          toast.error("Este e-mail já está cadastrado. Por favor, use outro e-mail ou faça login.");
          setLoading(false);
          return;
        }
        throw authError;
      }
      
      // Also check if user was returned but identity already existed (Supabase v2 behavior)
      if (authData.user?.identities?.length === 0) {
        toast.error("Este e-mail já está cadastrado. Por favor, use outro e-mail ou faça login.");
        setLoading(false);
        return;
      }
      
      if (!authData.user) throw new Error("Erro ao criar usuário");

      // 2. Create profile with pending status (requires admin approval)
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: authData.user.id,
        full_name: formData.fullName,
        phone: formData.phone,
        status: "pending",
      });

      if (profileError) {
        console.error("Profile error:", profileError);
        // Don't throw - profile might already exist from trigger
      }

      // 3. Assign role - use the exact role from the invite (use formData.jobTitle as fallback)
      const roleToAssign = inviteRole || formData.jobTitle;
      if (!roleToAssign) {
        throw new Error("Cargo não definido no convite. Por favor, revalide o código de convite.");
      }
      
      // IMPORTANT: The handle_new_user trigger automatically assigns "parent" role to all new users.
      // For employees, we need to remove that role and assign the correct staff role.
      // First, delete any existing "parent" role that was auto-assigned by the trigger
      await supabase.from("user_roles").delete()
        .eq("user_id", authData.user.id)
        .eq("role", "parent");
      
      // Now insert the correct staff role from the invite
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: roleToAssign as "admin" | "teacher" | "cook" | "nutritionist" | "pedagogue" | "auxiliar",
      });

      if (roleError) {
        console.error("Role error:", roleError);
        throw new Error("Erro ao atribuir cargo. Por favor, contate o administrador.");
      }

      // 4. Create employee profile
      const { error: employeeError } = await supabase.from("employee_profiles").insert({
        user_id: authData.user.id,
        full_name: formData.fullName,
        birth_date: formData.birthDate,
        gender: formData.gender || null,
        marital_status: formData.maritalStatus || null,
        nationality: formData.nationality,
        place_of_birth: formData.placeOfBirth || null,
        mother_name: formData.motherName || null,
        father_name: formData.fatherName || null,
        cpf: formData.cpf,
        rg: formData.rg || null,
        rg_issuer: formData.rgIssuer || null,
        rg_issue_date: formData.rgIssueDate || null,
        pis_pasep: formData.pisPasep || null,
        ctps_number: formData.ctpsNumber || null,
        ctps_series: formData.ctpsSeries || null,
        ctps_state: formData.ctpsState || null,
        voter_title: formData.voterTitle || null,
        voter_zone: formData.voterZone || null,
        voter_section: formData.voterSection || null,
        military_certificate: formData.militaryCertificate || null,
        zip_code: formData.zipCode || null,
        street: formData.street || null,
        street_number: formData.streetNumber || null,
        complement: formData.complement || null,
        neighborhood: formData.neighborhood || null,
        city: formData.city || null,
        state: formData.state || null,
        phone: formData.phone || null,
        emergency_contact_name: formData.emergencyContactName || null,
        emergency_contact_phone: formData.emergencyContactPhone || null,
        bank_name: formData.bankName || null,
        bank_agency: formData.bankAgency || null,
        bank_account: formData.bankAccount || null,
        bank_account_type: formData.bankAccountType || null,
        pix_key: formData.pixKey || null,
        education_level: formData.educationLevel || null,
        specialization: formData.specialization || null,
        job_title: inviteRole || formData.jobTitle, // Use invite role as job title (with fallback)
        work_shift: formData.workShift || null,
        has_disability: formData.hasDisability,
        disability_description: formData.hasDisability ? formData.disabilityDescription : null,
      });

      if (employeeError) {
        console.error("Employee profile error:", employeeError);
        throw new Error("Erro ao criar perfil profissional. Por favor, tente novamente.");
      }

      // 5. Mark invite as used
      const { error: inviteUpdateError } = await supabase
        .from("employee_invites")
        .update({
          is_used: true,
          used_by: authData.user.id,
          used_at: new Date().toISOString(),
        })
        .eq("invite_code", formData.inviteCode.trim().toUpperCase());

      if (inviteUpdateError) {
        console.error("Invite update error:", inviteUpdateError);
      }

      toast.success("Cadastro realizado com sucesso! Aguarde a aprovação do administrador.");
      
      // Sign out and redirect to auth page since they need approval
      await supabase.auth.signOut();
      setTimeout(() => {
        window.location.href = "/auth?pending=true";
      }, 2000);
    } catch (error: unknown) {
      console.error("Registration error:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao realizar cadastro";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.inviteCode.trim().length > 0;
      case 2:
        return formData.fullName && formData.birthDate && formData.email && formData.password && formData.confirmPassword;
      case 3:
        return formData.cpf;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pimpo-blue-light via-background to-pimpo-yellow-light py-8 px-4">
      <div className="container max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4">
            <img src={logo} alt="Creche Pimpolinhos" className="h-16 mx-auto" />
          </Link>
          <h1 className="font-fredoka text-2xl font-bold">Cadastro de Funcionário</h1>
          <p className="text-muted-foreground">Preencha seus dados para acessar o sistema</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8 overflow-x-auto">
          {steps.map((s, index) => (
            <div key={s.id} className="flex items-center">
              <div
                className={`flex flex-col items-center ${
                  step >= s.id ? "text-pimpo-blue" : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    step > s.id
                      ? "bg-pimpo-green text-white"
                      : step === s.id
                      ? "bg-pimpo-blue text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > s.id ? <Check className="w-5 h-5" /> : s.id}
                </div>
                <span className="text-xs mt-1 hidden sm:block">{s.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-8 sm:w-16 h-0.5 mx-2 ${
                    step > s.id ? "bg-pimpo-green" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{steps[step - 1].title}</CardTitle>
            <CardDescription>
              {step === 1 && "Digite o código de convite fornecido pela escola"}
              {step === 2 && "Informe seus dados pessoais básicos"}
              {step === 3 && "Documentos necessários para registro em carteira"}
              {step === 4 && "Endereço residencial completo"}
              {step === 5 && "Contato de emergência e dados bancários"}
              {step === 6 && "Formação e informações profissionais"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1: Invite Code */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="inviteCode">Código de Convite *</Label>
                  <Input
                    id="inviteCode"
                    value={formData.inviteCode}
                    onChange={(e) => updateField("inviteCode", e.target.value.toUpperCase())}
                    placeholder="Ex: ABC123"
                    className="text-center text-2xl tracking-widest font-mono uppercase"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Solicite o código de convite ao administrador da escola
                  </p>
                </div>
                <Button
                  onClick={validateInviteCode}
                  disabled={loading || !formData.inviteCode.trim()}
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4 mr-2" />
                  )}
                  Validar Código
                </Button>
              </div>
            )}

            {/* Step 2: Personal Data */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="fullName">Nome Completo *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => updateField("fullName", e.target.value)}
                      placeholder="Nome completo conforme documentos"
                    />
                  </div>
                  <div>
                    <Label htmlFor="birthDate">Data de Nascimento *</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => updateField("birthDate", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gênero</Label>
                    <Select value={formData.gender} onValueChange={(v) => updateField("gender", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                        <SelectItem value="prefiro_nao_informar">Prefiro não informar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="maritalStatus">Estado Civil</Label>
                    <Select value={formData.maritalStatus} onValueChange={(v) => updateField("maritalStatus", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                        <SelectItem value="casado">Casado(a)</SelectItem>
                        <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                        <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                        <SelectItem value="uniao_estavel">União Estável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="nationality">Nacionalidade</Label>
                    <Input
                      id="nationality"
                      value={formData.nationality}
                      onChange={(e) => updateField("nationality", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="placeOfBirth">Naturalidade</Label>
                    <Input
                      id="placeOfBirth"
                      value={formData.placeOfBirth}
                      onChange={(e) => updateField("placeOfBirth", e.target.value)}
                      placeholder="Cidade/Estado de nascimento"
                    />
                  </div>
                  <div>
                    <Label htmlFor="motherName">Nome da Mãe</Label>
                    <Input
                      id="motherName"
                      value={formData.motherName}
                      onChange={(e) => updateField("motherName", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fatherName">Nome do Pai</Label>
                    <Input
                      id="fatherName"
                      value={formData.fatherName}
                      onChange={(e) => updateField("fatherName", e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-4">Dados de Acesso</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        placeholder="seu@email.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Senha *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => updateField("password", e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => updateField("confirmPassword", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Documents */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => updateField("cpf", e.target.value)}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rg">RG</Label>
                    <Input
                      id="rg"
                      value={formData.rg}
                      onChange={(e) => updateField("rg", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rgIssuer">Órgão Expedidor</Label>
                    <Input
                      id="rgIssuer"
                      value={formData.rgIssuer}
                      onChange={(e) => updateField("rgIssuer", e.target.value)}
                      placeholder="Ex: SSP/RS"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rgIssueDate">Data de Expedição</Label>
                    <Input
                      id="rgIssueDate"
                      type="date"
                      value={formData.rgIssueDate}
                      onChange={(e) => updateField("rgIssueDate", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pisPasep">PIS/PASEP</Label>
                    <Input
                      id="pisPasep"
                      value={formData.pisPasep}
                      onChange={(e) => updateField("pisPasep", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ctpsNumber">Número CTPS</Label>
                    <Input
                      id="ctpsNumber"
                      value={formData.ctpsNumber}
                      onChange={(e) => updateField("ctpsNumber", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ctpsSeries">Série CTPS</Label>
                    <Input
                      id="ctpsSeries"
                      value={formData.ctpsSeries}
                      onChange={(e) => updateField("ctpsSeries", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ctpsState">UF CTPS</Label>
                    <Select value={formData.ctpsState} onValueChange={(v) => updateField("ctpsState", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {brazilianStates.map((state) => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="voterTitle">Título de Eleitor</Label>
                    <Input
                      id="voterTitle"
                      value={formData.voterTitle}
                      onChange={(e) => updateField("voterTitle", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="voterZone">Zona</Label>
                    <Input
                      id="voterZone"
                      value={formData.voterZone}
                      onChange={(e) => updateField("voterZone", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="voterSection">Seção</Label>
                    <Input
                      id="voterSection"
                      value={formData.voterSection}
                      onChange={(e) => updateField("voterSection", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="militaryCertificate">Certificado de Reservista</Label>
                    <Input
                      id="militaryCertificate"
                      value={formData.militaryCertificate}
                      onChange={(e) => updateField("militaryCertificate", e.target.value)}
                      placeholder="Apenas para homens"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Address */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => {
                        updateField("zipCode", e.target.value);
                        if (e.target.value.replace(/\D/g, "").length === 8) {
                          fetchAddressByCep(e.target.value);
                        }
                      }}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="street">Rua</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) => updateField("street", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="streetNumber">Número</Label>
                    <Input
                      id="streetNumber"
                      value={formData.streetNumber}
                      onChange={(e) => updateField("streetNumber", e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      value={formData.complement}
                      onChange={(e) => updateField("complement", e.target.value)}
                      placeholder="Apto, Bloco, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      value={formData.neighborhood}
                      onChange={(e) => updateField("neighborhood", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Select value={formData.state} onValueChange={(v) => updateField("state", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {brazilianStates.map((state) => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Contact & Bank */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-4">Contato</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Telefone/Celular</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        placeholder="(51) 99999-9999"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergencyContactName">Contato de Emergência</Label>
                      <Input
                        id="emergencyContactName"
                        value={formData.emergencyContactName}
                        onChange={(e) => updateField("emergencyContactName", e.target.value)}
                        placeholder="Nome do contato"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="emergencyContactPhone">Telefone de Emergência</Label>
                      <Input
                        id="emergencyContactPhone"
                        value={formData.emergencyContactPhone}
                        onChange={(e) => updateField("emergencyContactPhone", e.target.value)}
                        placeholder="(51) 99999-9999"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4">Dados Bancários</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bankName">Banco</Label>
                      <Input
                        id="bankName"
                        value={formData.bankName}
                        onChange={(e) => updateField("bankName", e.target.value)}
                        placeholder="Ex: Banco do Brasil"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bankAgency">Agência</Label>
                      <Input
                        id="bankAgency"
                        value={formData.bankAgency}
                        onChange={(e) => updateField("bankAgency", e.target.value)}
                        placeholder="0000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bankAccount">Conta</Label>
                      <Input
                        id="bankAccount"
                        value={formData.bankAccount}
                        onChange={(e) => updateField("bankAccount", e.target.value)}
                        placeholder="00000-0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bankAccountType">Tipo de Conta</Label>
                      <Select value={formData.bankAccountType} onValueChange={(v) => updateField("bankAccountType", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="corrente">Conta Corrente</SelectItem>
                          <SelectItem value="poupanca">Conta Poupança</SelectItem>
                          <SelectItem value="salario">Conta Salário</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="pixKey">Chave PIX</Label>
                      <Input
                        id="pixKey"
                        value={formData.pixKey}
                        onChange={(e) => updateField("pixKey", e.target.value)}
                        placeholder="CPF, telefone, e-mail ou chave aleatória"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Professional */}
            {step === 6 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="educationLevel">Escolaridade</Label>
                    <Select value={formData.educationLevel} onValueChange={(v) => updateField("educationLevel", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fundamental_incompleto">Fundamental Incompleto</SelectItem>
                        <SelectItem value="fundamental_completo">Fundamental Completo</SelectItem>
                        <SelectItem value="medio_incompleto">Médio Incompleto</SelectItem>
                        <SelectItem value="medio_completo">Médio Completo</SelectItem>
                        <SelectItem value="superior_incompleto">Superior Incompleto</SelectItem>
                        <SelectItem value="superior_completo">Superior Completo</SelectItem>
                        <SelectItem value="pos_graduacao">Pós-Graduação</SelectItem>
                        <SelectItem value="mestrado">Mestrado</SelectItem>
                        <SelectItem value="doutorado">Doutorado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="specialization">Curso/Formação</Label>
                    <Input
                      id="specialization"
                      value={formData.specialization}
                      onChange={(e) => updateField("specialization", e.target.value)}
                      placeholder="Ex: Pedagogia, Magistério"
                    />
                  </div>
                  <div>
                    <Label htmlFor="jobTitle">Cargo (definido pelo convite)</Label>
                    <Input
                      id="jobTitle"
                      value={
                        (() => {
                          // Use formData.jobTitle as fallback if inviteRole state was lost
                          const role = inviteRole || formData.jobTitle;
                          switch (role) {
                            case "teacher": return "Professor(a)";
                            case "auxiliar": return "Auxiliar de Sala";
                            case "cook": return "Cozinheiro(a)";
                            case "nutritionist": return "Nutricionista";
                            case "pedagogue": return "Pedagoga";
                            case "admin": return "Administrador(a)";
                            default: return role ? role : "Funcionário";
                          }
                        })()
                      }
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Esta função foi definida pelo administrador no convite
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="workShift">Turno de Trabalho</Label>
                    <Select value={formData.workShift} onValueChange={(v) => updateField("workShift", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manha">Manhã</SelectItem>
                        <SelectItem value="tarde">Tarde</SelectItem>
                        <SelectItem value="integral">Integral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="hasDisability"
                      checked={formData.hasDisability}
                      onCheckedChange={(checked) => updateField("hasDisability", !!checked)}
                    />
                    <Label htmlFor="hasDisability" className="cursor-pointer">
                      Possuo alguma deficiência
                    </Label>
                  </div>
                  {formData.hasDisability && (
                    <div>
                      <Label htmlFor="disabilityDescription">Descrição da Deficiência</Label>
                      <Textarea
                        id="disabilityDescription"
                        value={formData.disabilityDescription}
                        onChange={(e) => updateField("disabilityDescription", e.target.value)}
                        placeholder="Descreva sua deficiência e necessidades especiais"
                        rows={3}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              ) : (
                <Button variant="outline" asChild>
                  <Link to="/">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Cancelar
                  </Link>
                </Button>
              )}

              {step < 6 ? (
                <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Finalizar Cadastro
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
