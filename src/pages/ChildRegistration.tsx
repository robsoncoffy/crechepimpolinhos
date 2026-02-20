import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm, Controller, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDiscountCoupon } from "@/hooks/useDiscountCoupon";
import { fetchPricesForClass, getSuggestedClassType, getClassDisplayName, formatCurrency, type ClassType, type PlanType } from "@/lib/pricing";
import {
  Baby,
  MapPin,
  FileText,
  Heart,
  Building2,
  Upload,
  CheckCircle2,
  ArrowRight,
  Camera,
  X,
  UserPlus,
  Tag,
  Loader2
} from "lucide-react";
import { InviteSecondGuardian } from "@/components/child/InviteSecondGuardian";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_DOC_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

const registrationSchema = z.object({
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  street: z.string().min(3, "Rua/Avenida é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, "Bairro é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z.string().min(2, "Estado é obrigatório"),
  zipCode: z.string().min(8, "CEP é obrigatório"),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  susCard: z.string().optional(),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  continuousDoctors: z.string().optional(),
  privateDoctors: z.string().optional(),
  enrollmentType: z.enum(["municipal", "private"], {
    required_error: "Selecione o tipo de vaga",
  }),
  planType: z.enum(["basico", "intermediario", "plus"], {
    required_error: "Selecione o plano desejado",
  }).optional(),
  authorizedPickups: z.array(z.object({
    fullName: z.string().min(2, "Nome completo é obrigatório"),
    relationship: z.string().min(2, "Grau de parentesco é obrigatório"),
  })).optional(),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;


const ChildRegistration = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [childFullName, setChildFullName] = useState<string>("");
  const [activeTab, setActiveTab] = useState("basic");
  const [preEnrollmentData, setPreEnrollmentData] = useState<{
    child_name: string;
    child_birth_date: string;
    desired_class_type: string;
    desired_shift_type: string;
    vacancy_type?: string;
  } | null>(null);

  // File states
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [birthCertificateFile, setBirthCertificateFile] = useState<File | null>(null);
  const [birthCertificatePreview, setBirthCertificatePreview] = useState<string | null>(null);


  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponAutoApplied, setCouponAutoApplied] = useState(false);

  // Pricing state
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);
  const [classType, setClassType] = useState<ClassType | null>(null);

  // Discount coupon hook
  const {
    coupon,
    isLoading: isValidatingCoupon,
    error: couponError,
    validateCoupon,
    clearCoupon,
    calculateDiscount
  } = useDiscountCoupon();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      enrollmentType: "private",
      planType: undefined,
      authorizedPickups: [],
    },
  });

  const selectedEnrollmentType = watch("enrollmentType");
  const watchedBirthDate = watch("birthDate");

  // Effect to update class type and prices when birth date changes
  useEffect(() => {
    async function updatePricing() {
      if (!watchedBirthDate) {
        setClassType(null);
        setPrices({});
        return;
      }

      setIsLoadingPricing(true);
      try {
        const type = await getSuggestedClassType(watchedBirthDate);
        setClassType(type);
        const fetchedPrices = await fetchPricesForClass(type);
        setPrices(fetchedPrices);
      } catch (error) {
        console.error("Failed to update pricing:", error);
      } finally {
        setIsLoadingPricing(false);
      }
    }

    // Debounce slightly to avoid rapid calls
    const timer = setTimeout(updatePricing, 300);
    return () => clearTimeout(timer);
  }, [watchedBirthDate]);

  // Get the class name for display (with Maternal I/II distinction)
  const estimatedClassName = useMemo(() => {
    return classType ? getClassDisplayName(classType) : "";
  }, [classType]);

  // Get price for a plan with optional discount
  const getPlanPrice = (planType: PlanType) => {
    const basePrice = prices[planType] || 0;
    return calculateDiscount(basePrice);
  };

  // Get base price for display (before discount)
  const getBasePriceForPlan = (planType: PlanType) => {
    return prices[planType] || 0;
  };

  // Auto-apply coupon from URL parameter
  useEffect(() => {
    const urlCoupon = searchParams.get("cupom");
    if (urlCoupon && !couponAutoApplied && !coupon) {
      setCouponCode(urlCoupon.toUpperCase());
      validateCoupon(urlCoupon).then((result) => {
        if (result) {
          setCouponAutoApplied(true);
        }
      });
    }
  }, [searchParams, couponAutoApplied, coupon, validateCoupon]);

  // Fetch pre-enrollment data if user has an invite linked to one
  useEffect(() => {
    const fetchPreEnrollmentData = async () => {
      if (!user) return;

      // Find the invite used by this user
      let invite: { pre_enrollment_id: string | null; coupon_code: string | null } | null = null;

      const { data: inviteByUser } = await supabase
        .from("parent_invites")
        .select("pre_enrollment_id, coupon_code")
        .eq("used_by", user.id)
        .maybeSingle();

      invite = inviteByUser ?? null;

      // Fallback: some flows might not set used_by; try by email
      if (!invite && user.email) {
        const { data: inviteByEmail } = await supabase
          .from("parent_invites")
          .select("pre_enrollment_id, coupon_code")
          .eq("email", user.email)
          .order("created_at", { ascending: false })
          .maybeSingle();

        invite = inviteByEmail ?? null;
      }

      if (invite?.pre_enrollment_id) {
        const { data: preEnrollment } = await supabase
          .from("pre_enrollments")
          .select("child_name, child_birth_date, desired_class_type, desired_shift_type, vacancy_type")
          .eq("id", invite.pre_enrollment_id)
          .single();

        if (preEnrollment) {
          setPreEnrollmentData(preEnrollment);

          // Parse child name into first and last name
          const nameParts = preEnrollment.child_name.trim().split(" ");
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";

          // Pre-fill form fields
          setValue("firstName", firstName);
          setValue("lastName", lastName);
          setValue("birthDate", preEnrollment.child_birth_date);

          // Auto-select enrollment type based on vacancy_type from pre-enrollment
          if (preEnrollment.vacancy_type === "municipal") {
            setValue("enrollmentType", "municipal");
          } else if (preEnrollment.vacancy_type === "particular") {
            setValue("enrollmentType", "private");
          }

          // Auto-select plan type based on desired_shift_type from pre-enrollment
          // manha/tarde -> basico (meio turno), integral -> intermediario
          if (preEnrollment.desired_shift_type) {
            if (preEnrollment.desired_shift_type === "integral") {
              setValue("planType", "intermediario");
            } else if (preEnrollment.desired_shift_type === "manha" || preEnrollment.desired_shift_type === "tarde") {
              setValue("planType", "basico");
            }
          }

          toast({
            title: "Dados da pré-matrícula carregados!",
            description: "Alguns campos foram preenchidos automaticamente com os dados informados na pré-matrícula.",
          });
        }
      }

      // Auto-apply coupon from invite if not already applied
      if (invite?.coupon_code && !couponAutoApplied && !coupon && !searchParams.get("cupom")) {
        const code = invite.coupon_code.toUpperCase();
        setCouponCode(code);
        validateCoupon(code).then((result) => {
          if (result) {
            setCouponAutoApplied(true);
          }
        });
      }
    };

    fetchPreEnrollmentData();
  }, [user, setValue, toast, couponAutoApplied, coupon, validateCoupon, searchParams]);

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setValue("street", data.logradouro || "");
        setValue("neighborhood", data.bairro || "");
        setValue("city", data.localidade || "");
        setValue("state", data.uf || "");
        toast({
          title: "Endereço encontrado!",
          description: "Os campos foram preenchidos automaticamente.",
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP e tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setIsLoadingCep(false);
    }
  };


  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "Arquivo muito grande",
          description: "O tamanho máximo é 5MB",
          variant: "destructive",
        });
        return;
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast({
          title: "Formato inválido",
          description: "Use apenas JPG, PNG ou WebP",
          variant: "destructive",
        });
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleBirthCertificateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "Arquivo muito grande",
          description: "O tamanho máximo é 5MB",
          variant: "destructive",
        });
        return;
      }
      if (!ACCEPTED_DOC_TYPES.includes(file.type)) {
        toast({
          title: "Formato inválido",
          description: "Use apenas JPG, PNG, WebP ou PDF",
          variant: "destructive",
        });
        return;
      }
      setBirthCertificateFile(file);
      if (file.type.startsWith("image/")) {
        setBirthCertificatePreview(URL.createObjectURL(file));
      } else {
        setBirthCertificatePreview(null);
      }
    }
  };


  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${user?.id}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('child-documents')
      .upload(fileName, file);

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data } = supabase.storage
      .from('child-documents')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const onSubmit = async (data: RegistrationFormData) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para cadastrar uma criança",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload photo
      let photoUrl: string | null = null;
      if (photoFile) {
        photoUrl = await uploadFile(photoFile, 'photos');
      }

      // Upload birth certificate
      let birthCertificateUrl: string | null = null;
      if (birthCertificateFile) {
        birthCertificateUrl = await uploadFile(birthCertificateFile, 'birth-certificates');
      }

      // Compose full address from fields
      const fullAddress = `${data.street}, ${data.number}${data.complement ? `, ${data.complement}` : ''} - ${data.neighborhood}, ${data.city}/${data.state} - CEP: ${data.zipCode}`;

      // Insert child registration
      const { data: registration, error: regError } = await supabase
        .from('child_registrations')
        .insert({
          parent_id: user.id,
          first_name: data.firstName,
          last_name: data.lastName,
          birth_date: data.birthDate,
          address: fullAddress,
          city: data.city,
          cpf: data.cpf || null,
          rg: data.rg || null,
          birth_certificate_url: birthCertificateUrl,
          sus_card: data.susCard || null,
          allergies: data.allergies || null,
          medications: data.medications || null,
          continuous_doctors: data.continuousDoctors || null,
          private_doctors: data.privateDoctors || null,
          enrollment_type: data.enrollmentType,
          plan_type: data.enrollmentType === 'private' ? data.planType : null,
          photo_url: photoUrl,
        } as any)
        .select()
        .single();

      if (regError) throw regError;


      setRegistrationId(registration.id);
      setChildFullName(`${data.firstName} ${data.lastName}`);
      setIsSuccess(true);
      toast({
        title: "Cadastro enviado!",
        description: "Aguarde a aprovação da escola.",
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Erro ao cadastrar",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalid = (formErrors: FieldErrors<RegistrationFormData>) => {
    const errorKeys = Object.keys(formErrors);
    const firstKey = errorKeys[0] as keyof RegistrationFormData | undefined;

    const goToTabForField = (field?: keyof RegistrationFormData) => {
      if (!field) return;

      const basicFields: (keyof RegistrationFormData)[] = ["firstName", "lastName", "birthDate"];
      const addressFields: (keyof RegistrationFormData)[] = [
        "street",
        "number",
        "complement",
        "neighborhood",
        "city",
        "state",
        "zipCode",
      ];
      const documentsFields: (keyof RegistrationFormData)[] = ["cpf", "rg", "susCard"];
      const healthFields: (keyof RegistrationFormData)[] = [
        "allergies",
        "medications",
        "continuousDoctors",
        "privateDoctors",
      ];
      const authorizedFields: (keyof RegistrationFormData)[] = ["authorizedPickups"];
      const enrollmentFields: (keyof RegistrationFormData)[] = ["enrollmentType", "planType"];

      if (basicFields.includes(field)) setActiveTab("basic");
      else if (addressFields.includes(field)) setActiveTab("address");
      else if (documentsFields.includes(field)) setActiveTab("documents");
      else if (healthFields.includes(field)) setActiveTab("health");
      else if (authorizedFields.includes(field)) setActiveTab("authorized");
      else if (enrollmentFields.includes(field)) setActiveTab("enrollment");
    };

    goToTabForField(firstKey);

    toast({
      title: "Campos obrigatórios",
      description: "Revise os campos com * (obrigatórios) antes de enviar.",
      variant: "destructive",
    });
  };

  if (authLoading) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </PublicLayout>
    );
  }

  if (!user) {
    return (
      <PublicLayout>
        <div className="min-h-screen py-20">
          <div className="container mx-auto px-4 max-w-lg">
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-2xl">Acesso Necessário</CardTitle>
                <CardDescription>
                  Para cadastrar seu Pimpolho, você precisa estar logado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={() => navigate("/auth")} className="w-full">
                  Fazer Login / Cadastro
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (isSuccess && registrationId) {
    return (
      <PublicLayout>
        <div className="min-h-screen py-20">
          <div className="container mx-auto px-4 max-w-lg">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-green-600">Cadastro Enviado!</CardTitle>
                <CardDescription className="text-base">
                  O cadastro de <strong>{childFullName}</strong> foi enviado com sucesso. Nossa equipe irá analisar as informações e entrar em contato em breve.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Invite Second Guardian Section */}
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    <p className="font-medium text-foreground">Convidar outro responsável?</p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Você pode convidar o pai, mãe ou outro responsável para também acompanhar {childFullName.split(' ')[0]}.
                  </p>
                  <InviteSecondGuardian
                    childRegistrationId={registrationId}
                    childName={childFullName}
                    inviterName={user?.user_metadata?.full_name || "Responsável"}
                  />
                </div>

                <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground">
                  <p><strong>Próximos passos:</strong></p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-left">
                    <li>Aguarde a análise do cadastro pela escola</li>
                    <li>Você receberá uma notificação quando aprovado</li>
                    <li>Pessoas autorizadas só poderão retirar após aprovação dos documentos</li>
                  </ul>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => navigate("/")} className="flex-1">
                    Voltar ao Início
                  </Button>
                  <Button onClick={() => navigate("/painel")} className="flex-1">
                    Ir para o Painel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-screen py-12 bg-gradient-to-br from-background via-background to-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Baby className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Cadastre o seu Pimpolho
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Preencha todas as informações do seu filho(a) para completar o cadastro na nossa creche.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto gap-1 p-1 mb-6">
                <TabsTrigger value="basic" className="flex items-center justify-center gap-1.5 py-2">
                  <Baby className="h-4 w-4" />
                  <span className="hidden sm:inline">Básico</span>
                </TabsTrigger>
                <TabsTrigger value="address" className="flex items-center justify-center gap-1.5 py-2">
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Endereço</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex items-center justify-center gap-1.5 py-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Docs</span>
                </TabsTrigger>
                <TabsTrigger value="health" className="flex items-center justify-center gap-1.5 py-2">
                  <Heart className="h-4 w-4" />
                  <span className="hidden sm:inline">Saúde</span>
                </TabsTrigger>
                <TabsTrigger value="enrollment" className="flex items-center justify-center gap-1.5 py-2">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Vaga</span>
                </TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Baby className="h-5 w-5 text-primary" />
                      Dados Básicos da Criança
                    </CardTitle>
                    <CardDescription>
                      Informações principais do seu filho(a)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Photo Upload */}
                    <div className="flex flex-col items-center gap-4">
                      <Label className="text-sm font-medium">Foto da Criança</Label>
                      <div className="relative">
                        {photoPreview ? (
                          <div className="relative">
                            <img
                              src={photoPreview}
                              alt="Preview"
                              className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setPhotoFile(null);
                                setPhotoPreview(null);
                              }}
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer">
                            <div className="w-32 h-32 rounded-full bg-muted border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center hover:border-primary/50 transition-colors">
                              <Camera className="h-8 w-8 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground mt-1">Adicionar foto</span>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Nome *</Label>
                        <Input
                          id="firstName"
                          placeholder="Nome da criança"
                          {...register("firstName")}
                          className={errors.firstName ? "border-destructive" : ""}
                        />
                        {errors.firstName && (
                          <p className="text-sm text-destructive">{errors.firstName.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Sobrenome *</Label>
                        <Input
                          id="lastName"
                          placeholder="Sobrenome da criança"
                          {...register("lastName")}
                          className={errors.lastName ? "border-destructive" : ""}
                        />
                        {errors.lastName && (
                          <p className="text-sm text-destructive">{errors.lastName.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="birthDate">Data de Nascimento *</Label>
                      <Input
                        id="birthDate"
                        type="date"
                        {...register("birthDate")}
                        className={errors.birthDate ? "border-destructive" : ""}
                      />
                      {errors.birthDate && (
                        <p className="text-sm text-destructive">{errors.birthDate.message}</p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button type="button" onClick={() => setActiveTab("address")}>
                        Próximo
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Address Tab */}
              <TabsContent value="address">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      Endereço
                    </CardTitle>
                    <CardDescription>
                      Endereço de residência da criança
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="street">Rua/Avenida *</Label>
                        <Input
                          id="street"
                          placeholder="Ex: Av. Inconfidência"
                          {...register("street")}
                          className={errors.street ? "border-destructive" : ""}
                        />
                        {errors.street && (
                          <p className="text-sm text-destructive">{errors.street.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="number">Número *</Label>
                        <Input
                          id="number"
                          placeholder="123"
                          {...register("number")}
                          className={errors.number ? "border-destructive" : ""}
                        />
                        {errors.number && (
                          <p className="text-sm text-destructive">{errors.number.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="complement">Complemento</Label>
                        <Input
                          id="complement"
                          placeholder="Apto, bloco, casa (opcional)"
                          {...register("complement")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="neighborhood">Bairro *</Label>
                        <Input
                          id="neighborhood"
                          placeholder="Nome do bairro"
                          {...register("neighborhood")}
                          className={errors.neighborhood ? "border-destructive" : ""}
                        />
                        {errors.neighborhood && (
                          <p className="text-sm text-destructive">{errors.neighborhood.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="zipCode">CEP *</Label>
                        <div className="relative">
                          <Input
                            id="zipCode"
                            placeholder="00000-000"
                            {...register("zipCode")}
                            className={errors.zipCode ? "border-destructive" : ""}
                            onBlur={(e) => fetchAddressByCep(e.target.value)}
                          />
                          {isLoadingCep && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                            </div>
                          )}
                        </div>
                        {errors.zipCode && (
                          <p className="text-sm text-destructive">{errors.zipCode.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade *</Label>
                        <Input
                          id="city"
                          placeholder="Nome da cidade"
                          {...register("city")}
                          className={errors.city ? "border-destructive" : ""}
                        />
                        {errors.city && (
                          <p className="text-sm text-destructive">{errors.city.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">Estado *</Label>
                        <Input
                          id="state"
                          placeholder="RS"
                          {...register("state")}
                          className={errors.state ? "border-destructive" : ""}
                        />
                        {errors.state && (
                          <p className="text-sm text-destructive">{errors.state.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button type="button" variant="outline" onClick={() => setActiveTab("basic")}>
                        Anterior
                      </Button>
                      <Button type="button" onClick={() => setActiveTab("documents")}>
                        Próximo
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Documentos
                    </CardTitle>
                    <CardDescription>
                      Documentos de identificação da criança
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cpf">CPF</Label>
                        <Input
                          id="cpf"
                          placeholder="000.000.000-00"
                          {...register("cpf")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rg">RG</Label>
                        <Input
                          id="rg"
                          placeholder="Número do RG"
                          {...register("rg")}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Certidão de Nascimento</Label>
                      <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                        {birthCertificateFile ? (
                          <div className="flex items-center justify-center gap-4">
                            {birthCertificatePreview ? (
                              <img src={birthCertificatePreview} alt="Preview" className="h-20 w-20 object-cover rounded" />
                            ) : (
                              <FileText className="h-12 w-12 text-muted-foreground" />
                            )}
                            <div className="text-left">
                              <p className="font-medium text-sm">{birthCertificateFile.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(birthCertificateFile.size / 1024).toFixed(1)} KB
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setBirthCertificateFile(null);
                                  setBirthCertificatePreview(null);
                                }}
                                className="text-xs text-destructive hover:underline mt-1"
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="cursor-pointer">
                            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Clique para fazer upload da certidão
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              JPG, PNG, WebP ou PDF (máx. 5MB)
                            </p>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={handleBirthCertificateChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="susCard">Cartão SUS</Label>
                      <Input
                        id="susCard"
                        placeholder="Número do Cartão SUS"
                        {...register("susCard")}
                      />
                    </div>

                    <div className="flex justify-between">
                      <Button type="button" variant="outline" onClick={() => setActiveTab("address")}>
                        Anterior
                      </Button>
                      <Button type="button" onClick={() => setActiveTab("health")}>
                        Próximo
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Health Tab */}
              <TabsContent value="health">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-primary" />
                      Informações de Saúde
                    </CardTitle>
                    <CardDescription>
                      Dados médicos importantes para o cuidado da criança
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="allergies">Alergias</Label>
                      <Textarea
                        id="allergies"
                        placeholder="Descreva as alergias da criança (alimentares, medicamentosas, etc.)"
                        {...register("allergies")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="medications">Medicamentos de Uso Contínuo</Label>
                      <Textarea
                        id="medications"
                        placeholder="Liste os medicamentos que a criança toma regularmente"
                        {...register("medications")}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="continuousDoctors">Médicos de Acompanhamento</Label>
                        <Textarea
                          id="continuousDoctors"
                          placeholder="Nome e especialidade dos médicos que acompanham a criança"
                          {...register("continuousDoctors")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="privateDoctors">Médicos Particulares</Label>
                        <Textarea
                          id="privateDoctors"
                          placeholder="Nome e telefone de médicos particulares"
                          {...register("privateDoctors")}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button type="button" variant="outline" onClick={() => setActiveTab("documents")}>
                        Anterior
                      </Button>
                      <Button type="button" onClick={() => setActiveTab("enrollment")}>
                        Próximo
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>


              {/* Enrollment Type Tab */}
              <TabsContent value="enrollment">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Tipo de Vaga e Plano
                    </CardTitle>
                    <CardDescription>
                      {preEnrollmentData?.vacancy_type
                        ? "O tipo de vaga foi definido na pré-matrícula"
                        : "Informe a origem da vaga e o plano desejado"
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Enrollment Type - Show selection only if NOT from pre-enrollment */}
                    {preEnrollmentData?.vacancy_type ? (
                      <div className="space-y-4">
                        <Label className="text-base font-medium">Tipo de Vaga</Label>
                        <div className="bg-secondary/50 rounded-lg p-4 border border-primary/30">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            <div>
                              <p className="font-medium">
                                {selectedEnrollmentType === "municipal" ? "Vaga da Prefeitura" : "Vaga Particular"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Definido automaticamente pela pré-matrícula
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Label className="text-base font-medium">Tipo de Vaga *</Label>
                        <Controller
                          name="enrollmentType"
                          control={control}
                          render={({ field }) => (
                            <RadioGroup
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                if (value === "municipal") {
                                  setValue("planType", undefined);
                                }
                              }}
                              className="grid gap-4"
                            >
                              <div className="flex items-start space-x-4 border rounded-lg p-4 hover:border-primary/50 transition-colors">
                                <RadioGroupItem value="municipal" id="municipal" />
                                <div className="flex-1">
                                  <Label htmlFor="municipal" className="text-base font-medium cursor-pointer">
                                    Vaga da Prefeitura
                                  </Label>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    A criança possui vaga cedida pela prefeitura municipal.
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-start space-x-4 border rounded-lg p-4 hover:border-primary/50 transition-colors">
                                <RadioGroupItem value="private" id="private" />
                                <div className="flex-1">
                                  <Label htmlFor="private" className="text-base font-medium cursor-pointer">
                                    Vaga Particular
                                  </Label>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Matrícula particular diretamente com a creche.
                                  </p>
                                </div>
                              </div>
                            </RadioGroup>
                          )}
                        />
                        {errors.enrollmentType && (
                          <p className="text-sm text-destructive">{errors.enrollmentType.message}</p>
                        )}
                      </div>
                    )}

                    {/* Plan Selection - Only for Private */}
                    {selectedEnrollmentType === "private" && (
                      <div className="space-y-4 pt-4 border-t">
                        {/* Estimated Class Badge */}
                        {watchedBirthDate && (
                          <div className="bg-secondary/50 rounded-lg p-4 border">
                            <div className="flex items-center gap-2">
                              <Baby className="h-5 w-5 text-primary" />
                              <div>
                                <p className="text-sm font-medium">
                                  Turma estimada: <Badge variant="secondary" className="ml-1">{estimatedClassName}</Badge>
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Baseado na data de nascimento informada. Os valores abaixo são para esta turma.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Manual Coupon Input */}
                        {!coupon && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-2">
                              <Tag className="h-4 w-4" />
                              Cupom de Desconto
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Digite o código do cupom"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                className="flex-1 font-mono uppercase"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  if (couponCode.trim()) {
                                    validateCoupon(couponCode.trim());
                                  }
                                }}
                                disabled={isValidatingCoupon || !couponCode.trim()}
                              >
                                {isValidatingCoupon ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Aplicar"
                                )}
                              </Button>
                            </div>
                            {couponError && (
                              <p className="text-sm text-destructive">{couponError}</p>
                            )}
                          </div>
                        )}

                        {/* Coupon Display (when applied) */}
                        {coupon && (
                          <div className="bg-primary/10 rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Tag className="h-5 w-5 text-primary" />
                                <div>
                                  <p className="font-medium text-foreground">Cupom Aplicado!</p>
                                  <p className="text-xs text-muted-foreground">
                                    Código: <span className="font-mono font-semibold">{coupon.code}</span>
                                  </p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  clearCoupon();
                                  setCouponCode("");
                                  setCouponAutoApplied(false);
                                }}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Remover
                              </Button>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-primary">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>
                                {coupon.discount_type === "percentage"
                                  ? `${coupon.discount_value}% de desconto aplicado`
                                  : `R$ ${coupon.discount_value.toFixed(2)} de desconto aplicado`
                                }
                              </span>
                            </div>
                          </div>
                        )}

                        <Label className="text-base font-medium">Plano Desejado *</Label>
                        <p className="text-sm text-muted-foreground">
                          Selecione o plano que melhor atende às necessidades da sua família.
                        </p>

                        <Controller
                          name="planType"
                          control={control}
                          render={({ field }) => (
                            <RadioGroup
                              value={field.value}
                              onValueChange={field.onChange}
                              className="grid gap-4"
                            >
                              {/* Plano Básico */}
                              {(() => {
                                const price = getPlanPrice("basico");
                                const hasDiscount = price.discountAmount > 0;
                                const basePrice = getBasePriceForPlan("basico");
                                return (
                                  <div className={`flex items-start space-x-4 border-2 rounded-lg p-4 transition-colors ${field.value === 'basico' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'}`}>
                                    <RadioGroupItem value="basico" id="basico" />
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between">
                                        <Label htmlFor="basico" className="text-base font-medium cursor-pointer">
                                          Plano Básico
                                        </Label>
                                        <div className="text-right">
                                          {hasDiscount && (
                                            <span className="text-sm text-muted-foreground line-through mr-2">
                                              {formatCurrency(basePrice)}
                                            </span>
                                          )}
                                          <span className={`text-lg font-bold ${hasDiscount ? 'text-primary' : ''}`}>
                                            {formatCurrency(price.discountedPrice)}
                                          </span>
                                          <span className="text-xs text-muted-foreground">/mês</span>
                                        </div>
                                      </div>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        Meio período - 5 horas diárias (Manhã ou Tarde)
                                      </p>
                                      <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                                        <li>• Manhã (7h às 12h) ou Tarde (13h às 18h)</li>
                                        <li>• 2 refeições incluídas</li>
                                        <li>• Atividades pedagógicas e recreação</li>
                                      </ul>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Plano Intermediário */}
                              {(() => {
                                const price = getPlanPrice("intermediario");
                                const hasDiscount = price.discountAmount > 0;
                                const basePrice = getBasePriceForPlan("intermediario");
                                return (
                                  <div className={`relative flex items-start space-x-4 border-2 rounded-lg p-4 transition-colors ${field.value === 'intermediario' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'}`}>
                                    <div className="absolute -top-3 right-4 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                                      Popular
                                    </div>
                                    <RadioGroupItem value="intermediario" id="intermediario" />
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between">
                                        <Label htmlFor="intermediario" className="text-base font-medium cursor-pointer">
                                          Plano Intermediário
                                        </Label>
                                        <div className="text-right">
                                          {hasDiscount && (
                                            <span className="text-sm text-muted-foreground line-through mr-2">
                                              {formatCurrency(basePrice)}
                                            </span>
                                          )}
                                          <span className={`text-lg font-bold ${hasDiscount ? 'text-primary' : ''}`}>
                                            {formatCurrency(price.discountedPrice)}
                                          </span>
                                          <span className="text-xs text-muted-foreground">/mês</span>
                                        </div>
                                      </div>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        Período integral - 9 horas diárias
                                      </p>
                                      <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                                        <li>• 9 horas de permanência com flexibilidade</li>
                                        <li>• Todas as refeições incluídas</li>
                                        <li>• Atividades extras (Ballet, Capoeira, Música)</li>
                                      </ul>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Plano Plus+ */}
                              {(() => {
                                const price = getPlanPrice("plus");
                                const hasDiscount = price.discountAmount > 0;
                                const basePrice = getBasePriceForPlan("plus");
                                return (
                                  <div className={`flex items-start space-x-4 border-2 rounded-lg p-4 transition-colors ${field.value === 'plus' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'}`}>
                                    <RadioGroupItem value="plus" id="plus" />
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between">
                                        <Label htmlFor="plus" className="text-base font-medium cursor-pointer">
                                          Plano Plus+
                                        </Label>
                                        <div className="text-right">
                                          {hasDiscount && (
                                            <span className="text-sm text-muted-foreground line-through mr-2">
                                              {formatCurrency(basePrice)}
                                            </span>
                                          )}
                                          <span className={`text-lg font-bold ${hasDiscount ? 'text-primary' : ''}`}>
                                            {formatCurrency(price.discountedPrice)}
                                          </span>
                                          <span className="text-xs text-muted-foreground">/mês</span>
                                        </div>
                                      </div>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        Integral estendido - até 10 horas diárias
                                      </p>
                                      <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                                        <li>• Tudo do Plano Intermediário</li>
                                        <li>• Flexibilidade total de horário</li>
                                        <li>• Acompanhamento pedagógico exclusivo</li>
                                      </ul>
                                    </div>
                                  </div>
                                );
                              })()}
                            </RadioGroup>
                          )}
                        />
                        {errors.planType && (
                          <p className="text-sm text-destructive">{errors.planType.message}</p>
                        )}

                        {/* Estimated class info */}
                        <p className="text-xs text-muted-foreground italic">
                          * Valores estimados para turma de {estimatedClassName} com base na data de nascimento informada. O valor final será confirmado pela escola.
                        </p>
                      </div>
                    )}

                    <div className="flex justify-between pt-4">
                      <Button type="button" variant="outline" onClick={() => setActiveTab("health")}>
                        Anterior
                      </Button>
                      <Button type="submit" disabled={isSubmitting || (selectedEnrollmentType === "private" && !watch("planType"))} className="min-w-[160px]">
                        {isSubmitting ? (
                          <span className="flex items-center">
                            <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-background mr-2"></span>
                            Enviando...
                          </span>
                        ) : (
                          <>
                            Enviar Cadastro
                            <CheckCircle2 className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
};

export default ChildRegistration;
