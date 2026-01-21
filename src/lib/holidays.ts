// Brazilian National and Regional Holidays (São Paulo)
// Format: MM-DD for recurring, YYYY-MM-DD for specific dates

export interface Holiday {
  date: string; // MM-DD for recurring, YYYY-MM-DD for specific
  name: string;
  type: "national" | "regional" | "school";
  recurring?: boolean;
}

// National holidays that occur every year
export const nationalHolidays: Holiday[] = [
  { date: "01-01", name: "Confraternização Universal", type: "national", recurring: true },
  { date: "04-21", name: "Tiradentes", type: "national", recurring: true },
  { date: "05-01", name: "Dia do Trabalho", type: "national", recurring: true },
  { date: "09-07", name: "Independência do Brasil", type: "national", recurring: true },
  { date: "10-12", name: "Nossa Senhora Aparecida", type: "national", recurring: true },
  { date: "11-02", name: "Finados", type: "national", recurring: true },
  { date: "11-15", name: "Proclamação da República", type: "national", recurring: true },
  { date: "12-25", name: "Natal", type: "national", recurring: true },
];

// Regional holidays (São Paulo)
export const regionalHolidays: Holiday[] = [
  { date: "01-25", name: "Aniversário de São Paulo", type: "regional", recurring: true },
  { date: "07-09", name: "Revolução Constitucionalista", type: "regional", recurring: true },
  { date: "11-20", name: "Consciência Negra", type: "regional", recurring: true },
];

// Variable holidays (need to be calculated or updated yearly)
export const variableHolidays2025: Holiday[] = [
  { date: "2025-03-03", name: "Carnaval", type: "national" },
  { date: "2025-03-04", name: "Carnaval", type: "national" },
  { date: "2025-03-05", name: "Quarta-feira de Cinzas", type: "national" },
  { date: "2025-04-18", name: "Sexta-feira Santa", type: "national" },
  { date: "2025-04-20", name: "Páscoa", type: "national" },
  { date: "2025-06-19", name: "Corpus Christi", type: "national" },
];

export const variableHolidays2026: Holiday[] = [
  { date: "2026-02-16", name: "Carnaval", type: "national" },
  { date: "2026-02-17", name: "Carnaval", type: "national" },
  { date: "2026-02-18", name: "Quarta-feira de Cinzas", type: "national" },
  { date: "2026-04-03", name: "Sexta-feira Santa", type: "national" },
  { date: "2026-04-05", name: "Páscoa", type: "national" },
  { date: "2026-06-04", name: "Corpus Christi", type: "national" },
];

// School-specific holidays/events
export const schoolHolidays: Holiday[] = [
  { date: "01-20", name: "Início das Aulas", type: "school", recurring: true },
  { date: "07-01", name: "Início Férias de Julho", type: "school", recurring: true },
  { date: "07-31", name: "Fim Férias de Julho", type: "school", recurring: true },
  { date: "12-15", name: "Início Férias de Verão", type: "school", recurring: true },
];

// Helper function to check if a date is a holiday
export function isHoliday(date: Date): Holiday | null {
  const year = date.getFullYear();
  const monthDay = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const fullDate = `${year}-${monthDay}`;

  // Check recurring national holidays
  const nationalMatch = nationalHolidays.find((h) => h.date === monthDay);
  if (nationalMatch) return nationalMatch;

  // Check recurring regional holidays
  const regionalMatch = regionalHolidays.find((h) => h.date === monthDay);
  if (regionalMatch) return regionalMatch;

  // Check variable holidays for the specific year
  const variableHolidays = year === 2025 ? variableHolidays2025 : year === 2026 ? variableHolidays2026 : [];
  const variableMatch = variableHolidays.find((h) => h.date === fullDate);
  if (variableMatch) return variableMatch;

  // Check school holidays
  const schoolMatch = schoolHolidays.find((h) => h.date === monthDay);
  if (schoolMatch) return schoolMatch;

  return null;
}

// Check if a date is a weekend
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Get all holidays for a given month
export function getHolidaysForMonth(year: number, month: number): Holiday[] {
  const holidays: Holiday[] = [];
  const monthStr = String(month + 1).padStart(2, "0");

  // Add recurring national holidays for this month
  nationalHolidays.forEach((h) => {
    if (h.date.startsWith(monthStr)) {
      holidays.push(h);
    }
  });

  // Add recurring regional holidays for this month
  regionalHolidays.forEach((h) => {
    if (h.date.startsWith(monthStr)) {
      holidays.push(h);
    }
  });

  // Add variable holidays for this month
  const variableHolidays = year === 2025 ? variableHolidays2025 : year === 2026 ? variableHolidays2026 : [];
  variableHolidays.forEach((h) => {
    if (h.date.startsWith(`${year}-${monthStr}`)) {
      holidays.push(h);
    }
  });

  // Add school holidays for this month
  schoolHolidays.forEach((h) => {
    if (h.date.startsWith(monthStr)) {
      holidays.push(h);
    }
  });

  return holidays;
}

// Get all holidays for a year
export function getAllHolidays(year: number): { date: Date; holiday: Holiday }[] {
  const result: { date: Date; holiday: Holiday }[] = [];

  // Add recurring national holidays
  nationalHolidays.forEach((h) => {
    const [month, day] = h.date.split("-").map(Number);
    result.push({ date: new Date(year, month - 1, day), holiday: h });
  });

  // Add recurring regional holidays
  regionalHolidays.forEach((h) => {
    const [month, day] = h.date.split("-").map(Number);
    result.push({ date: new Date(year, month - 1, day), holiday: h });
  });

  // Add variable holidays
  const variableHolidays = year === 2025 ? variableHolidays2025 : year === 2026 ? variableHolidays2026 : [];
  variableHolidays.forEach((h) => {
    const [y, month, day] = h.date.split("-").map(Number);
    result.push({ date: new Date(y, month - 1, day), holiday: h });
  });

  // Add school holidays
  schoolHolidays.forEach((h) => {
    const [month, day] = h.date.split("-").map(Number);
    result.push({ date: new Date(year, month - 1, day), holiday: h });
  });

  return result.sort((a, b) => a.date.getTime() - b.date.getTime());
}
