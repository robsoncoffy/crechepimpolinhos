export interface StaffMember {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
    employee_profile_id: string | null;
    job_title: string | null;
    photo_url: string | null;
    salary: number | null;
    net_salary: number | null;
    salary_payment_day: number | null;
    hire_date: string | null;
}
