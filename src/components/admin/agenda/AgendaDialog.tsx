import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Baby, Utensils, Moon, Droplets, Heart, Thermometer, Pill, FileText, Save, Smile, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { classTypeLabels } from "@/lib/constants";
import { Child, DailyRecord, AgendaFormData, MealStatus, EvacuationStatus } from "./types";
import { mealOptions, evacuationOptions, moodOptions, defaultFormData } from "./constants";

function MealSelector({
    value,
    onChange,
    label,
}: {
    value: MealStatus | null;
    onChange: (val: MealStatus) => void;
    label: string;
}) {
    return (
        <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
            <div className="flex gap-1 flex-wrap">
                {mealOptions.map((opt) => (
                    <Button
                        key={opt.value}
                        type="button"
                        size="sm"
                        variant={value === opt.value ? "default" : "outline"}
                        className={cn(
                            "text-xs h-7 px-2",
                            value === opt.value && opt.color,
                            value === opt.value && "text-white border-0"
                        )}
                        onClick={() => onChange(opt.value)}
                    >
                        {opt.label}
                    </Button>
                ))}
            </div>
        </div>
    );
}

function EvacuationSelector({
    value,
    onChange,
}: {
    value: EvacuationStatus | null;
    onChange: (val: EvacuationStatus) => void;
}) {
    return (
        <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Evacuação</Label>
            <div className="flex gap-1 flex-wrap">
                {evacuationOptions.map((opt) => (
                    <Button
                        key={opt.value}
                        type="button"
                        size="sm"
                        variant={value === opt.value ? "default" : "outline"}
                        className={cn(
                            "text-xs h-7 px-2",
                            value === opt.value && opt.color,
                            value === opt.value && "text-white border-0"
                        )}
                        onClick={() => onChange(opt.value)}
                    >
                        {opt.label}
                    </Button>
                ))}
            </div>
        </div>
    );
}

interface AgendaDialogProps {
    child: Child;
    record: DailyRecord | null;
    date: Date;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: AgendaFormData) => void;
    isPending: boolean;
}

