import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Heart, 
  Pill, 
  Stethoscope, 
  Phone,
  UserPlus,
  AlertCircle,
  Loader2,
  Pencil,
  Save,
  X
} from "lucide-react";
import { InviteSecondGuardian } from "@/components/child/InviteSecondGuardian";
import { AuthorizedPickupsManager } from "@/components/parent/AuthorizedPickupsManager";

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

export function ChildProfileTab({ childId, childName, inviterName }: ChildProfileTabProps) {
  const [childDetails, setChildDetails] = useState<ChildDetails | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [editAllergies, setEditAllergies] = useState("");
  const [editMedicalInfo, setEditMedicalInfo] = useState("");
  const [editPediatricianName, setEditPediatricianName] = useState("");
  const [editPediatricianPhone, setEditPediatricianPhone] = useState("");

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
        // Initialize form with current values
        setEditAllergies(childData.allergies || "");
        setEditMedicalInfo(childData.medical_info || "");
        setEditPediatricianName(childData.pediatrician_name || "");
        setEditPediatricianPhone(childData.pediatrician_phone || "");
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const firstName = childName.split(' ')[0];
        
        const { data: regData } = await supabase
          .from('child_registrations')
          .select('id')
          .eq('parent_id', user.id)
          .ilike('first_name', firstName)
          .limit(1);

        if (regData && regData.length > 0) {
          setRegistrationId(regData[0].id);
        }
      }

      setLoading(false);
    };

    fetchChildData();
  }, [childId, childName]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('children')
        .update({
          allergies: editAllergies.trim() || null,
          medical_info: editMedicalInfo.trim() || null,
          pediatrician_name: editPediatricianName.trim() || null,
          pediatrician_phone: editPediatricianPhone.trim() || null,
        })
        .eq('id', childId);

      if (error) throw error;

      // Update local state
      setChildDetails({
        allergies: editAllergies.trim() || null,
        medical_info: editMedicalInfo.trim() || null,
        pediatrician_name: editPediatricianName.trim() || null,
        pediatrician_phone: editPediatricianPhone.trim() || null,
      });
      
      setIsEditing(false);
      toast.success("Informações atualizadas com sucesso!");
    } catch (error) {
      console.error("Error updating child info:", error);
      toast.error("Erro ao atualizar informações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to current values
    setEditAllergies(childDetails?.allergies || "");
    setEditMedicalInfo(childDetails?.medical_info || "");
    setEditPediatricianName(childDetails?.pediatrician_name || "");
    setEditPediatricianPhone(childDetails?.pediatrician_phone || "");
    setIsEditing(false);
  };

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2 text-pimpo-red">
                <Heart className="w-5 h-5" />
                Informações de Saúde
              </CardTitle>
              <CardDescription className="mt-1">
                Mantenha as informações de saúde de {childName.split(' ')[0]} atualizadas
              </CardDescription>
            </div>
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-1.5"
              >
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="gap-1.5"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Salvar</span>
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            // Edit mode
            <>
              <div className="space-y-2">
                <Label htmlFor="allergies" className="flex items-center gap-2 text-sm font-medium">
                  <AlertCircle className="w-4 h-4 text-pimpo-red" />
                  Alergias
                </Label>
                <Textarea
                  id="allergies"
                  placeholder="Ex: Amendoim, Leite, Glúten (separados por vírgula)"
                  value={editAllergies}
                  onChange={(e) => setEditAllergies(e.target.value)}
                  className="resize-none"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Separe múltiplas alergias por vírgula
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="medicalInfo" className="flex items-center gap-2 text-sm font-medium">
                  <Pill className="w-4 h-4 text-pimpo-blue" />
                  Informações Médicas
                </Label>
                <Textarea
                  id="medicalInfo"
                  placeholder="Condições médicas, medicamentos em uso, observações importantes..."
                  value={editMedicalInfo}
                  onChange={(e) => setEditMedicalInfo(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pediatricianName" className="flex items-center gap-2 text-sm font-medium">
                    <Stethoscope className="w-4 h-4 text-pimpo-green" />
                    Nome do Pediatra
                  </Label>
                  <Input
                    id="pediatricianName"
                    placeholder="Dr(a). Nome"
                    value={editPediatricianName}
                    onChange={(e) => setEditPediatricianName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pediatricianPhone" className="flex items-center gap-2 text-sm font-medium">
                    <Phone className="w-4 h-4 text-pimpo-green" />
                    Telefone
                  </Label>
                  <Input
                    id="pediatricianPhone"
                    placeholder="(51) 99999-9999"
                    value={editPediatricianPhone}
                    onChange={(e) => setEditPediatricianPhone(e.target.value)}
                  />
                </div>
              </div>
            </>
          ) : (
            // View mode
            <>
              {/* Alergias */}
              <div className="bg-background/60 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-pimpo-red" />
                  <span className="font-semibold text-sm">Alergias</span>
                </div>
                {hasAllergies ? (
                  <div className="flex flex-wrap gap-2">
                    {childDetails.allergies!.split(',').map((allergy, index) => (
                      <span 
                        key={index} 
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-pimpo-red/10 text-pimpo-red border border-pimpo-red/20"
                      >
                        {allergy.trim()}
                      </span>
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Pessoas Autorizadas */}
      <AuthorizedPickupsManager childId={childId} childName={childName} />

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
            Convide outro responsável (pai, mãe ou tutor) para também acompanhar as atividades de {childName.split(' ')[0]} na escola.
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
