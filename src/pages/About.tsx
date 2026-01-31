import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Heart, Target, Eye, Award, Sparkles, Users, BookOpen, ChevronRight, CheckCircle2 } from "lucide-react";
// Hero image is in public folder for LCP optimization
const heroImage = "/images/hero-children.jpg";
import teacherImage from "@/assets/teacher-reading.jpg";
import craftsImage from "@/assets/kids-crafts.jpg";
import playgroundImage from "@/assets/playground.jpg";

const values = [
  {
    icon: Heart,
    title: "Amor",
    description: "Tratamos cada criança com carinho e dedicação, como se fosse nosso próprio filho.",
    color: "pimpo-red",
    bgColor: "bg-pimpo-red",
  },
  {
    icon: Target,
    title: "Compromisso",
    description: "Comprometidos com o desenvolvimento integral de cada criança que nos é confiada.",
    color: "pimpo-blue",
    bgColor: "bg-pimpo-blue",
  },
  {
    icon: Eye,
    title: "Atenção",
    description: "Olhar atento para as necessidades individuais de cada pequeno.",
    color: "pimpo-green",
    bgColor: "bg-pimpo-green",
  },
  {
    icon: Award,
    title: "Qualidade",
    description: "Educação infantil de excelência com profissionais qualificados.",
    color: "pimpo-yellow",
    bgColor: "bg-pimpo-yellow",
  },
];

const activities = [
  { name: "Educação Física", icon: "🏃" },
  { name: "Inglês", icon: "🇬🇧" },
  { name: "Ballet", icon: "🩰" },
  { name: "Capoeira", icon: "🥋" },
  { name: "Música", icon: "🎵" },
  { name: "Artes", icon: "🎨" },
  { name: "Recreação", icon: "🎮" },
  { name: "Histórias", icon: "📚" },
];

const timeline = [
  { year: "Fundação", description: "A Pimpolinhos nasceu do sonho de criar um espaço especial para crianças." },
  { year: "Crescimento", description: "Expandimos nossa estrutura para atender mais famílias." },
  { year: "Inovação", description: "Implementamos a agenda digital para melhor comunicação." },
  { year: "Hoje", description: "+500 famílias atendidas e referência em educação infantil." },
];

export default function About() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative min-h-[60vh] flex items-center">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Crianças felizes"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/50" />
        </div>

        <div className="container relative z-10 py-20">
          <div className="max-w-2xl text-white">
            <div className="inline-flex items-center gap-2 bg-secondary/90 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Heart className="w-4 h-4 text-pimpo-red" />
              <span className="font-semibold text-secondary-foreground">Nossa História</span>
            </div>
            <h1 className="font-fredoka text-5xl lg:text-6xl font-bold mb-6">
              Sobre a Pimpolinhos
            </h1>
            <p className="text-xl text-white/90 leading-relaxed">
              Mais de uma década dedicada a colorir a infância com amor, 
              cuidado e educação de qualidade em Canoas.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 text-primary font-semibold mb-4">
                  <Sparkles className="w-5 h-5" />
                  <span>Quem Somos</span>
                </div>
                <h2 className="font-fredoka text-4xl lg:text-5xl font-bold text-foreground mb-6">
                  Uma escola feita com amor
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                  A Creche Infantil Pimpolinhos nasceu do sonho de criar um espaço onde 
                  as crianças pudessem crescer felizes, seguras e estimuladas.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Nossa equipe é formada por profissionais apaixonados pela educação infantil, 
                  que entendem a importância dos primeiros anos de vida no desenvolvimento 
                  cognitivo, social e emocional das crianças.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
                  <CardContent className="p-6">
                    <Target className="w-10 h-10 text-primary mb-3" />
                    <h3 className="font-fredoka text-xl font-bold mb-2">Missão</h3>
                    <p className="text-sm text-muted-foreground">
                      Proporcionar um ambiente acolhedor para o desenvolvimento integral das crianças.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-pimpo-green/20 hover:border-pimpo-green/40 transition-colors">
                  <CardContent className="p-6">
                    <Eye className="w-10 h-10 text-pimpo-green mb-3" />
                    <h3 className="font-fredoka text-xl font-bold mb-2">Visão</h3>
                    <p className="text-sm text-muted-foreground">
                      Ser referência em educação infantil, reconhecida pela excelência e inovação.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <img
                  src={teacherImage}
                  alt="Professora com crianças"
                  className="rounded-2xl shadow-xl h-48 w-full object-cover"
                />
                <img
                  src={craftsImage}
                  alt="Atividades artísticas"
                  className="rounded-2xl shadow-xl h-48 w-full object-cover mt-8"
                />
                <img
                  src={playgroundImage}
                  alt="Playground"
                  className="rounded-2xl shadow-xl h-48 w-full object-cover col-span-2"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-primary font-semibold mb-4">
              <Heart className="w-5 h-5" />
              <span>Nossos Pilares</span>
            </div>
            <h2 className="font-fredoka text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Valores que nos Guiam
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Princípios que orientam nosso trabalho diário com as crianças e famílias.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <Card key={value.title} className="group border-0 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2">
                <CardContent className="p-8 text-center">
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl ${value.bgColor} mb-6 group-hover:scale-110 transition-transform`}>
                    <value.icon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="font-fredoka text-2xl font-bold mb-3">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Activities */}
      <section className="py-20 lg:py-28 bg-primary text-primary-foreground">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="font-fredoka text-4xl lg:text-5xl font-bold mb-4">
              Atividades Complementares
            </h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              Oferecemos diversas atividades para o desenvolvimento completo das crianças.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {activities.map((activity) => (
              <div
                key={activity.name}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center hover:bg-white/20 transition-colors group"
              >
                <span className="text-4xl mb-3 block group-hover:scale-125 transition-transform">{activity.icon}</span>
                <span className="font-semibold">{activity.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-primary font-semibold mb-4">
              <Users className="w-5 h-5" />
              <span>Nossa Equipe</span>
            </div>
            <h2 className="font-fredoka text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Profissionais Dedicados
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Nossa equipe é formada por educadores qualificados e apaixonados 
              pelo desenvolvimento infantil.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { title: "Pedagogas", desc: "Formação especializada em educação infantil" },
              { title: "Auxiliares", desc: "Treinamento contínuo em cuidados com crianças" },
              { title: "Especialistas", desc: "Professores de inglês, música, educação física" },
            ].map((role) => (
              <Card key={role.title} className="text-center border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-fredoka text-xl font-bold mb-2">{role.title}</h3>
                  <p className="text-muted-foreground">{role.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-pimpo-yellow-light to-pimpo-green-light">
        <div className="container text-center">
          <h2 className="font-fredoka text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Faça parte da família Pimpolinhos!
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Venha conhecer nossa escola e descubra por que somos a escolha 
            de tantas famílias em Canoas.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" className="text-lg px-8" asChild>
              <Link to="/contato">
                Agendar Visita
                <ChevronRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" asChild>
              <Link to="/turmas">Ver Turmas</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