export function AgendaDialog({
    child,
    record,
    date,
    open,
    onOpenChange,
    onSave,
    isPending,
}: AgendaDialogProps) {
    const [formData, setFormData] = useState<AgendaFormData>(defaultFormData);

    useEffect(() => {
        if (record && open) {
            setFormData({
                breakfast: record.breakfast,
                lunch: record.lunch,
                snack: record.snack,
                dinner: record.dinner,
                slept_morning: record.slept_morning || false,
                slept_afternoon: record.slept_afternoon || false,
                sleep_notes: record.sleep_notes || "",
                urinated: record.urinated || false,
                evacuated: record.evacuated,
                mood: (record as any).mood || null,
                had_fever: record.had_fever || false,
                temperature: record.temperature?.toString() || "",
                took_medicine: record.took_medicine || false,
                medicine_notes: record.medicine_notes || "",
                activities: record.activities || "",
                school_notes: record.school_notes || "",
            });
        } else if (open) {
            setFormData(defaultFormData);
        }
    }, [record, open]);

    const handleSave = () => {
        onSave(formData);
    };

    const age = child.birth_date
        ? Math.floor(
            (new Date().getTime() - new Date(child.birth_date).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25)
        )
        : 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
                    <DialogTitle className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Baby className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <p className="font-fredoka text-xl">{child.full_name}</p>
                            <p className="text-sm text-muted-foreground font-normal">
                                {classTypeLabels[child.class_type]} • {age} {age === 1 ? "ano" : "anos"} •{" "}
                                {date.toLocaleDateString("pt-BR", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                })}
                            </p>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1 max-h-[calc(90vh-180px)]">
                    <div className="p-6 space-y-6">
                        {/* Refeições */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Utensils className="w-4 h-4 text-pimpo-yellow" />
                                    Refeições
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid sm:grid-cols-2 gap-4">
                                <MealSelector
                                    label="Café da Manhã"
                                    value={formData.breakfast}
                                    onChange={(val) => setFormData((p) => ({ ...p, breakfast: val }))}
                                />
                                <MealSelector
                                    label="Almoço"
                                    value={formData.lunch}
                                    onChange={(val) => setFormData((p) => ({ ...p, lunch: val }))}
                                />
                                <MealSelector
                                    label="Lanche"
                                    value={formData.snack}
                                    onChange={(val) => setFormData((p) => ({ ...p, snack: val }))}
                                />
                                <MealSelector
                                    label="Jantar"
                                    value={formData.dinner}
                                    onChange={(val) => setFormData((p) => ({ ...p, dinner: val }))}
                                />
                            </CardContent>
                        </Card>

                        {/* Sono */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Moon className="w-4 h-4 text-primary" />
                                    Sono
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-wrap gap-6">
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            id="sleep-morning"
                                            checked={formData.slept_morning}
                                            onCheckedChange={(val) =>
                                                setFormData((p) => ({ ...p, slept_morning: val }))
                                            }
                                        />
                                        <Label htmlFor="sleep-morning" className="text-sm">
                                            Dormiu de manhã
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            id="sleep-afternoon"
                                            checked={formData.slept_afternoon}
                                            onCheckedChange={(val) =>
                                                setFormData((p) => ({ ...p, slept_afternoon: val }))
                                            }
                                        />
                                        <Label htmlFor="sleep-afternoon" className="text-sm">
                                            Dormiu à tarde
                                        </Label>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">
                                        Observações sobre o sono
                                    </Label>
                                    <Textarea
                                        placeholder="Ex: Dormiu 2h, acordou bem disposto..."
                                        value={formData.sleep_notes}
                                        onChange={(e) =>
                                            setFormData((p) => ({ ...p, sleep_notes: e.target.value }))
                                        }
                                        className="mt-1 resize-none"
                                        rows={2}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Higiene */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Droplets className="w-4 h-4 text-pimpo-green" />
                                    Higiene
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Switch
                                        id="urinated"
                                        checked={formData.urinated}
                                        onCheckedChange={(val) =>
                                            setFormData((p) => ({ ...p, urinated: val }))
                                        }
                                    />
                                    <Label htmlFor="urinated" className="text-sm">
                                        Urinou normalmente
                                    </Label>
                                </div>
                                <EvacuationSelector
                                    value={formData.evacuated}
                                    onChange={(val) => setFormData((p) => ({ ...p, evacuated: val }))}
                                />
                            </CardContent>
                        </Card>

                        {/* Saúde */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Heart className="w-4 h-4 text-pimpo-red" />
                                    Saúde
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-wrap gap-6">
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            id="fever"
                                            checked={formData.had_fever}
                                            onCheckedChange={(val) =>
                                                setFormData((p) => ({ ...p, had_fever: val }))
                                            }
                                        />
                                        <Label htmlFor="fever" className="text-sm flex items-center gap-1">
                                            <Thermometer className="w-3 h-3" />
                                            Teve febre
                                        </Label>
                                    </div>
                                    {formData.had_fever && (
                                        <div className="flex items-center gap-2">
                                            <Label className="text-xs text-muted-foreground">Temp.:</Label>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                placeholder="37.5"
                                                value={formData.temperature}
                                                onChange={(e) =>
                                                    setFormData((p) => ({ ...p, temperature: e.target.value }))
                                                }
                                                className="w-20 h-8"
                                            />
                                            <span className="text-xs text-muted-foreground">°C</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            id="medicine"
                                            checked={formData.took_medicine}
                                            onCheckedChange={(val) =>
                                                setFormData((p) => ({ ...p, took_medicine: val }))
                                            }
                                        />
                                        <Label htmlFor="medicine" className="text-sm flex items-center gap-1">
                                            <Pill className="w-3 h-3" />
                                            Tomou medicamento
                                        </Label>
                                    </div>
                                    {formData.took_medicine && (
                                        <Textarea
                                            placeholder="Nome do medicamento, dosagem e horário..."
                                            value={formData.medicine_notes}
                                            onChange={(e) =>
                                                setFormData((p) => ({ ...p, medicine_notes: e.target.value }))
                                            }
                                            className="resize-none"
                                            rows={2}
                                        />
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Humor do Dia */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Smile className="w-4 h-4 text-pimpo-yellow" />
                                    Humor do Dia
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2 flex-wrap">
                                    {moodOptions.map((opt) => (
                                        <Button
                                            key={opt.value}
                                            type="button"
                                            size="sm"
                                            variant={formData.mood === opt.value ? "default" : "outline"}
                                            className={cn(
                                                "text-xs h-8 px-3 gap-1",
                                                formData.mood === opt.value && opt.color,
                                                formData.mood === opt.value && "text-white border-0"
                                            )}
                                            onClick={() => setFormData((p) => ({ ...p, mood: opt.value }))}
                                        >
                                            <span>{opt.emoji}</span>
                                            {opt.label}
                                        </Button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Atividades */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    Atividades do Dia
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    placeholder="Ex: Pintura com guache, brincadeiras no parque, contação de histórias..."
                                    value={formData.activities}
                                    onChange={(e) =>
                                        setFormData((p) => ({ ...p, activities: e.target.value }))
                                    }
                                    className="resize-none"
                                    rows={3}
                                />
                            </CardContent>
                        </Card>

                        {/* Bilhetinho da Escola */}
                        <Card className="border-primary/30 bg-primary/5">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base text-primary">
                                    <MessageSquare className="w-4 h-4" />
                                    Bilhetinho da Escola
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground mb-2">
                                    Escreva uma mensagem personalizada sobre como foi o dia desta criança.
                                </p>
                                <Textarea
                                    placeholder="Ex: Hoje a Maria estava muito animada! Participou de todas as atividades e brincou bastante com os coleguinhas. Comeu bem no almoço e dormiu tranquila à tarde. Um dia muito especial! 💕"
                                    value={formData.school_notes}
                                    onChange={(e) =>
                                        setFormData((p) => ({ ...p, school_notes: e.target.value }))
                                    }
                                    className="resize-none border-primary/30"
                                    rows={4}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </ScrollArea>

                <div className="px-6 py-4 border-t bg-muted/30 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Salvar Agenda
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
