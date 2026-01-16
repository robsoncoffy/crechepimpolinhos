import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Baby,
  BookOpen,
  Music,
  Users,
  Shield,
  Heart,
  CalendarDays,
  MessageCircle,
  ChevronRight,
  Star,
} from "lucide-react";
import bannerImage from "@/assets/banner-pimpolinhos-1.png";

const features = [
  {
    icon: Baby,
    title: "Berçário",
    description: "Cuidado especial para bebês de 0 a 1 ano",
    color: "pimpo-blue",
  },
  {
    icon: BookOpen,
    title: "Maternal",
    description: "Desenvolvimento para crianças de 1 a 3 anos",
    color: "pimpo-red",
  },
  {
    icon: Users,
    title: "Jardim",
    description: "Preparação para crianças de 4 a 6 anos",
    color: "pimpo-green",
  },
  {
    icon: Music,
    title: "Atividades Extras",
    description: "Inglês, Ballet, Capoeira, Música e Ed. Física",
    color: "pimpo-yellow",
  },
];

const benefits = [
  {
    icon: Shield,
    title: "Segurança",
    description: "Ambiente seguro e monitorado para seu filho",
  },
  {
    icon: Heart,
    title: "Carinho",
    description: "Equipe dedicada e apaixonada por educar",
  },
  {
    icon: CalendarDays,
    title: "Agenda Digital",
    description: "Acompanhe o dia a dia do seu filho em tempo real",
  },
  {
    icon: MessageCircle,
    title: "Comunicação",
    description: "Chat direto com os professores da escola",
  },
];

export default function Home() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-pimpo-blue-light via-background to-pimpo-yellow-light">
        <div className="container py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-secondary px-4 py-2 rounded-full">
                <Star className="w-4 h-4 text-pimpo-yellow fill-pimpo-yellow" />
                <span className="font-semibold text-secondary-foreground">
                  Educação Infantil de Qualidade
                </span>
              </div>

              <h1 className="font-fredoka text-4xl lg:text-6xl font-bold text-foreground leading-tight">
                Colorindo a infância com{" "}
                <span className="text-primary">cuidado</span> e{" "}
                <span className="text-pimpo-yellow">alegria!</span>
              </h1>

              <p className="text-lg text-muted-foreground">
                Na Creche Pimpolinhos, seu filho recebe todo o carinho e atenção
                que merece. Oferecemos educação infantil completa com
                acompanhamento diário via agenda digital.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button size="lg" asChild>
                  <Link to="/auth?mode=signup">
                    Área dos Pais
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/contato">Agende uma Visita</Link>
                </Button>
              </div>

              <div className="flex items-center gap-6 pt-4">
                <div className="text-center">
                  <p className="font-fredoka text-3xl font-bold text-primary">7h-19h</p>
                  <p className="text-sm text-muted-foreground">Funcionamento</p>
                </div>
                <div className="w-px h-12 bg-border" />
                <div className="text-center">
                  <p className="font-fredoka text-3xl font-bold text-pimpo-green">3</p>
                  <p className="text-sm text-muted-foreground">Turmas</p>
                </div>
                <div className="w-px h-12 bg-border" />
                <div className="text-center">
                  <p className="font-fredoka text-3xl font-bold text-pimpo-red">+5</p>
                  <p className="text-sm text-muted-foreground">Atividades</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-pimpo-blue via-pimpo-green to-pimpo-yellow rounded-3xl blur-2xl opacity-20" />
              <img
                src={bannerImage}
                alt="Crianças felizes na Creche Pimpolinhos"
                className="relative rounded-3xl shadow-2xl w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Turmas Section */}
      <section className="py-16 lg:py-24 bg-card">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Nossas Turmas
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Oferecemos turmas para todas as idades, do berçário ao jardim, com
              opções de meio período e período integral.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/30"
              >
                <CardContent className="p-6 text-center">
                  <div
                    className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-${feature.color}-light mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className={`w-8 h-8 text-${feature.color}`} />
                  </div>
                  <h3 className="font-fredoka text-xl font-bold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link to="/turmas">
                Ver todas as turmas
                <ChevronRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Agenda Digital Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-pimpo-blue to-primary text-primary-foreground">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="font-fredoka text-3xl lg:text-4xl font-bold">
                Agenda Digital Exclusiva
              </h2>
              <p className="text-lg opacity-90">
                Acompanhe cada momento do dia do seu filho através da nossa
                agenda digital. Receba atualizações sobre refeições, sono,
                atividades e muito mais!
              </p>

              <ul className="space-y-4">
                {[
                  "Registro diário de refeições e sono",
                  "Acompanhamento mensal de peso e altura",
                  "Chat direto com os professores",
                  "Notificações por email",
                  "Histórico completo de atividades",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                      <ChevronRight className="w-4 h-4 text-secondary-foreground" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                variant="secondary"
                className="text-secondary-foreground"
                asChild
              >
                <Link to="/auth?mode=signup">
                  Criar minha conta
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-colors"
                >
                  <benefit.icon className="w-10 h-10 mb-4 text-secondary" />
                  <h3 className="font-fredoka text-lg font-bold mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-sm opacity-80">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="pimpo-card p-8 lg:p-12 text-center bg-gradient-to-br from-pimpo-yellow-light to-pimpo-green-light">
            <h2 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Venha conhecer a Pimpolinhos!
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Agende uma visita e conheça nossa estrutura, equipe e metodologia.
              Estamos prontos para receber sua família!
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" asChild>
                <Link to="/contato">Agendar Visita</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a
                  href="https://wa.me/5551989965423"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
