import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Baby, BookOpen, Users, Clock, Sun, Moon } from "lucide-react";

const classes = [
  {
    id: "bercario",
    title: "Berçário",
    ageRange: "0 a 1 ano",
    description:
      "Ambiente acolhedor e seguro para os primeiros passos do desenvolvimento do seu bebê. Cuidado integral com foco em estimulação sensorial, motor e afetiva.",
    icon: Baby,
    color: "pimpo-blue",
    activities: [
      "Estimulação sensorial",
      "Desenvolvimento motor",
      "Musicalização",
      "Contação de histórias",
      "Brincadeiras lúdicas",
    ],
  },
  {
    id: "maternal",
    title: "Maternal",
    ageRange: "1 a 3 anos",
    description:
      "Fase de descobertas e exploração! Atividades que estimulam a curiosidade, linguagem e socialização da criança em um ambiente preparado.",
    icon: BookOpen,
    color: "pimpo-red",
    activities: [
      "Desenvolvimento da linguagem",
      "Coordenação motora",
      "Atividades artísticas",
      "Brincadeiras ao ar livre",
      "Iniciação à autonomia",
    ],
  },
  {
    id: "jardim",
    title: "Jardim",
    ageRange: "4 a 6 anos",
    description:
      "Preparação para a vida escolar com atividades pedagógicas estruturadas, desenvolvimento cognitivo avançado e formação de valores.",
    icon: Users,
    color: "pimpo-green",
    activities: [
      "Pré-alfabetização",
      "Raciocínio lógico",
      "Inglês",
      "Educação Física",
      "Projetos pedagógicos",
    ],
  },
];

const shifts = [
  {
    title: "Meio Período Manhã",
    hours: "7h às 12h",
    icon: Sun,
    description: "Ideal para famílias que precisam de cuidado durante a manhã.",
  },
  {
    title: "Meio Período Tarde",
    hours: "13h às 18h",
    icon: Moon,
    description: "Perfeito para quem precisa de acompanhamento no período vespertino.",
  },
  {
    title: "Período Integral",
    hours: "7h às 19h",
    icon: Clock,
    description: "Cobertura completa para pais que trabalham o dia todo.",
  },
];

export default function Classes() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-gradient-to-br from-pimpo-green-light to-pimpo-blue-light py-16 lg:py-20">
        <div className="container text-center">
          <h1 className="font-fredoka text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Nossas Turmas
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Oferecemos turmas para todas as idades, do berçário ao jardim, com
            proposta pedagógica adequada a cada fase do desenvolvimento.
          </p>
        </div>
      </section>

      {/* Classes */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="space-y-12">
            {classes.map((classItem, index) => (
              <Card
                key={classItem.id}
                className={`overflow-hidden border-2 border-${classItem.color}/20 hover:border-${classItem.color}/40 transition-colors`}
              >
                <div className={`grid lg:grid-cols-3 ${index % 2 === 1 ? "lg:flex-row-reverse" : ""}`}>
                  <div className={`bg-${classItem.color}-light p-8 flex items-center justify-center`}>
                    <div className="text-center">
                      <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-${classItem.color}/20 mb-4`}>
                        <classItem.icon className={`w-12 h-12 text-${classItem.color}`} />
                      </div>
                      <h3 className="font-fredoka text-3xl font-bold">{classItem.title}</h3>
                      <p className={`text-${classItem.color} font-semibold mt-2`}>{classItem.ageRange}</p>
                    </div>
                  </div>
                  <div className="lg:col-span-2 p-8">
                    <p className="text-muted-foreground text-lg mb-6">{classItem.description}</p>
                    <h4 className="font-fredoka text-lg font-bold mb-4">Atividades principais:</h4>
                    <ul className="grid sm:grid-cols-2 gap-2">
                      {classItem.activities.map((activity) => (
                        <li key={activity} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full bg-${classItem.color}`} />
                          <span>{activity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Shifts */}
      <section className="py-16 lg:py-24 bg-card">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Opções de Turno
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Flexibilidade para atender às necessidades da sua família.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {shifts.map((shift) => (
              <Card key={shift.title} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto mb-2">
                    <shift.icon className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="font-fredoka">{shift.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary mb-2">{shift.hours}</p>
                  <p className="text-muted-foreground text-sm">{shift.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="font-fredoka text-3xl lg:text-4xl font-bold mb-4">
            Matricule seu filho!
          </h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            Entre em contato conosco para conhecer nossa escola e garantir a vaga do seu pequeno.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/contato">Entrar em Contato</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" asChild>
              <a href="https://wa.me/5551989965423" target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
