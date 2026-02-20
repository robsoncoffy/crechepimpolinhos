import { Database } from "@/integrations/supabase/types";

export type ClassType = Database["public"]["Enums"]["class_type"];
export type ShiftType = Database["public"]["Enums"]["shift_type"];

export interface TeacherAssignment {
    id: string;
    user_id: string;
    class_type: ClassType;
    shift_type: ShiftType;
    is_primary: boolean;
}

export interface Teacher {
    id: string;
    user_id: string;
    full_name: string;
    phone: string | null;
    status: string;
    created_at: string;
    email?: string;
    assignment?: TeacherAssignment | null;
}
