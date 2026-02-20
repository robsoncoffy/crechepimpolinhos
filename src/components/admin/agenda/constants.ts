import { MealStatus, EvacuationStatus, MoodStatus, AgendaFormData } from "./types";

export const mealOptions: { value: MealStatus; label: string; color: string }[] = [
    { value: "nao_aceitou", label: "Não aceitou", color: "bg-destructive" },
    { value: "pouco", label: "Pouco", color: "bg-pimpo-yellow" },
    { value: "metade", label: "Metade", color: "bg-pimpo-yellow/70" },
    { value: "quase_tudo", label: "Quase tudo", color: "bg-pimpo-green/70" },
    { value: "tudo", label: "Tudo", color: "bg-pimpo-green" },
];

export const evacuationOptions: { value: EvacuationStatus; label: string; color: string }[] = [
    { value: "nao", label: "Não evacuou", color: "bg-muted" },
    { value: "normal", label: "Normal", color: "bg-pimpo-green" },
    { value: "pastosa", label: "Pastosa", color: "bg-pimpo-yellow" },
    { value: "liquida", label: "Líquida", color: "bg-destructive" },
];

export const moodOptions: { value: MoodStatus; label: string; emoji: string; color: string }[] = [
    { value: "feliz", label: "Feliz", emoji: "😄", color: "bg-pimpo-green" },
    { value: "calmo", label: "Calmo", emoji: "😊", color: "bg-pimpo-blue" },
    { value: "agitado", label: "Agitado", emoji: "🤪", color: "bg-pimpo-yellow" },
    { value: "choroso", label: "Choroso", emoji: "😢", color: "bg-pimpo-red/70" },
    { value: "sonolento", label: "Sonolento", emoji: "😴", color: "bg-muted" },
];

export const defaultFormData: AgendaFormData = {
    breakfast: null,
    lunch: null,
    snack: null,
    dinner: null,
    slept_morning: false,
    slept_afternoon: false,
    sleep_notes: "",
    urinated: false,
    evacuated: null,
    mood: null,
    had_fever: false,
    temperature: "",
    took_medicine: false,
    medicine_notes: "",
    activities: "",
    school_notes: "",
};
