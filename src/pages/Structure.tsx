import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Building,
  Utensils,
  TreePine,
  ShieldCheck,
  Sparkles,
  Baby,
  BookOpen,
  Gamepad2,
  Camera,
  Heart,
  ThermometerSun,
  Wifi,
  ChevronRight,
} from "lucide-react";
import playgroundImage from "@/assets/playground.jpg";
import nurseryImage from "@/assets/nursery-room.jpg";
import eatingImage from "@/assets/kids-eating.jpg";
import craftsImage from "@/assets/kids-crafts.jpg";

const facilities = [
  {
    icon: Building,
    title: "Salas de Aula",
    description: "Ambientes climatizados, coloridos e adaptados para cada faixa etária, com mobiliário ergonômico.",
    image: craftsImage,
  },
  {
    icon: Utensils,
    title: "Refeitório",
    description: "Espaço adequado para refeições com cardápio balanceado elaborado por nutricionista.",
    image: eatingImage,
  },
  {
    icon: TreePine,
    title: "Área Externa",
    description: "Playground seguro com piso emborrachado e brinquedos adequados para diferentes idades.",
    image: playgroundImage,
  },
  {
    icon: Baby,
    title: "Berçário",
    description: "Ambiente tranquilo com berços individuais, fraldário completo e área de estimulação.",
    image: nurseryImage,
  },
];

const features = [
  {
    icon: ShieldCheck,
    title: "Segurança 24h",
    description: "Monitoramento por câmeras e controle de acesso rigoroso.",
  },
  {
    icon: Sparkles,
    title: "Limpeza Rigorosa",
    description: "Higienização constante de todos os ambientes.",
  },
  {
    icon: ThermometerSun,
    title: "Climatização",
    description: "Todas as salas com ar-condicionado e ventilação.",
  },
  {
    icon: Wifi,
    title: "Tecnologia",
    description: "Recursos digitais para atividades educativas.",
  },
  {
    icon: Heart,
    title: "Equipe Acolhedora",
    description: "Profissionais qualificados e apaixonados.",
  },
];

export default function Structure() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pimpo-yellow-light via-background to-pimpo-green-light" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-pimpo-blue/20 rounded-full blur-3xl" />
        
        <div className="container relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
            <Building className="w-4 h-4 text-primary" />
            <span className="font-semibold text-primary">Infraestrutura Completa</span>
          </div>
          <h1 className="font-fredoka text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Nossa Estrutura
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Conheça os espaços preparados com carinho para oferecer o melhor 
            ambiente para o desenvolvimento do seu filho.
          </p>
        </div>
      </section>

      {/* Main Facilities */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8">
            {facilities.map((facility, index) => (
              <Card
                key={facility.title}
                className="group overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500"
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={facility.image}
                    alt={facility.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                        <facility.icon className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <h3 className="font-fredoka text-2xl font-bold text-white">
                        {facility.title}
                      </h3>
                    </div>
                    <p className="text-white/90">{facility.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="font-fredoka text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Diferenciais da Nossa Estrutura
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Cada detalhe foi pensado para garantir segurança, conforto e 
              aprendizado das crianças.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-8">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-fredoka text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 text-primary font-semibold">
                <Building className="w-5 h-5" />
                <span>Localização</span>
              </div>
              <h2 className="font-fredoka text-4xl lg:text-5xl font-bold text-foreground">
                Fácil Acesso em Canoas
              </h2>
              <p className="text-lg text-muted-foreground">
                Estamos localizados no bairro Harmonia, em um local tranquilo e de fácil 
                acesso, com estacionamento para pais.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-muted rounded-xl">
                  <Building className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold">Endereço</p>
                    <p className="text-muted-foreground">
                      Rua Coronel Camisão, 495 - Harmonia, Canoas/RS
                    </p>
                    <p className="text-muted-foreground">CEP: 92310-020</p>
                  </div>
                </div>
              </div>

              <Button size="lg" asChild>
                <a
                  href="https://maps.google.com/?q=Creche+Infantil+Pimpolinhos+Canoas"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver no Google Maps
                  <ChevronRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>

            <div className="rounded-3xl overflow-hidden shadow-2xl">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3455.5!2d-51.1954345!3d-29.9130559!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95197b4ef5aa2b9b%3A0xb0159c2f58ea1f8c!2sCreche%20Infantil%20Pimpolinhos!5e0!3m2!1spt-BR!2sbr!4v1234567890"
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Localização Creche Pimpolinhos"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="font-fredoka text-4xl lg:text-5xl font-bold mb-6">
            Quer conhecer pessoalmente?
          </h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto mb-10">
            Agende uma visita e veja de perto toda nossa estrutura preparada 
            para receber seu filho.
          </p>
          <Button size="lg" variant="secondary" className="text-lg px-8" asChild>
            <Link to="/contato">
              Agendar Visita
              <ChevronRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
