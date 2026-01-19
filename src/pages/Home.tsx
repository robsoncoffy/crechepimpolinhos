import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Baby, BookOpen, Music, Users, Shield, Heart, CalendarDays, MessageCircle, ChevronRight, Star, Clock, MapPin, Phone, CheckCircle2, Sparkles, Award, Play } from "lucide-react";
import heroImage from "@/assets/hero-children.jpg";
import teacherImage from "@/assets/teacher-reading.jpg";
import playgroundImage from "@/assets/playground.jpg";
import craftsImage from "@/assets/kids-crafts.jpg";
import nurseryImage from "@/assets/nursery-room.jpg";
import eatingImage from "@/assets/kids-eating.jpg";
import logo from "@/assets/logo-pimpolinhos.png";
const features = [{
  icon: Baby,
  title: "Berçário",
  description: "Cuidado especial para bebês de 0 a 1 ano com estimulação sensorial",
  color: "bg-pimpo-blue",
  lightColor: "bg-pimpo-blue-light",
  image: nurseryImage
}, {
  icon: BookOpen,
  title: "Maternal",
  description: "Desenvolvimento integral para crianças de 1 a 3 anos",
  color: "bg-pimpo-red",
  lightColor: "bg-pimpo-red-light",
  image: craftsImage
}, {
  icon: Users,
  title: "Jardim",
  description: "Preparação completa para crianças de 4 a 6 anos",
  color: "bg-pimpo-green",
  lightColor: "bg-pimpo-green-light",
  image: teacherImage
}];
const benefits = [{
  icon: Shield,
  title: "Segurança Total",
  description: "Monitoramento 24h, controle de acesso e equipe treinada"
}, {
  icon: Heart,
  title: "Carinho e Afeto",
  description: "Ambiente acolhedor que faz seu filho se sentir em casa"
}, {
  icon: CalendarDays,
  title: "Agenda Digital",
  description: "Acompanhe cada momento do dia do seu filho em tempo real"
}, {
  icon: MessageCircle,
  title: "Comunicação Direta",
  description: "Chat exclusivo com os professores da turma"
}];
const activities = [{
  name: "Educação Física",
  icon: "🏃"
}, {
  name: "Inglês",
  icon: "🇬🇧"
}, {
  name: "Ballet",
  icon: "🩰"
}, {
  name: "Capoeira",
  icon: "🥋"
}, {
  name: "Música",
  icon: "🎵"
}, {
  name: "Artes",
  icon: "🎨"
}];
const testimonials = [{
  name: "Maria Silva",
  role: "Mãe do Pedro, 3 anos",
  content: "A Pimpolinhos transformou a vida do meu filho! A equipe é maravilhosa e a agenda digital me deixa tranquila durante o trabalho.",
  avatar: "MS"
}, {
  name: "João Santos",
  role: "Pai da Ana, 2 anos",
  content: "Escolhemos a Pimpolinhos pela estrutura e ficamos pelo carinho. Ana adora ir para a escolinha todos os dias!",
  avatar: "JS"
}, {
  name: "Carla Oliveira",
  role: "Mãe do Lucas, 4 anos",
  content: "O desenvolvimento do Lucas foi incrível! As atividades extras como inglês e música fazem toda diferença.",
  avatar: "CO"
}];
const stats = [{
  value: "+20",
  label: "Anos de Exp. dos Profissionais"
}, {
  value: "100",
  label: "Famílias Atendidas"
}, {
  value: "5",
  label: "Turmas Especializadas"
}, {
  value: "5★",
  label: "Avaliação dos Pais"
}];
export default function Home() {
  return <PublicLayout>
      {/* Hero Section - Full Width with Overlay */}
      <section className="relative min-h-[90vh] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img src={heroImage} alt="Crianças felizes na Creche Pimpolinhos" className="w-full h-full object-cover object-[center_70%] md:object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-transparent" />
        </div>

        {/* Content */}
        <div className="container relative z-10 py-20">
          <div className="max-w-2xl text-white">
            <div className="inline-flex items-center gap-2 bg-secondary/90 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Star className="w-4 h-4 text-white fill-white" />
              <span className="font-semibold text-secondary-foreground">
                A melhor creche de Canoas
              </span>
            </div>

            <h1 className="font-fredoka text-5xl lg:text-7xl font-bold leading-tight mb-6">
              Colorindo a infância com{" "}
              <span className="text-pimpo-yellow">amor</span> e{" "}
              <span className="text-pimpo-green">alegria!</span>
            </h1>

            <p className="text-xl text-white/90 mb-8 leading-relaxed">
              Na Creche Pimpolinhos, cada criança é única. Oferecemos educação infantil 
              completa com acompanhamento digital em tempo real para os pais.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <Button size="lg" className="text-lg px-8 py-6" asChild>
                <Link to="/auth?mode=signup">
                  Área dos Pais
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 border-white text-white hover:bg-white hover:text-foreground" asChild>
                <Link to="/contato">Agende uma Visita</Link>
              </Button>
            </div>

            {/* Quick Info */}
            <div className="flex flex-wrap gap-6 text-white/80">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>Seg-Sex: 7h às 19h</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span>Harmonia, Canoas/RS</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                <span>(51) 98996-5423</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-8 h-12 border-2 border-white/50 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-white/70 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-primary py-8">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map(stat => <div key={stat.label} className="text-center text-primary-foreground">
                <p className="font-fredoka text-4xl lg:text-5xl font-bold mb-1">
                  {stat.value}
                </p>
                <p className="text-sm lg:text-base opacity-80">{stat.label}</p>
              </div>)}
          </div>
        </div>
      </section>

      {/* About Preview Section */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Images Grid */}
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <img src={teacherImage} alt="Professora lendo para crianças" className="rounded-2xl shadow-xl w-full h-48 object-cover" />
                <img src={craftsImage} alt="Crianças fazendo artes" className="rounded-2xl shadow-xl w-full h-48 object-cover mt-8" />
                <img src={playgroundImage} alt="Playground" className="rounded-2xl shadow-xl w-full h-48 object-cover -mt-4" />
                <img src={eatingImage} alt="Crianças no refeitório" className="rounded-2xl shadow-xl w-full h-48 object-cover mt-4" />
              </div>
              {/* Floating Badge */}
              <div className="absolute -bottom-6 -right-6 bg-secondary p-6 rounded-2xl shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center">
                    <Award className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-fredoka text-2xl font-bold text-foreground">+20</p>
                    <p className="text-sm text-muted-foreground">Anos de Exp. dos Profissionais</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 text-primary font-semibold">
                <Sparkles className="w-5 h-5" />
                <span>Sobre a Pimpolinhos</span>
              </div>

              <h2 className="font-fredoka text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                Mais que uma creche, uma{" "}
                <span className="text-primary">segunda casa</span>
              </h2>

              <p className="text-lg text-muted-foreground leading-relaxed">
                Desde nossa fundação, a Pimpolinhos se dedica a oferecer um ambiente 
                seguro, acolhedor e estimulante para o desenvolvimento integral das crianças.
              </p>

              <ul className="space-y-4">
                {["Equipe qualificada e apaixonada por educação infantil", "Proposta pedagógica inovadora e lúdica", "Alimentação saudável e balanceada", "Acompanhamento individual do desenvolvimento"].map(item => <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-pimpo-green flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{item}</span>
                  </li>)}
              </ul>

              <Button size="lg" variant="outline" asChild>
                <Link to="/sobre">
                  Conheça nossa história
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Classes Section */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-muted/30 to-background">
        <div className="container">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-primary font-semibold mb-4">
              <Users className="w-5 h-5" />
              <span>Nossas Turmas</span>
            </div>
            <h2 className="font-fredoka text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Educação para cada fase
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Turmas organizadas por faixa etária, com proposta pedagógica 
              adequada a cada momento do desenvolvimento infantil.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {features.map(feature => <Card key={feature.title} className="group overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
                <div className="relative h-56 overflow-hidden">
                  <img src={feature.image} alt={feature.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${feature.color} mb-2`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-fredoka text-2xl font-bold text-white">
                      {feature.title}
                    </h3>
                  </div>
                </div>
                <CardContent className="p-6">
                  <p className="text-muted-foreground mb-4">{feature.description}</p>
                  <Link to="/turmas" className="inline-flex items-center text-primary font-semibold hover:underline">
                    Saiba mais
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </CardContent>
              </Card>)}
          </div>

          <div className="text-center mt-12">
            <Button size="lg" asChild>
              <Link to="/planos">
                Ver planos e valores
                <ChevronRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Plans Preview Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground mb-3">
              Planos Flexíveis
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Escolha o plano que melhor se adapta à rotina da sua família
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { name: "Básico", desc: "Meio período (4h)", highlight: false },
              { name: "Intermediário", desc: "Integral (até 8h)", highlight: true },
              { name: "Plus+", desc: "Integral estendido (até 10h)", highlight: false },
            ].map((plan) => (
              <Card key={plan.name} className={`text-center ${plan.highlight ? 'border-primary shadow-lg' : ''}`}>
                <CardContent className="pt-6 pb-4">
                  {plan.highlight && <Badge className="mb-2">Mais Popular</Badge>}
                  <h3 className="font-fredoka text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{plan.desc}</p>
                  <p className="text-2xl font-bold text-primary">Consultar</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link to="/planos">
                Ver detalhes dos planos
                <ChevronRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Activities Section */}
      <section className="py-20 lg:py-28 bg-primary text-primary-foreground overflow-hidden">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 font-semibold text-secondary">
                <Music className="w-5 h-5" />
                <span>Atividades Extras</span>
              </div>

              <h2 className="font-fredoka text-4xl lg:text-5xl font-bold leading-tight">
                Desenvolvimento completo com atividades especiais
              </h2>

              <p className="text-lg opacity-90 leading-relaxed">
                Além do currículo pedagógico, oferecemos atividades que estimulam 
                diferentes habilidades e talentos das crianças.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {activities.map(activity => <div key={activity.name} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center hover:bg-white/20 transition-colors">
                    <span className="text-3xl mb-2 block">{activity.icon}</span>
                    <span className="font-semibold">{activity.name}</span>
                  </div>)}
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img src={craftsImage} alt="Atividades na creche" className="w-full h-96 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent flex items-end justify-center pb-8">
                  <Button size="lg" variant="secondary" className="gap-2" asChild>
                    <Link to="/sobre">
                      <Play className="w-5 h-5" />
                      Conheça mais
                    </Link>
                  </Button>
                </div>
              </div>
              {/* Decorative Elements */}
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-secondary/30 rounded-full blur-2xl" />
              <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-pimpo-yellow/30 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Digital Agenda Section */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Phone Mockup */}
            <div className="relative order-2 lg:order-1">
              <div className="bg-gradient-to-br from-pimpo-blue via-primary to-pimpo-green p-1 rounded-[3rem] shadow-2xl max-w-sm mx-auto">
                <div className="bg-foreground rounded-[2.8rem] p-4">
                  <div className="bg-card rounded-[2.4rem] overflow-hidden">
                    {/* Status Bar */}
                    <div className="bg-muted px-6 py-3 flex justify-between items-center text-xs text-muted-foreground">
                      <span>9:41</span>
                      <span>●●●●● 📶</span>
                    </div>
                    {/* App Content */}
                    <div className="p-4 space-y-4">
                      <div className="flex items-center gap-3 mb-6">
                        <img src={logo} alt="Logo" className="w-10 h-10" />
                        <div>
                          <p className="font-semibold text-sm">Agenda Digital</p>
                          <p className="text-xs text-muted-foreground">Pedro Silva - Maternal</p>
                        </div>
                      </div>
                      
                      <div className="bg-pimpo-green-light p-4 rounded-xl">
                        <p className="font-semibold text-sm mb-2">☀️ Bom dia!</p>
                        <p className="text-xs text-muted-foreground">Pedro chegou às 7:30 e está feliz!</p>
                      </div>

                      <div className="bg-pimpo-yellow-light p-4 rounded-xl">
                        <p className="font-semibold text-sm mb-2">🍽️ Almoço</p>
                        <p className="text-xs text-muted-foreground">Comeu tudo! Arroz, feijão, frango e salada.</p>
                      </div>

                      <div className="bg-pimpo-blue-light p-4 rounded-xl">
                        <p className="font-semibold text-sm mb-2">😴 Soninho</p>
                        <p className="text-xs text-muted-foreground">Dormiu das 13h às 14:30. Soninho tranquilo!</p>
                      </div>

                      <div className="bg-muted p-4 rounded-xl">
                        <p className="font-semibold text-sm mb-2">💬 Recado</p>
                        <p className="text-xs text-muted-foreground">Pedro participou da aula de música e adorou!</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative */}
              <div className="absolute -z-10 -top-12 -left-12 w-48 h-48 bg-pimpo-blue/20 rounded-full blur-3xl" />
              <div className="absolute -z-10 -bottom-12 -right-12 w-64 h-64 bg-pimpo-yellow/20 rounded-full blur-3xl" />
            </div>

            {/* Content */}
            <div className="space-y-6 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 text-primary font-semibold">
                <CalendarDays className="w-5 h-5" />
                <span>Agenda Digital</span>
              </div>

              <h2 className="font-fredoka text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                Acompanhe cada momento do{" "}
                <span className="text-primary">dia do seu filho</span>
              </h2>

              <p className="text-lg text-muted-foreground leading-relaxed">
                Nossa agenda digital exclusiva permite que você acompanhe em tempo real 
                tudo o que acontece na rotina do seu pequeno.
              </p>

              <div className="space-y-4">
                {benefits.map(benefit => <div key={benefit.title} className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-base">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>)}
              </div>

              <Button size="lg" asChild>
                <Link to="/auth?mode=signup">
                  Criar minha conta
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-primary font-semibold mb-4">
              <Heart className="w-5 h-5" />
              <span>Depoimentos</span>
            </div>
            <h2 className="font-fredoka text-4xl lg:text-5xl font-bold text-foreground mb-4">
              O que os pais dizem
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A satisfação das famílias é nosso maior orgulho.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map(testimonial => <Card key={testimonial.name} className="border-0 shadow-xl">
                <CardContent className="p-8">
                  <div className="flex items-center gap-1 text-pimpo-yellow mb-4">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
                  </div>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={playgroundImage} alt="Playground" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-primary/90" />
        </div>

        <div className="container relative z-10 text-center text-primary-foreground">
          <h2 className="font-fredoka text-4xl lg:text-6xl font-bold mb-6">
            Matricule seu filho na Pimpolinhos!
          </h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto mb-10">
            Venha conhecer nossa estrutura, equipe e metodologia. 
            Estamos prontos para receber sua família!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6" asChild>
              <Link to="/contato">Agendar Visita</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-transparent border-white text-white hover:bg-white hover:text-primary" asChild>
              <a href="https://wa.me/5551989965423" target="_blank" rel="noopener noreferrer">
                <Phone className="w-5 h-5 mr-2" />
                WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>;
}