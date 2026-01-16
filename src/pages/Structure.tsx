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
} from "lucide-react";

const facilities = [
  {
    icon: Building,
    title: "Salas de Aula",
    description: "Ambientes climatizados, coloridos e adaptados para cada faixa etária.",
  },
  {
    icon: Utensils,
    title: "Refeitório",
    description: "Espaço adequado para refeições com cardápio balanceado e nutritivo.",
  },
  {
    icon: TreePine,
    title: "Área Externa",
    description: "Playground seguro com brinquedos adequados para diferentes idades.",
  },
  {
    icon: Baby,
    title: "Fraldário",
    description: "Ambiente higienizado e preparado para os cuidados com os bebês.",
  },
  {
    icon: BookOpen,
    title: "Biblioteca",
    description: "Cantinho da leitura com livros infantis para estimular a imaginação.",
  },
  {
    icon: Gamepad2,
    title: "Sala de Atividades",
    description: "Espaço multifuncional para aulas de música, dança e atividades especiais.",
  },
  {
    icon: ShieldCheck,
    title: "Segurança",
    description: "Monitoramento por câmeras e controle de acesso para máxima segurança.",
  },
  {
    icon: Sparkles,
    title: "Higiene",
    description: "Limpeza rigorosa e constante de todos os ambientes.",
  },
];

export default function Structure() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-gradient-to-br from-pimpo-yellow-light to-pimpo-green-light py-16 lg:py-20">
        <div className="container text-center">
          <h1 className="font-fredoka text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Nossa Estrutura
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Conheça os espaços preparados com carinho para oferecer o melhor ambiente
            para o desenvolvimento do seu filho.
          </p>
        </div>
      </section>

      {/* Facilities Grid */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {facilities.map((facility) => (
              <Card key={facility.title} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
                    <facility.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-fredoka text-lg font-bold mb-2">{facility.title}</h3>
                  <p className="text-muted-foreground text-sm">{facility.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="py-16 lg:py-24 bg-card">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-fredoka text-3xl font-bold mb-6">
              Ambiente Preparado para Aprender e Brincar
            </h2>
            <p className="text-muted-foreground mb-8">
              Nossa estrutura foi cuidadosamente planejada para atender às necessidades
              de crianças de 0 a 6 anos. Cada espaço é pensado para estimular o
              desenvolvimento cognitivo, motor e social, sempre em um ambiente seguro
              e acolhedor.
            </p>
            <p className="text-muted-foreground mb-8">
              Contamos com profissionais qualificados, materiais pedagógicos adequados
              e rotinas estruturadas que respeitam o ritmo de cada criança.
            </p>
            <Button size="lg" asChild>
              <Link to="/contato">Agende uma Visita</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="font-fredoka text-3xl font-bold mb-4">Localização</h2>
            <p className="text-muted-foreground">
              Rua Coronel Camisão, 495 - Harmonia, Canoas/RS - CEP 92310-020
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-lg">
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
      </section>
    </PublicLayout>
  );
}
