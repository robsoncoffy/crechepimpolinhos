import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Shield, 
  UserPlus, 
  FileText, 
  Trash2, 
  Upload, 
  Loader2,
  Users 
} from "lucide-react";

interface AuthorizedPickup {
  id: string;
  full_name: string;
  relationship: string;
  document_url: string | null;
  is_approved: boolean | null;
}

interface AuthorizedPickupsManagerProps {
  childId: string;
  childName: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_DOC_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

export function AuthorizedPickupsManager({ childId, childName }: AuthorizedPickupsManagerProps) {
  const [authorizedPickups, setAuthorizedPickups] = useState<AuthorizedPickup[]>([]);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state for new pickup
  const [newPickupName, setNewPickupName] = useState("");
  const [newPickupRelationship, setNewPickupRelationship] = useState("");
  const [newPickupFile, setNewPickupFile] = useState<File | null>(null);

  useEffect(() => {
    fetchAuthorizedPickups();
  }, [childId, childName]);

  const fetchAuthorizedPickups = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get first name from child name
      const firstName = childName.split(' ')[0];
      
      // Find the registration by parent_id and first_name match
      const { data: regData } = await supabase
        .from('child_registrations')
        .select('id')
        .eq('parent_id', user.id)
        .ilike('first_name', firstName)
        .limit(1);

      if (regData && regData.length > 0) {
        const regId = regData[0].id;
        setRegistrationId(regId);
        
        // Fetch authorized pickups
        const { data: pickupsData } = await supabase
          .from('authorized_pickups')
          .select('id, full_name, relationship, document_url, is_approved')
          .eq('registration_id', regId);

        if (pickupsData) {
          setAuthorizedPickups(pickupsData);
        }
      }
    } catch (error) {
      console.error("Error fetching authorized pickups:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error("Arquivo muito grande. Máximo 5MB.");
        return;
      }
      if (!ACCEPTED_DOC_TYPES.includes(file.type)) {
        toast.error("Formato inválido. Use JPG, PNG, WebP ou PDF.");
        return;
      }
      setNewPickupFile(file);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `authorized-pickups/${user.id}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('child-documents')
      .upload(fileName, file);
    
    if (error) {
      console.error('Upload error:', error);
      return null;
    }
    
    const { data } = supabase.storage
      .from('child-documents')
      .getPublicUrl(fileName);
    
    return data.publicUrl;
  };

  const handleAddPickup = async () => {
    if (!registrationId) {
      toast.error("Não foi possível encontrar o registro da criança.");
      return;
    }

    if (!newPickupName.trim() || !newPickupRelationship.trim()) {
      toast.error("Preencha o nome e o grau de parentesco.");
      return;
    }

    setIsSaving(true);
    try {
      let documentUrl: string | null = null;
      if (newPickupFile) {
        documentUrl = await uploadFile(newPickupFile);
      }

      const { error } = await supabase
        .from('authorized_pickups')
        .insert({
          registration_id: registrationId,
          full_name: newPickupName.trim(),
          relationship: newPickupRelationship.trim(),
          document_url: documentUrl,
          is_approved: false,
        });

      if (error) throw error;

      toast.success("Pessoa autorizada adicionada! Aguardando aprovação da escola.");
      setNewPickupName("");
      setNewPickupRelationship("");
      setNewPickupFile(null);
      setIsAddDialogOpen(false);
      fetchAuthorizedPickups();
    } catch (error) {
      console.error("Error adding authorized pickup:", error);
      toast.error("Erro ao adicionar pessoa autorizada.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePickup = async (pickupId: string) => {
    if (!confirm("Tem certeza que deseja remover esta pessoa autorizada?")) return;

    try {
      const { error } = await supabase
        .from('authorized_pickups')
        .delete()
        .eq('id', pickupId);

      if (error) throw error;

      toast.success("Pessoa removida com sucesso.");
      fetchAuthorizedPickups();
    } catch (error) {
      console.error("Error deleting authorized pickup:", error);
      toast.error("Erro ao remover pessoa autorizada.");
    }
  };

  if (loading) {
    return (
      <Card className="border-2 border-pimpo-green/20 bg-gradient-to-br from-pimpo-green/5 to-transparent">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-pimpo-green" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-pimpo-green/20 bg-gradient-to-br from-pimpo-green/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 text-pimpo-green">
              <Shield className="w-5 h-5" />
              Pessoas Autorizadas para Retirada
            </CardTitle>
            <CardDescription className="mt-1">
              Gerencie quem pode retirar {childName.split(' ')[0]} da escola
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Adicionar</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Pessoa Autorizada</DialogTitle>
                <DialogDescription>
                  Esta pessoa poderá retirar {childName.split(' ')[0]} da escola após aprovação.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="pickup-name">Nome Completo *</Label>
                  <Input
                    id="pickup-name"
                    placeholder="Nome completo da pessoa"
                    value={newPickupName}
                    onChange={(e) => setNewPickupName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup-relationship">Grau de Parentesco *</Label>
                  <Input
                    id="pickup-relationship"
                    placeholder="Ex: Avó, Tio, Vizinha"
                    value={newPickupRelationship}
                    onChange={(e) => setNewPickupRelationship(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Documento (RG ou CNH)</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                    {newPickupFile ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <span className="text-sm truncate max-w-[200px]">{newPickupFile.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setNewPickupFile(null)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                        <p className="text-sm text-muted-foreground">
                          Clique para anexar documento
                        </p>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Documento obrigatório para aprovação pela escola
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddPickup} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Adicionar"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {authorizedPickups.length > 0 ? (
          <div className="grid gap-3">
            {authorizedPickups.map((person) => (
              <div 
                key={person.id}
                className="bg-background/60 rounded-lg p-4 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pimpo-green to-pimpo-green/70 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
                  {person.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{person.full_name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs bg-pimpo-blue/10 text-pimpo-blue border-pimpo-blue/20">
                      {person.relationship}
                    </Badge>
                    {person.is_approved ? (
                      <Badge className="text-xs bg-pimpo-green text-white">
                        Aprovado
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Aguardando aprovação
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {person.document_url && (
                    <a 
                      href={person.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pimpo-blue hover:text-pimpo-blue/80 p-2"
                      title="Ver documento"
                    >
                      <FileText className="w-5 h-5" />
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeletePickup(person.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma pessoa autorizada cadastrada</p>
            <p className="text-xs mt-1">Clique em "Adicionar" para cadastrar</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
