import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  Heart, 
  Pill, 
  Stethoscope, 
  Phone,
  Users,
  UserPlus,
  AlertCircle,
  Shield,
  FileText,
  Loader2
} from "lucide-react";
import { InviteSecondGuardian } from "@/components/child/InviteSecondGuardian";

interface ChildProfileTabProps {
  childId: string;
  childName: string;
  inviterName: string;
}

interface ChildDetails {
  allergies: string | null;
  medical_info: string | null;
  pediatrician_name: string | null;
  pediatrician_phone: string | null;
}

interface AuthorizedPickup {
  id: string;
  full_name: string;
  relationship: string;
  document_url: string | null;
}

export function ChildProfileTab({ childId, childName, inviterName }: ChildProfileTabProps) {
  const [childDetails, setChildDetails] = useState<ChildDetails | null>(null);
  const [authorizedPickups, setAuthorizedPickups] = useState<AuthorizedPickup[]>([]);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChildData = async () => {
      setLoading(true);

      // Fetch child details
      const { data: childData } = await supabase
        .from('children')
        .select('allergies, medical_info, pediatrician_name, pediatrician_phone')
        .eq('id', childId)
        .single();

      if (childData) {
        setChildDetails(childData);
      }

      // Fetch registration ID
      const { data: regData, error: regError } = await supabase
        .from('child_registrations')
        .select('id')
        .eq('child_id', childId)
        .maybeSingle();

      if (!regError && regData && regData.id) {
        setRegistrationId(regData.id);
        
        // Fetch authorized pickups from the dedicated table
        const { data: pickupsData } = await supabase
          .from('authorized_pickups')
          .select('id, full_name, relationship, document_url')
          .eq('registration_id', regData.id);

        if (pickupsData) {
          setAuthorizedPickups(pickupsData);
        }
      }

      setLoading(false);
    };

    fetchChildData();
  }, [childId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-pimpo-blue" />
      </div>
    );
  }

  const hasAllergies = childDetails?.allergies && childDetails.allergies.trim() !== '';
  const hasMedicalInfo = childDetails?.medical_info && childDetails.medical_info.trim() !== '';
  const hasPediatrician = childDetails?.pediatrician_name && childDetails.pediatrician_name.trim() !== '';

  return (
    <div className="space-y-6">
      {/* Informações Médicas */}
      <Card className="border-2 border-pimpo-red/20 bg-gradient-to-br from-pimpo-red/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-pimpo-red">
            <Heart className="w-5 h-5" />
            Informações de Saúde
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alergias */}
          <div className="bg-background/60 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-pimpo-red" />
              <span className="font-semibold text-sm">Alergias</span>
            </div>
            {hasAllergies ? (
              <div className="flex flex-wrap gap-2">
                {childDetails.allergies!.split(',').map((allergy, index) => (
                  <Badge key={index} variant="destructive" className="bg-pimpo-red/10 text-pimpo-red border-pimpo-red/20">
                    {allergy.trim()}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma alergia informada</p>
            )}
          </div>

          {/* Informações Médicas Gerais */}
          <div className="bg-background/60 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Pill className="w-4 h-4 text-pimpo-blue" />
              <span className="font-semibold text-sm">Informações Médicas</span>
            </div>
            {hasMedicalInfo ? (
              <p className="text-sm text-foreground">{childDetails.medical_info}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma informação médica adicional</p>
            )}
          </div>

          {/* Pediatra */}
          <div className="bg-background/60 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="w-4 h-4 text-pimpo-green" />
              <span className="font-semibold text-sm">Pediatra</span>
            </div>
            {hasPediatrician ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{childDetails.pediatrician_name}</p>
                {childDetails.pediatrician_phone && (
                  <a 
                    href={`tel:${childDetails.pediatrician_phone}`}
                    className="text-sm text-pimpo-blue flex items-center gap-1 hover:underline"
                  >
                    <Phone className="w-3 h-3" />
                    {childDetails.pediatrician_phone}
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Pediatra não informado</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pessoas Autorizadas */}
      <Card className="border-2 border-pimpo-green/20 bg-gradient-to-br from-pimpo-green/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-pimpo-green">
            <Shield className="w-5 h-5" />
            Pessoas Autorizadas para Retirada
          </CardTitle>
        </CardHeader>
        <CardContent>
          {authorizedPickups.length > 0 ? (
            <div className="grid gap-3">
              {authorizedPickups.map((person) => (
                <div 
                  key={person.id}
                  className="bg-background/60 rounded-lg p-4 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pimpo-green to-pimpo-green/70 flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {person.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{person.full_name}</p>
                    <Badge variant="outline" className="text-xs bg-pimpo-blue/10 text-pimpo-blue border-pimpo-blue/20 mt-1">
                      {person.relationship}
                    </Badge>
                  </div>
                  {person.document_url && (
                    <a 
                      href={person.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pimpo-blue hover:text-pimpo-blue/80"
                    >
                      <FileText className="w-5 h-5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma pessoa autorizada cadastrada</p>
              <p className="text-xs mt-1">Adicione pessoas autorizadas no cadastro da criança</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Convidar Segundo Responsável */}
      <Card className="border-2 border-pimpo-yellow/20 bg-gradient-to-br from-pimpo-yellow/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-pimpo-yellow">
            <UserPlus className="w-5 h-5" />
            Compartilhar Acesso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Convide outro responsável (pai, mãe ou tutor) para também acompanhar as atividades de {childName} na escola.
          </p>
          {registrationId && (
            <InviteSecondGuardian 
              childRegistrationId={registrationId}
              childName={childName}
              inviterName={inviterName}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
