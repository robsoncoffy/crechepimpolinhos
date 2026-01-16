import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Target, Eye, Award } from "lucide-react";
import bannerImage from "@/assets/banner-pimpolinhos-2.png";

const values = [
  {
    icon: Heart,
    title: "Amor",
    description: "Tratamos cada criança com carinho e dedicação, como se fosse nosso próprio filho.",
    color: "pimpo-red",
  },
  {
    icon: Target,
    title: "Compromisso",
    description: "Comprometidos com o desenvolvimento integral de cada criança que nos é confiada.",
    color: "pimpo-blue",
  },
  {
    icon: Eye,
    title: "Atenção",
    description: "Olhar atento para as necessidades individuais de cada pequeno.",
    color: "pimpo-green",
  },
  {
    icon: Award,
    title: "Qualidade",
    description: "Educação infantil de excelência com profissionais qualificados.",
    color: "pimpo-yellow",
  },
];

const activities = [
  "Educação Física",
  "Inglês",
  "Ballet",
  "Capoeira",
  "Música",
  "Artes",
  "Recreação",
  "Contação de Histórias",
];

export default function About() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-gradient-to-br from-pimpo-blue-light to-pimpo-green-light py-16 lg:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="font-fredoka text-4xl lg:text-5xl font-bold text-foreground">
                Sobre a Pimpolinhos
              </h1>
              <p className="text-lg text-muted-foreground">
                A Creche Infantil Pimpolinhos nasceu do sonho de criar um espaço onde as crianças 
                pudessem crescer felizes, seguras e estimuladas. Desde nossa fundação, trabalhamos 
                para oferecer educação infantil de qualidade em Canoas.
              </p>
              <p className="text-muted-foreground">
                Nossa equipe é formada por profissionais apaixonados pela educação infantil, 
                que entendem a importância dos primeiros anos de vida no desenvolvimento 
                cognitivo, social e emocional das crianças.
              </p>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-pimpo-blue via-pimpo-green to-pimpo-yellow rounded-3xl blur-2xl opacity-20" />
              <img
                src={bannerImage}
                alt="Crianças brincando na Pimpolinhos"
                className="relative rounded-3xl shadow-2xl w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Missão, Visão */}
      <section className="py-16 lg:py-24 bg-card">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-fredoka text-2xl font-bold mb-4">Nossa Missão</h3>
                <p className="text-muted-foreground">
                  Proporcionar um ambiente acolhedor e estimulante para o desenvolvimento 
                  integral das crianças, oferecendo cuidado, educação de qualidade e 
                  experiências significativas que contribuam para a formação de indivíduos 
                  felizes e preparados para a vida.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-pimpo-green/20 hover:border-pimpo-green/40 transition-colors">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-full bg-pimpo-green/10 flex items-center justify-center mb-4">
                  <Eye className="w-6 h-6 text-pimpo-green" />
                </div>
                <h3 className="font-fredoka text-2xl font-bold mb-4">Nossa Visão</h3>
                <p className="text-muted-foreground">
                  Ser referência em educação infantil na região, reconhecida pela excelência 
                  no cuidado com as crianças, pela inovação pedagógica e pelo compromisso 
                  com o desenvolvimento pleno de cada aluno.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Nossos Valores
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Princípios que guiam nosso trabalho diário com as crianças e famílias.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <Card key={value.title} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-${value.color}-light mb-4`}>
                    <value.icon className={`w-8 h-8 text-${value.color}`} />
                  </div>
                  <h3 className="font-fredoka text-xl font-bold mb-2">{value.title}</h3>
                  <p className="text-muted-foreground text-sm">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Atividades */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-pimpo-yellow-light to-pimpo-red-light">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Atividades Complementares
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Oferecemos diversas atividades para o desenvolvimento completo das crianças.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {activities.map((activity) => (
              <div
                key={activity}
                className="bg-card px-6 py-3 rounded-full font-semibold shadow-md hover:shadow-lg transition-shadow"
              >
                {activity}
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
