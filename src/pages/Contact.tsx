import { useState } from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Instagram,
  MessageCircle,
  Loader2,
  Send,
  ChevronRight,
} from "lucide-react";
import { z } from "zod";
import playgroundImage from "@/assets/playground.jpg";

const contactSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  message: z.string().min(10, "Mensagem deve ter no mínimo 10 caracteres"),
});

const contactInfo = [
  {
    icon: Phone,
    title: "Telefone / WhatsApp",
    value: "(51) 98996-5423",
    href: "tel:5198996-5423",
    color: "bg-pimpo-green",
  },
  {
    icon: MapPin,
    title: "Endereço",
    value: "Rua Coronel Camisão, 495 - Harmonia, Canoas/RS",
    href: "https://maps.google.com/?q=Creche+Infantil+Pimpolinhos",
    color: "bg-pimpo-blue",
  },
  {
    icon: Clock,
    title: "Horário",
    value: "Segunda a Sexta, 7h às 19h",
    color: "bg-pimpo-yellow",
  },
  {
    icon: Instagram,
    title: "Instagram",
    value: "@crechepimpolinhos",
    href: "https://instagram.com/crechepimpolinhos",
    color: "bg-pimpo-red",
  },
];

export default function Contact() {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("contact_submissions")
        .insert({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          message: formData.message,
        });

      if (error) throw error;

      toast({
        title: "Mensagem enviada!",
        description: "Entraremos em contato em breve.",
      });

      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (error) {
      toast({
        title: "Erro ao enviar",
        description: "Tente novamente ou entre em contato por WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pimpo-red-light via-background to-pimpo-yellow-light" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-pimpo-blue/20 rounded-full blur-3xl" />
        
        <div className="container relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="font-semibold text-primary">Fale Conosco</span>
          </div>
          <h1 className="font-fredoka text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Entre em Contato
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Estamos prontos para atender você! Agende uma visita ou tire suas dúvidas.
          </p>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="py-12 -mt-8 relative z-10">
        <div className="container">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {contactInfo.map((info) => (
              <Card key={info.title} className="border-0 shadow-xl hover:shadow-2xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 ${info.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <info.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{info.title}</p>
                      {info.href ? (
                        <a
                          href={info.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors text-sm"
                        >
                          {info.value}
                        </a>
                      ) : (
                        <p className="text-muted-foreground text-sm">{info.value}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Form */}
            <Card className="border-0 shadow-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="font-fredoka text-2xl flex items-center gap-2">
                  <Send className="w-6 h-6 text-primary" />
                  Envie uma Mensagem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Seu nome"
                        value={formData.name}
                        onChange={handleChange}
                        className={`h-12 ${errors.name ? "border-destructive" : ""}`}
                      />
                      {errors.name && (
                        <p className="text-sm text-destructive">{errors.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="(51) 99999-9999"
                        value={formData.phone}
                        onChange={handleChange}
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      className={`h-12 ${errors.email ? "border-destructive" : ""}`}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Mensagem *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Como podemos ajudar? Conte-nos sobre seu interesse..."
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      className={errors.message ? "border-destructive" : ""}
                    />
                    {errors.message && (
                      <p className="text-sm text-destructive">{errors.message}</p>
                    )}
                  </div>

                  <Button type="submit" size="lg" className="w-full h-12 text-lg" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Enviar Mensagem
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Map & WhatsApp */}
            <div className="space-y-6">
              {/* WhatsApp CTA */}
              <Card className="bg-pimpo-green text-white border-0 shadow-xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid sm:grid-cols-2">
                    <div className="p-8 flex flex-col justify-center">
                      <MessageCircle className="w-12 h-12 mb-4" />
                      <h3 className="font-fredoka text-2xl font-bold mb-2">
                        Prefere WhatsApp?
                      </h3>
                      <p className="opacity-90 mb-4">
                        Respondemos rapidamente! Clique e fale com a gente.
                      </p>
                      <Button
                        variant="secondary"
                        size="lg"
                        asChild
                      >
                        <a
                          href="https://wa.me/5551989965423"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Abrir WhatsApp
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </a>
                      </Button>
                    </div>
                    <div className="hidden sm:block">
                      <img
                        src={playgroundImage}
                        alt="Playground"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Map */}
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="font-fredoka text-xl flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Nossa Localização
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3455.5!2d-51.1954345!3d-29.9130559!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95197b4ef5aa2b9b%3A0xb0159c2f58ea1f8c!2sCreche%20Infantil%20Pimpolinhos!5e0!3m2!1spt-BR!2sbr!4v1234567890"
                    width="100%"
                    height="300"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Localização Creche Pimpolinhos"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
