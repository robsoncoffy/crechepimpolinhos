import { vi } from "vitest";

// Helper to create a complete query builder mock
const createQueryBuilder = () => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  single: vi.fn(),
  limit: vi.fn().mockReturnThis(),
});

// Mock Supabase client for testing
export const mockSupabase = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },
  from: vi.fn(() => createQueryBuilder()),
  functions: {
    invoke: vi.fn(),
  },
};

// Helper to create query builder with custom responses
export const createMockQueryBuilder = (overrides: Record<string, unknown> = {}) => ({
  ...createQueryBuilder(),
  ...overrides,
});

// Reset all mocks
export const resetSupabaseMocks = () => {
  mockSupabase.auth.signUp.mockReset();
  mockSupabase.auth.signInWithPassword.mockReset();
  mockSupabase.auth.signOut.mockReset();
  mockSupabase.auth.getSession.mockReset().mockResolvedValue({ data: { session: null }, error: null });
  mockSupabase.auth.onAuthStateChange.mockReset().mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  mockSupabase.from.mockReset().mockImplementation(() => createQueryBuilder());
  mockSupabase.functions.invoke.mockReset();
};

// Mock valid employee invite
export const mockValidEmployeeInvite = {
  id: "test-invite-id",
  invite_code: "EMP123",
  role: "teacher",
  expires_at: new Date(Date.now() + 86400000).toISOString(), // 1 day in future
  is_used: false,
  employee_name: "Test Employee",
  employee_email: "employee@test.com",
};

// Mock valid parent invite
export const mockValidParentInvite = {
  id: "parent-invite-id",
  invite_code: "PAR123",
  child_name: "Test Child",
  email: "parent@test.com",
  phone: "(11) 99999-9999",
  expires_at: new Date(Date.now() + 86400000).toISOString(),
  used_by: null,
  pre_enrollment_id: null,
};

// Mock valid parent invite with pre-enrollment
export const mockParentInviteWithPreEnrollment = {
  ...mockValidParentInvite,
  pre_enrollment_id: "pre-enrollment-id",
};

// Mock pre-enrollment data
export const mockPreEnrollment = {
  parent_name: "Parent Name",
  email: "parent@test.com",
  phone: "(11) 99999-9999",
  cpf: "12345678901",
  child_name: "Child Name",
  child_birth_date: "2022-01-01",
  desired_class_type: "bercario1",
  desired_shift_type: "integral",
  vacancy_type: "particular",
};

// Mock auth user
export const mockAuthUser = {
  id: "test-user-id",
  email: "test@test.com",
  identities: [{ id: "identity-1" }],
};
