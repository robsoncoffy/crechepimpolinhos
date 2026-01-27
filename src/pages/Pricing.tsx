import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  MessageCircle, 
  Star, 
  Baby, 
  Users, 
  BookOpen,
  Clock,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { PLANS, GHL_WHATSAPP_LINK, formatCurrency } from "@/lib/pricing";

const classCards = [
  {
    id: 'bercario' as const,
    name: 'Berçário',
    ageRange: '0 a 1 ano',
    icon: Baby,
    color: 'bg-pimpo-blue',
  },
  {
    id: 'maternal' as const,
    name: 'Maternal',
    ageRange: '1 a 3 anos',
    icon: Users,
    color: 'bg-pimpo-red',
  },
  {
    id: 'jardim' as const,
    name: 'Jardim',
    ageRange: '4 a 6 anos',
    icon: BookOpen,
    color: 'bg-pimpo-green',
  },
];

export default function Pricing() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 text-primary font-semibold mb-4">
              <Sparkles className="w-5 h-5" />
              <span>Nossos Planos</span>
            </div>
            <h1 className="font-fredoka text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Escolha o plano ideal para seu{" "}
              <span className="text-primary">Pimpolho</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Oferecemos planos flexíveis que se adaptam às necessidades da sua família.
              Entre em contato para conhecer os valores e condições especiais.
            </p>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section className="py-20">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PLANS.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
                  plan.highlight 
                    ? 'border-primary shadow-lg scale-105 lg:scale-110' 
                    : 'border-muted hover:border-primary/50'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute top-0 right-0 left-0 bg-primary text-primary-foreground text-center py-2 text-sm font-semibold">
                    <Star className="w-4 h-4 inline mr-1" />
                    Mais Popular
                  </div>
                )}
                
                <CardHeader className={plan.highlight ? 'pt-12' : ''}>
                  <CardTitle className="font-fredoka text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Price */}
                  <div className="text-center py-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Valor mensal</p>
                    <p className="font-fredoka text-2xl font-bold text-primary">
                      A partir de {plan.startingPrice ? formatCurrency(plan.startingPrice) : 'Consultar'}
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-pimpo-green flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Note */}
                  {plan.note && (
                    <p className="text-xs text-muted-foreground italic">{plan.note}</p>
                  )}

                  {/* CTA */}
                  <Button 
                    className="w-full gap-2" 
                    variant={plan.highlight ? 'default' : 'outline'}
                    asChild
                  >
                    <a href={GHL_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-4 h-4" />
                      Consultar Valores
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Classes Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Turmas por Faixa Etária
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Valores variam de acordo com a turma. Cada faixa etária possui necessidades 
              específicas de cuidado e desenvolvimento.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {classCards.map((cls) => (
              <Card key={cls.id} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className={`w-16 h-16 ${cls.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <cls.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="font-fredoka text-xl">{cls.name}</CardTitle>
                  <CardDescription>{cls.ageRange}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="gap-2" asChild>
                    <a href={GHL_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                      Consultar valores
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="font-fredoka text-3xl lg:text-4xl font-bold mb-4">
            Pronto para matricular seu Pimpolho?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Entre em contato conosco para conhecer nossos valores, tirar dúvidas 
            e agendar uma visita à nossa estrutura.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" variant="secondary" className="gap-2" asChild>
              <a href={GHL_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-5 h-5" />
                Falar pelo WhatsApp
              </a>
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-primary" asChild>
              <Link to="/pre-matricula">
                Fazer Pré-Matrícula
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
