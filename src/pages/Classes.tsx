import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Baby, BookOpen, Users, Clock, Sun, Moon, ChevronRight, CheckCircle2, Star } from "lucide-react";
import nurseryImage from "@/assets/nursery-room.jpg";
import craftsImage from "@/assets/kids-crafts.jpg";
import teacherImage from "@/assets/teacher-reading.jpg";

const classes = [
  {
    id: "bercario",
    title: "Berçário",
    ageRange: "0 a 2 anos",
    description:
      "Ambiente acolhedor e seguro para os primeiros passos do desenvolvimento do seu bebê. Cuidado integral com foco em estimulação sensorial, motor e afetiva.",
    icon: Baby,
    color: "pimpo-blue",
    bgColor: "bg-pimpo-blue",
    lightBg: "bg-pimpo-blue-light",
    image: nurseryImage,
    activities: [
      "Estimulação sensorial",
      "Desenvolvimento motor",
      "Musicalização infantil",
      "Contação de histórias",
      "Brincadeiras lúdicas",
      "Massagem relaxante",
    ],
    highlights: [
      "Berços individuais e confortáveis",
      "Fraldário completo e higienizado",
      "Alimentação específica para a idade",
      "Relatório diário detalhado",
    ],
  },
  {
    id: "maternal_1",
    title: "Maternal I",
    ageRange: "2 a 3 anos",
    description:
      "Fase de descobertas e exploração! Atividades que estimulam a curiosidade, linguagem e socialização da criança em um ambiente preparado.",
    icon: BookOpen,
    color: "pimpo-red",
    bgColor: "bg-pimpo-red",
    lightBg: "bg-pimpo-red-light",
    image: craftsImage,
    activities: [
      "Desenvolvimento da linguagem",
      "Coordenação motora fina e grossa",
      "Atividades artísticas",
      "Brincadeiras ao ar livre",
      "Iniciação à autonomia",
      "Projetos temáticos",
    ],
    highlights: [
      "Salas coloridas e estimulantes",
      "Brinquedos pedagógicos",
      "Espaço para movimento livre",
      "Professoras especializadas",
    ],
  },
  {
    id: "maternal_2",
    title: "Maternal II",
    ageRange: "3 a 4 anos",
    description:
      "Consolidação das habilidades motoras e cognitivas. Preparação para a próxima fase com atividades mais estruturadas e desenvolvimento da autonomia.",
    icon: BookOpen,
    color: "pimpo-red",
    bgColor: "bg-pimpo-red",
    lightBg: "bg-pimpo-red-light",
    image: craftsImage,
    activities: [
      "Pré-letramento",
      "Raciocínio lógico",
      "Atividades artísticas avançadas",
      "Socialização em grupo",
      "Projetos colaborativos",
      "Educação socioemocional",
    ],
    highlights: [
      "Material didático especializado",
      "Atividades em grupo",
      "Desenvolvimento da autonomia",
      "Professoras especializadas",
    ],
  },
  {
    id: "jardim_1",
    title: "Jardim I",
    ageRange: "4 a 5 anos",
    description:
      "Início da preparação para a vida escolar com atividades pedagógicas estruturadas e desenvolvimento cognitivo avançado.",
    icon: Users,
    color: "pimpo-green",
    bgColor: "bg-pimpo-green",
    lightBg: "bg-pimpo-green-light",
    image: teacherImage,
    activities: [
      "Pré-alfabetização",
      "Raciocínio lógico-matemático",
      "Inglês básico",
      "Educação Física",
      "Projetos pedagógicos",
      "Educação socioemocional",
    ],
    highlights: [
      "Atividades extras disponíveis",
      "Preparação pré-escolar",
      "Professoras especializadas",
    ],
  },
  {
    id: "jardim_2",
    title: "Jardim II",
    ageRange: "5 a 6 anos",
    description:
      "Preparação completa para o Ensino Fundamental com alfabetização, raciocínio avançado e formação de valores.",
    icon: Users,
    color: "pimpo-green",
    bgColor: "bg-pimpo-green",
    lightBg: "bg-pimpo-green-light",
    image: teacherImage,
    activities: [
      "Alfabetização completa",
      "Matemática básica",
      "Inglês intermediário",
      "Educação Física",
      "Projetos pedagógicos",
      "Preparação para o Fundamental",
    ],
    highlights: [
      "Atividades extras disponíveis",
      "Formatura especial",
      "Professoras especializadas",
    ],
  },
];

const shifts = [
  {
    title: "Meio Turno Manhã",
    hours: "5 horas",
    icon: Sun,
    description: "Das 7h às 12h. Ideal para quem precisa de flexibilidade no período da tarde.",
    includes: ["Café da manhã", "Lanche", "Atividades pedagógicas", "Recreação"],
  },
  {
    title: "Meio Turno Tarde",
    hours: "5 horas",
    icon: Moon,
    description: "Das 13h às 18h. Ideal para quem precisa de flexibilidade no período da manhã.",
    includes: ["Almoço", "Lanche da tarde", "Atividades pedagógicas", "Recreação"],
  },
  {
    title: "Período Integral",
    hours: "9 horas",
    icon: Clock,
    description: "9 horas diárias com flexibilidade de horário para sua família.",
    includes: ["Todas as refeições", "Soneca", "Atividades completas", "Atividades extras*"],
    featured: true,
    note: "*Atividades extras cobradas separadamente",
  },
];

