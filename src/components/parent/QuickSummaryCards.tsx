import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Baby, Calendar, MessageCircle, Heart } from "lucide-react";
import { differenceInYears, differenceInMonths, parseISO } from "date-fns";

interface Child {
  id: string;
  name: string;
  class_type: string | null;
  photo_url: string | null;
  birth_date: string | null;
  shift?: string | null;
}

interface QuickSummaryCardsProps {
  child: Child;
  unreadCount: number;
  onChatClick: () => void;
}

export function QuickSummaryCards({ child, unreadCount, onChatClick }: QuickSummaryCardsProps) {
  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return "Idade não informada";
    const birth = parseISO(birthDate);
    const years = differenceInYears(new Date(), birth);
    const months = differenceInMonths(new Date(), birth) % 12;
    
    if (years === 0) {
      return `${months} ${months === 1 ? 'mês' : 'meses'}`;
    }
    if (months === 0) {
      return `${years} ${years === 1 ? 'ano' : 'anos'}`;
    }
    return `${years} ${years === 1 ? 'ano' : 'anos'} e ${months} ${months === 1 ? 'mês' : 'meses'}`;
  };

  const getClassLabel = (classType: string | null) => {
    switch (classType) {
      case 'bercario': return 'Berçário';
      case 'maternal': return 'Maternal';
      case 'jardim': return 'Jardim';
      default: return 'Não definida';
    }
  };

  const getShiftLabel = (shift: string | null): string | null => {
    switch (shift) {
      case 'morning': return 'Manhã';
      case 'afternoon': return 'Tarde';
      case 'full_time': return 'Integral';
      default: return null;
    }
  };

  const getClassColor = (classType: string | null) => {
    switch (classType) {
      case 'bercario': return 'bg-pimpo-blue/10 text-pimpo-blue border-pimpo-blue/20';
      case 'maternal': return 'bg-pimpo-yellow/10 text-pimpo-yellow border-pimpo-yellow/20';
      case 'jardim': return 'bg-pimpo-green/10 text-pimpo-green border-pimpo-green/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const shiftLabel = getShiftLabel(child.shift);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Card da Criança */}
      <Card className="bg-gradient-to-br from-pimpo-blue/5 to-pimpo-blue/10 border-pimpo-blue/20 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              {child.photo_url ? (
                <img 
                  src={child.photo_url} 
                  alt={child.name}
                  className="w-16 h-16 rounded-full object-cover border-3 border-pimpo-blue/30 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pimpo-blue to-pimpo-blue/70 flex items-center justify-center shadow-md">
                  <Baby className="w-8 h-8 text-white" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-pimpo-green rounded-full border-2 border-white flex items-center justify-center">
                <Heart className="w-3 h-3 text-white fill-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-foreground truncate">{child.name}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {calculateAge(child.birth_date)}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant="outline" className={`text-xs font-medium ${getClassColor(child.class_type)}`}>
                  {getClassLabel(child.class_type)}
                </Badge>
                {shiftLabel && (
                  <Badge variant="outline" className="text-xs bg-pimpo-yellow/10 text-pimpo-yellow border-pimpo-yellow/20">
                    {shiftLabel}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card de Comunicação */}
      <Card 
        className="bg-gradient-to-br from-pimpo-green/5 to-pimpo-green/10 border-pimpo-green/20 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
        onClick={onChatClick}
      >
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pimpo-green to-pimpo-green/70 flex items-center justify-center shadow-md">
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-pimpo-red rounded-full border-2 border-white flex items-center justify-center animate-pulse">
                  <span className="text-xs font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-foreground">Mensagens</h3>
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0 
                  ? `${unreadCount} ${unreadCount === 1 ? 'nova mensagem' : 'novas mensagens'}`
                  : 'Nenhuma mensagem nova'
                }
              </p>
              <p className="text-xs text-pimpo-green font-medium mt-1">
                Clique para abrir o chat →
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
