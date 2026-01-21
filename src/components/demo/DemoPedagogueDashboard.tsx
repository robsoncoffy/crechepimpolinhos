import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Home,
  Bell,
  Calendar,
  Save,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Package,
  Target,
  FileText,
  Edit,
  Baby,
  Palette,
  Music,
  Dumbbell,
  BookMarked,
} from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";
import { DemoQuickPostCreator } from "./DemoQuickPostCreator";

const daysOfWeek = [
  { value: 0, label: "Segunda", fullLabel: "Segunda-feira" },
  { value: 1, label: "Terça", fullLabel: "Terça-feira" },
  { value: 2, label: "Quarta", fullLabel: "Quarta-feira" },
  { value: 3, label: "Quinta", fullLabel: "Quinta-feira" },
  { value: 4, label: "Sexta", fullLabel: "Sexta-feira" },
];

const classTypes = [
  { value: "bercario", label: "Berçário", icon: Baby },
  { value: "maternal", label: "Maternal", icon: BookMarked },
  { value: "jardim", label: "Jardim", icon: Palette },
];

// Mock weekly plans
const mockWeeklyPlans = {
  bercario: {
    0: {
      morningActivities: "• Roda de música com instrumentos de percussão\n• Estimulação sensorial com texturas\n• Brincadeiras no tapete",
      afternoonActivities: "• Contação de história com fantoches\n• Brincadeira com bolas coloridas\n• Momento de relaxamento",
      materials: "Instrumentos musicais, tecidos de diferentes texturas, bolas coloridas, fantoches",
      objectives: "Desenvolvimento motor, estimulação sensorial, reconhecimento de sons",
      notes: "Atenção especial aos bebês novos na adaptação",
    },
    1: {
      morningActivities: "• Pintura com as mãos\n• Exploração de objetos\n• Brincadeira livre",
      afternoonActivities: "• Música e movimento\n• Massinha sensorial\n• Hora do conto",
      materials: "Tinta atóxica, papel grande, massinha caseira, livros de pano",
      objectives: "Coordenação motora fina, criatividade, expressão artística",
      notes: "",
    },
    2: {
      morningActivities: "• Brincadeira no espelho\n• Encaixes e formas\n• Música e dança",
      afternoonActivities: "• Exploração com água\n• Brincadeira de esconde\n• Relaxamento com música",
      materials: "Espelhos, blocos de encaixe, bacias, brinquedos de água",
      objectives: "Auto-reconhecimento, raciocínio lógico, coordenação",
      notes: "Preparar toalhas extras para atividade com água",
    },
    3: {
      morningActivities: "• Circuito motor adaptado\n• Brincadeira com túnel\n• Bolhas de sabão",
      afternoonActivities: "• Contação de história\n• Exploração de sons\n• Momento calmo",
      materials: "Túnel, colchonetes, bolhas de sabão, instrumentos sonoros",
      objectives: "Desenvolvimento motor grosso, curiosidade, socialização",
      notes: "",
    },
    4: {
      morningActivities: "• Dia do brinquedo\n• Brincadeira livre dirigida\n• Roda de cantigas",
      afternoonActivities: "• Pintura com pincéis grandes\n• Dança livre\n• Preparação para fim de semana",
      materials: "Brinquedos variados, tintas, pincéis grandes, aparelho de som",
      objectives: "Socialização, autonomia, expressão corporal",
      notes: "Sexta especial: foto do dia com as atividades",
    },
  },
  maternal: {
    0: {
      morningActivities: "• Roda de conversa: Como foi o fim de semana\n• Atividade de recorte e colagem\n• Parquinho",
      afternoonActivities: "• Contação de história interativa\n• Brincadeira de faz-de-conta\n• Desenho livre",
      materials: "Revistas, tesoura sem ponta, cola, livros ilustrados, giz de cera",
      objectives: "Linguagem oral, coordenação motora fina, criatividade",
      notes: "",
    },
    1: {
      morningActivities: "• Aula de movimento\n• Jogos de encaixe\n• Brincadeira com massinha",
      afternoonActivities: "• Pintura com guache\n• Brincadeira dirigida\n• Hora do conto",
      materials: "Colchonetes, jogos de encaixe, massinha, tinta guache",
      objectives: "Desenvolvimento motor, raciocínio lógico, expressão artística",
      notes: "Ballet para turma da tarde",
    },
    2: {
      morningActivities: "• Projeto da natureza: plantas\n• Exploração do jardim\n• Registro com desenho",
      afternoonActivities: "• Música e instrumentos\n• Jogos de memória\n• Brincadeira livre",
      materials: "Vasinhos, terra, sementes, lápis de cor, instrumentos musicais",
      objectives: "Ciências naturais, observação, memória",
      notes: "",
    },
    3: {
      morningActivities: "• Jogos matemáticos\n• Contagem com objetos\n• Quebra-cabeça",
      afternoonActivities: "• Capoeira\n• Brincadeira de roda\n• Relaxamento",
      materials: "Blocos lógicos, objetos para contagem, quebra-cabeças",
      objectives: "Noções matemáticas, raciocínio, cultura brasileira",
      notes: "Aula de capoeira",
    },
    4: {
      morningActivities: "• Culinária: receita simples\n• Brincadeira livre\n• Roda de música",
      afternoonActivities: "• Filme educativo\n• Atividade de artes\n• Preparação semanal",
      materials: "Ingredientes da receita, aparelho de som, materiais de arte",
      objectives: "Autonomia, trabalho em equipe, encerramento semanal",
      notes: "Sexta culinária - verificar alergias!",
    },
  },
  jardim: {
    0: {
      morningActivities: "• Roda de leitura\n• Atividade de escrita\n• Jogos de alfabetização",
      afternoonActivities: "• Projeto de ciências\n• Experiência prática\n• Registro no caderno",
      materials: "Livros, cadernos, lápis, materiais de experiência",
      objectives: "Alfabetização, letramento, pensamento científico",
      notes: "",
    },
    1: {
      morningActivities: "• Matemática lúdica\n• Jogos de tabuleiro\n• Desafios de lógica",
      afternoonActivities: "• Educação física\n• Jogos coletivos\n• Higiene e lanche",
      materials: "Jogos de tabuleiro, material dourado, bolas",
      objectives: "Raciocínio matemático, trabalho em equipe, saúde",
      notes: "Ballet/Capoeira conforme turma",
    },
    2: {
      morningActivities: "• Contação de história\n• Produção de texto coletiva\n• Ilustração",
      afternoonActivities: "• Artes: técnica mista\n• Exposição dos trabalhos\n• Avaliação do dia",
      materials: "Livros, papel craft, tintas variadas, pincéis",
      objectives: "Produção textual, criatividade, expressão artística",
      notes: "",
    },
    3: {
      morningActivities: "• Inglês básico: cores e números\n• Música em inglês\n• Jogos",
      afternoonActivities: "• Horta: cuidados\n• Observação e registro\n• Brincadeira livre",
      materials: "Flashcards, aparelho de som, ferramentas de jardinagem",
      objectives: "Introdução ao inglês, responsabilidade, natureza",
      notes: "Dia do inglês",
    },
    4: {
      morningActivities: "• Revisão semanal\n• Jogos educativos\n• Celebração das conquistas",
      afternoonActivities: "• Tarde recreativa\n• Brincadeiras variadas\n• Preparação para casa",
      materials: "Jogos variados, materiais de recreação",
      objectives: "Consolidação do aprendizado, socialização, diversão",
      notes: "Sexta recreativa - preparar atividades especiais",
    },
  },
};