export default function Classes() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pimpo-green-light via-background to-pimpo-blue-light" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-pimpo-yellow/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pimpo-blue/20 rounded-full blur-3xl" />
        
        <div className="container relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-semibold text-primary">Educação por Faixa Etária</span>
          </div>
          <h1 className="font-fredoka text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Nossas Turmas
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Oferecemos turmas organizadas por idade, com proposta pedagógica 
            adequada a cada fase do desenvolvimento infantil.
          </p>
        </div>
      </section>

      {/* Classes */}
      <section className="py-20 lg:py-28">
        <div className="container space-y-24">
          {classes.map((classItem, index) => (
            <div
              key={classItem.id}
              className={`grid lg:grid-cols-2 gap-12 items-center ${
                index % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              {/* Image */}
              <div className={`relative ${index % 2 === 1 ? "lg:order-2" : ""}`}>
                <div className={`absolute -inset-4 ${classItem.lightBg} rounded-3xl -z-10`} />
                <img
                  src={classItem.image}
                  alt={classItem.title}
                  className="rounded-2xl shadow-2xl w-full h-80 lg:h-96 object-cover"
                />
                {/* Badge */}
                <div className={`absolute -bottom-6 ${index % 2 === 1 ? "-left-6" : "-right-6"} ${classItem.bgColor} text-white p-4 rounded-2xl shadow-xl`}>
                  <classItem.icon className="w-10 h-10" />
                </div>
              </div>

              {/* Content */}
              <div className={`space-y-6 ${index % 2 === 1 ? "lg:order-1" : ""}`}>
                <div className={`inline-flex items-center gap-2 ${classItem.bgColor} text-white px-4 py-2 rounded-full`}>
                  <classItem.icon className="w-4 h-4" />
                  <span className="font-semibold">{classItem.ageRange}</span>
                </div>

                <h2 className="font-fredoka text-4xl lg:text-5xl font-bold text-foreground">
                  {classItem.title}
                </h2>

                <p className="text-lg text-muted-foreground leading-relaxed">
                  {classItem.description}
                </p>

                {/* Activities */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Atividades principais:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {classItem.activities.map((activity) => (
                      <div key={activity} className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 text-${classItem.color} flex-shrink-0`} />
                        <span className="text-sm">{activity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Highlights */}
                <div className={`${classItem.lightBg} p-6 rounded-xl`}>
                  <h4 className="font-semibold text-foreground mb-3">Diferenciais:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {classItem.highlights.map((highlight) => (
                      <div key={highlight} className="flex items-center gap-2">
                        <Star className={`w-4 h-4 text-${classItem.color} flex-shrink-0`} />
                        <span className="text-sm">{highlight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Shifts */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-semibold text-primary">Flexibilidade</span>
            </div>
            <h2 className="font-fredoka text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Opções de Turno
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Escolha a opção que melhor se adapta à rotina da sua família.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {shifts.map((shift) => (
              <Card
                key={shift.title}
                className={`relative overflow-hidden border-2 ${
                  shift.featured
                    ? "border-primary shadow-2xl scale-105"
                    : "border-transparent shadow-xl"
                }`}
              >
                {shift.featured && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold rounded-bl-lg">
                    Mais Popular
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${
                    shift.featured ? "bg-primary text-primary-foreground" : "bg-primary/10"
                  } mx-auto mb-4`}>
                    <shift.icon className={`w-8 h-8 ${shift.featured ? "" : "text-primary"}`} />
                  </div>
                  <CardTitle className="font-fredoka text-xl">{shift.title}</CardTitle>
                  <p className="text-3xl font-bold text-primary">{shift.hours}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-center">{shift.description}</p>
                  <div className="space-y-2">
                    {shift.includes.map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-pimpo-green flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                  {shift.note && (
                    <p className="text-xs text-center text-muted-foreground pt-2 border-t">
                      {shift.note}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 bg-primary text-primary-foreground">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-fredoka text-4xl lg:text-5xl font-bold mb-6">
              Pronto para matricular seu filho?
            </h2>
            <p className="text-xl opacity-90 mb-10">
              Entre em contato conosco para conhecer nossa escola e garantir a vaga do seu pequeno.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" variant="secondary" className="text-lg px-8" asChild>
                <Link to="/pre-matricula">
                  Fazer Pré-Matrícula
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 bg-transparent border-white text-white hover:bg-white hover:text-primary"
                asChild
              >
                <a href="https://wa.me/5551989965423" target="_blank" rel="noopener noreferrer">
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
