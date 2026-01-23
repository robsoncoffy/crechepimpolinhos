import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Baby, FileText, Building2, Landmark, Users, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

const preEnrollmentSchema = z.object({
  parent_name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(100, "Nome muito longo"),
  cpf: z.string().trim().min(1, "CPF é obrigatório").regex(cpfRegex, "CPF inválido (formato: 000.000.000-00)"),
  email: z.string().trim().min(1, "E-mail é obrigatório").email("Email inválido").max(255, "Email muito longo"),
  phone: z.string().trim().min(10, "Telefone inválido").max(20, "Telefone muito longo"),
  child_name: z.string().trim().min(2, "Nome da criança deve ter pelo menos 2 caracteres").max(100, "Nome muito longo"),
  child_birth_date: z.string().min(1, "Data de nascimento é obrigatória"),
  vacancy_type: z.enum(["municipal", "particular"], { required_error: "Selecione o tipo de vaga" }),
  acceptTerms: z.boolean().refine(val => val === true, { message: "Você deve aceitar os termos para continuar" }),
});

type PreEnrollmentFormData = z.infer<typeof preEnrollmentSchema>;

const vacancyTypeOptions = [
  { value: "particular", label: "Vaga Particular", description: "Matrícula privada com mensalidade", icon: Building2 },
  { value: "municipal", label: "Vaga da Prefeitura", description: "Vaga conveniada com a prefeitura", icon: Landmark },
];

export default function PreEnrollment() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<PreEnrollmentFormData>({
    resolver: zodResolver(preEnrollmentSchema),
    defaultValues: {
      parent_name: "",
      cpf: "",
      email: "",
      phone: "",
      child_name: "",
      child_birth_date: "",
      vacancy_type: undefined,
      acceptTerms: false,
    },
  });

  const onSubmit = async (data: PreEnrollmentFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("pre_enrollments").insert({
        parent_name: data.parent_name,
        cpf: data.cpf,
        email: data.email,
        phone: data.phone,
        child_name: data.child_name,
        child_birth_date: data.child_birth_date,
        desired_class_type: "bercario",
        desired_shift_type: "integral",
        vacancy_type: data.vacancy_type,
      });

      if (error) throw error;

      setIsSuccess(true);
      toast.success("Pré-matrícula enviada com sucesso!");
    } catch (error: any) {
      console.error("Error submitting pre-enrollment:", error);
      toast.error("Erro ao enviar pré-matrícula. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <PublicLayout>
        <section className="py-20 lg:py-28">
          <div className="container">
            <Card className="max-w-2xl mx-auto text-center">
              <CardContent className="pt-12 pb-8">
                <div className="w-20 h-20 bg-pimpo-green rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h2 className="font-fredoka text-3xl font-bold text-foreground mb-4">
                  Pré-Matrícula Enviada!
                </h2>
                <p className="text-lg text-muted-foreground mb-4">
                  Recebemos sua solicitação de pré-matrícula. Nossa equipe analisará seu pedido e, caso aprovado, você receberá um email com o link para completar o cadastro.
                </p>
                <p className="text-base text-muted-foreground mb-8 flex items-center justify-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <span className="font-medium">Fique de olho na sua caixa de entrada!</span>
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button asChild>
                    <Link to="/">Voltar ao Início</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/turmas">Ver Turmas</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative py-16 lg:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pimpo-yellow-light via-background to-pimpo-green-light" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-pimpo-blue/20 rounded-full blur-3xl" />
        
        <div className="container relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
            <FileText className="w-4 h-4 text-primary" />
            <span className="font-semibold text-primary">Garanta a Vaga</span>
          </div>
          <h1 className="font-fredoka text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Pré-Matrícula Online
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Preencha o formulário abaixo para iniciar o processo de matrícula 
            do seu filho na Creche Pimpolinhos.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 lg:py-16">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Form Card */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="font-fredoka text-2xl">Dados para Pré-Matrícula</CardTitle>
                  <CardDescription>
                    Preencha todos os campos obrigatórios (*) para enviar sua solicitação.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Parent Info */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Users className="w-5 h-5 text-primary" />
                          Dados do Responsável
                        </h3>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="parent_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome Completo *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Seu nome completo" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="cpf"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CPF *</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="000.000.000-00" 
                                    {...field}
                                    onChange={(e) => {
                                      let value = e.target.value.replace(/\D/g, '');
                                      if (value.length > 11) value = value.slice(0, 11);
                                      if (value.length > 9) {
                                        value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
                                      } else if (value.length > 6) {
                                        value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`;
                                      } else if (value.length > 3) {
                                        value = `${value.slice(0, 3)}.${value.slice(3)}`;
                                      }
                                      field.onChange(value);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefone/WhatsApp *</FormLabel>
                                <FormControl>
                                  <Input placeholder="(51) 99999-9999" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email *</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="seu@email.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Child Info */}
                      <div className="space-y-4 pt-4 border-t">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Baby className="w-5 h-5 text-primary" />
                          Dados da Criança
                        </h3>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="child_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome da Criança *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Nome completo da criança" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="child_birth_date"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Data de Nascimento *</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Vacancy Type Selection */}
                        <FormField
                          control={form.control}
                          name="vacancy_type"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel>Tipo de Vaga *</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                >
                                  {vacancyTypeOptions.map((option) => (
                                    <div key={option.value}>
                                      <RadioGroupItem
                                        value={option.value}
                                        id={option.value}
                                        className="peer sr-only"
                                      />
                                      <label
                                        htmlFor={option.value}
                                        className="flex items-center gap-4 rounded-lg border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                                      >
                                        <option.icon className="h-6 w-6 text-primary" />
                                        <div className="flex-1">
                                          <p className="font-semibold">{option.label}</p>
                                          <p className="text-sm text-muted-foreground">
                                            {option.description}
                                          </p>
                                        </div>
                                      </label>
                                    </div>
                                  ))}
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Terms Acceptance */}
                      <div className="pt-4 border-t">
                        <FormField
                          control={form.control}
                          name="acceptTerms"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  Li e concordo com a{" "}
                                  <Link to="/politica-privacidade" target="_blank" className="text-primary hover:underline font-medium">
                                    Política de Privacidade
                                  </Link>
                                  ,{" "}
                                  <Link to="/lgpd" target="_blank" className="text-primary hover:underline font-medium">
                                    LGPD
                                  </Link>
                                  {" "}e{" "}
                                  <Link to="/termos-uso" target="_blank" className="text-primary hover:underline font-medium">
                                    Termos de Uso
                                  </Link>
                                  . *
                                </FormLabel>
                                <FormMessage />
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? "Enviando..." : "Enviar Pré-Matrícula"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="bg-primary text-primary-foreground">
                <CardContent className="pt-6">
                  <h3 className="font-fredoka text-xl font-bold mb-4">Próximos Passos</h3>
                  <ol className="space-y-4">
                    {[
                      "Envie o formulário de pré-matrícula",
                      "Nossa equipe entrará em contato",
                      "Agende uma visita à escola",
                      "Finalize a matrícula presencialmente",
                    ].map((step, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                        <span className="text-sm">{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">Documentos Necessários</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-pimpo-green" />
                      Certidão de nascimento
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-pimpo-green" />
                      Carteira de vacinação
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-pimpo-green" />
                      RG e CPF dos responsáveis
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-pimpo-green" />
                      Comprovante de residência
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-pimpo-green" />
                      Fotos 3x4 da criança
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">Dúvidas?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Entre em contato pelo WhatsApp para tirar suas dúvidas.
                  </p>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="https://wa.me/5551989965423" target="_blank" rel="noopener noreferrer">
                      WhatsApp
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
