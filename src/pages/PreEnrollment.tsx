import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Baby, BookOpen, Users, Sun, Moon, Clock, FileText, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const preEnrollmentSchema = z.object({
  parent_name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(100, "Nome muito longo"),
  email: z.string().trim().email("Email inválido").max(255, "Email muito longo"),
  phone: z.string().trim().min(10, "Telefone inválido").max(20, "Telefone muito longo"),
  child_name: z.string().trim().min(2, "Nome da criança deve ter pelo menos 2 caracteres").max(100, "Nome muito longo"),
  child_birth_date: z.string().min(1, "Data de nascimento é obrigatória"),
  desired_class_type: z.enum(["bercario", "maternal", "jardim"], { required_error: "Selecione uma turma" }),
  desired_shift_type: z.enum(["manha", "tarde", "integral"], { required_error: "Selecione um turno" }),
  how_heard_about: z.string().max(200, "Texto muito longo").optional(),
  notes: z.string().max(1000, "Texto muito longo").optional(),
});

type PreEnrollmentFormData = z.infer<typeof preEnrollmentSchema>;

const classOptions = [
  { value: "bercario", label: "Berçário (0-1 ano)", icon: Baby },
  { value: "maternal", label: "Maternal (1-3 anos)", icon: BookOpen },
  { value: "jardim", label: "Jardim (4-6 anos)", icon: Users },
];

const shiftOptions = [
  { value: "manha", label: "Manhã (7h às 11h)", icon: Sun },
  { value: "tarde", label: "Tarde (15h às 19h)", icon: Moon },
  { value: "integral", label: "Integral (até 8h)", icon: Clock },
];

const howHeardOptions = [
  "Indicação de amigo/familiar",
  "Instagram",
  "Facebook",
  "Google",
  "Passei em frente à escola",
  "Outro",
];

export default function PreEnrollment() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<PreEnrollmentFormData>({
    resolver: zodResolver(preEnrollmentSchema),
    defaultValues: {
      parent_name: "",
      email: "",
      phone: "",
      child_name: "",
      child_birth_date: "",
      how_heard_about: "",
      notes: "",
    },
  });

  const onSubmit = async (data: PreEnrollmentFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("pre_enrollments").insert({
        parent_name: data.parent_name,
        email: data.email,
        phone: data.phone,
        child_name: data.child_name,
        child_birth_date: data.child_birth_date,
        desired_class_type: data.desired_class_type,
        desired_shift_type: data.desired_shift_type,
        how_heard_about: data.how_heard_about || null,
        notes: data.notes || null,
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
                <p className="text-lg text-muted-foreground mb-8">
                  Recebemos sua solicitação de pré-matrícula. Nossa equipe entrará em contato 
                  em breve para agendar uma visita e dar continuidade ao processo.
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
                        </div>

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

                        <div className="grid md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="desired_class_type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Turma Desejada *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione a turma" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {classOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        <div className="flex items-center gap-2">
                                          <option.icon className="w-4 h-4" />
                                          {option.label}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="desired_shift_type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Turno Desejado *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione o turno" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {shiftOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        <div className="flex items-center gap-2">
                                          <option.icon className="w-4 h-4" />
                                          {option.label}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="space-y-4 pt-4 border-t">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-primary" />
                          Informações Adicionais
                        </h3>

                        <FormField
                          control={form.control}
                          name="how_heard_about"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Como conheceu a Pimpolinhos?</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma opção" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {howHeardOptions.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Observações</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Alguma informação adicional que gostaria de compartilhar?"
                                  rows={4}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
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