export function DemoPedagogueDashboard() {
  const [selectedClass, setSelectedClass] = useState("maternal");
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() - 1 >= 0 ? new Date().getDay() - 1 : 0);
  const [isEditing, setIsEditing] = useState(false);
  const [plans, setPlans] = useState(mockWeeklyPlans);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const weekStart = getWeekStart(currentWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 4);

  const handlePrevWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  const currentPlan = plans[selectedClass as keyof typeof plans][selectedDay as keyof typeof plans.bercario];

  const updatePlan = (field: string, value: string) => {
    setPlans(prev => ({
      ...prev,
      [selectedClass]: {
        ...prev[selectedClass as keyof typeof prev],
        [selectedDay]: {
          ...prev[selectedClass as keyof typeof prev][selectedDay as keyof typeof prev.bercario],
          [field]: value,
        }
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-purple-50/30 to-background relative">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm shadow-sm sticky top-0 z-40 border-b">
        <div className="container py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Creche Pimpolinhos" className="h-10" />
            <span className="font-fredoka text-lg font-bold hidden sm:inline">
              Pedagogia
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-purple-600 text-white font-semibold">
                  P
                </AvatarFallback>
              </Avatar>
              <span>Pedagoga Lucia (Demo)</span>
            </div>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Site
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container py-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="font-fredoka text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-purple-600" />
            Planejamento Pedagógico
          </h1>
          <p className="text-muted-foreground">
            Organize as atividades semanais para professores e auxiliares
          </p>
        </div>

        {/* Week Navigation */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={handlePrevWeek}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center">
                <p className="font-semibold">
                  Semana: {weekStart.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} - {weekEnd.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                </p>
              </div>
              <Button variant="outline" size="icon" onClick={handleNextWeek}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Class Selector */}
        <div className="flex gap-3 mb-6">
          {classTypes.map((cls) => {
            const Icon = cls.icon;
            return (
              <Button
                key={cls.value}
                variant={selectedClass === cls.value ? "default" : "outline"}
                onClick={() => setSelectedClass(cls.value)}
                className={`flex-1 gap-2 ${
                  selectedClass === cls.value ? "bg-purple-600 hover:bg-purple-700" : ""
                }`}
              >
                <Icon className="w-4 h-4" />
                {cls.label}
              </Button>
            );
          })}
        </div>

        {/* Day Tabs */}
        <Tabs value={String(selectedDay)} onValueChange={(v) => setSelectedDay(Number(v))}>
          <TabsList className="grid grid-cols-5 mb-4">
            {daysOfWeek.map((day) => (
              <TabsTrigger key={day.value} value={String(day.value)} className="text-xs sm:text-sm">
                {day.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {daysOfWeek.map((day) => (
            <TabsContent key={day.value} value={String(day.value)}>
              <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      {day.fullLabel}
                    </CardTitle>
                    <CardDescription>
                      {classTypes.find(c => c.value === selectedClass)?.label}
                    </CardDescription>
                  </div>
                  <Button
                    variant={isEditing ? "default" : "outline"}
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    className={isEditing ? "bg-purple-600 hover:bg-purple-700" : ""}
                  >
                    {isEditing ? (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar
                      </>
                    ) : (
                      <>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </>
                    )}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Morning Activities */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-base font-medium">
                      <Sun className="w-5 h-5 text-pimpo-yellow" />
                      Atividades da Manhã
                    </Label>
                    {isEditing ? (
                      <Textarea
                        value={currentPlan?.morningActivities || ""}
                        onChange={(e) => updatePlan("morningActivities", e.target.value)}
                        placeholder="Liste as atividades da manhã..."
                        rows={4}
                      />
                    ) : (
                      <div className="p-4 bg-yellow-50/50 rounded-lg border border-yellow-100">
                        <pre className="text-sm whitespace-pre-wrap font-sans">
                          {currentPlan?.morningActivities || "Nenhuma atividade definida"}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Afternoon Activities */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-base font-medium">
                      <Moon className="w-5 h-5 text-pimpo-blue" />
                      Atividades da Tarde
                    </Label>
                    {isEditing ? (
                      <Textarea
                        value={currentPlan?.afternoonActivities || ""}
                        onChange={(e) => updatePlan("afternoonActivities", e.target.value)}
                        placeholder="Liste as atividades da tarde..."
                        rows={4}
                      />
                    ) : (
                      <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                        <pre className="text-sm whitespace-pre-wrap font-sans">
                          {currentPlan?.afternoonActivities || "Nenhuma atividade definida"}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Materials */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-base font-medium">
                      <Package className="w-5 h-5 text-pimpo-green" />
                      Materiais Necessários
                    </Label>
                    {isEditing ? (
                      <Textarea
                        value={currentPlan?.materials || ""}
                        onChange={(e) => updatePlan("materials", e.target.value)}
                        placeholder="Liste os materiais necessários..."
                        rows={2}
                      />
                    ) : (
                      <div className="p-3 bg-green-50/50 rounded-lg border border-green-100">
                        <p className="text-sm">
                          {currentPlan?.materials || "Nenhum material listado"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Learning Objectives */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-base font-medium">
                      <Target className="w-5 h-5 text-purple-600" />
                      Objetivos de Aprendizagem
                    </Label>
                    {isEditing ? (
                      <Textarea
                        value={currentPlan?.objectives || ""}
                        onChange={(e) => updatePlan("objectives", e.target.value)}
                        placeholder="Descreva os objetivos pedagógicos..."
                        rows={2}
                      />
                    ) : (
                      <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-100">
                        <p className="text-sm">
                          {currentPlan?.objectives || "Nenhum objetivo definido"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {(isEditing || currentPlan?.notes) && (
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="flex items-center gap-2 text-base font-medium">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        Observações
                      </Label>
                      {isEditing ? (
                        <Textarea
                          value={currentPlan?.notes || ""}
                          onChange={(e) => updatePlan("notes", e.target.value)}
                          placeholder="Observações adicionais..."
                          rows={2}
                        />
                      ) : (
                        currentPlan?.notes && (
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">
                              {currentPlan.notes}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Quick Overview - All Classes */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              📋 Resumo Semanal - Todas as Turmas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              {classTypes.map((cls) => {
                const Icon = cls.icon;
                const classPlan = plans[cls.value as keyof typeof plans];
                return (
                  <Card
                    key={cls.value}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedClass === cls.value ? "ring-2 ring-purple-500" : ""
                    }`}
                    onClick={() => setSelectedClass(cls.value)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {cls.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {daysOfWeek.slice(0, 3).map((day) => {
                          const dayPlan = classPlan[day.value as keyof typeof classPlan];
                          return (
                            <div key={day.value} className="flex items-center gap-2 text-xs">
                              <Badge variant="outline" className="text-[10px] px-1">
                                {day.label.slice(0, 3)}
                              </Badge>
                              <span className="text-muted-foreground truncate">
                                {dayPlan?.morningActivities?.split("\n")[0]?.replace("• ", "") || "—"}
                              </span>
                            </div>
                          );
                        })}
                        <p className="text-xs text-muted-foreground mt-2">
                          + mais 2 dias...
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Post Creator */}
        <DemoQuickPostCreator userName="Pedagoga Lucia" userInitial="P" />
      </main>
    </div>
  );
}
