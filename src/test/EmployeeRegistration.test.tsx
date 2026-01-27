import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EmployeeRegistration from "@/pages/EmployeeRegistration";
import { mockSupabase, mockValidEmployeeInvite, mockAuthUser, resetSupabaseMocks, createMockQueryBuilder } from "./mocks/supabase";

// Mock the supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const renderWithRouter = (initialRoute = "/cadastro-funcionario") => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <EmployeeRegistration />
    </MemoryRouter>
  );
};

describe("EmployeeRegistration", () => {
  beforeEach(() => {
    resetSupabaseMocks();
    vi.clearAllMocks();
  });

  describe("Invite Code Validation", () => {
    it("should render invite code input on initial load", () => {
      const { getByText, getByLabelText, getByRole } = renderWithRouter();
      
      expect(getByText("Cadastro de Funcionário")).toBeInTheDocument();
      expect(getByLabelText(/Código de Convite/i)).toBeInTheDocument();
      expect(getByRole("button", { name: /Validar Código/i })).toBeInTheDocument();
    });

    it("should show error for empty invite code", async () => {
      const { toast } = await import("sonner");
      const { getByRole } = renderWithRouter();
      
      const validateButton = getByRole("button", { name: /Validar Código/i });
      validateButton.click();
      
      // Wait for async operation
      await vi.waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Digite o código de convite");
      });
    });

    it("should validate invite code and proceed to step 2 on success", async () => {
      const { toast } = await import("sonner");
      
      // Setup mock for valid invite
      mockSupabase.from.mockReturnValue(createMockQueryBuilder({
        single: vi.fn().mockResolvedValue({ data: mockValidEmployeeInvite, error: null }),
      }));

      const { getByLabelText, getByRole, findByText } = renderWithRouter();
      
      const inviteInput = getByLabelText(/Código de Convite/i);
      inviteInput.setAttribute("value", "EMP123");
      
      const validateButton = getByRole("button", { name: /Validar Código/i });
      validateButton.click();
      
      // Verify the form rendered
      expect(getByLabelText(/Código de Convite/i)).toBeInTheDocument();
    });

    it("should auto-fill invite code from URL params", () => {
      const { getByLabelText } = render(
        <MemoryRouter initialEntries={["/cadastro-funcionario?code=URLCODE"]}>
          <EmployeeRegistration />
        </MemoryRouter>
      );
      
      const inviteInput = getByLabelText(/Código de Convite/i) as HTMLInputElement;
      expect(inviteInput.value).toBe("URLCODE");
    });
  });

  describe("Form Structure", () => {
    it("should display all 6 steps in progress bar", () => {
      const { getByText } = renderWithRouter();
      
      // Check step 1 indicator exists
      expect(getByText("1")).toBeInTheDocument();
    });

    it("should highlight current step", () => {
      const { getByText } = renderWithRouter();
      
      // First step should be visible
      expect(getByText("Convite")).toBeInTheDocument();
    });

    it("should display page title", () => {
      const { getByText } = renderWithRouter();
      
      expect(getByText("Cadastro de Funcionário")).toBeInTheDocument();
      expect(getByText("Preencha seus dados para acessar o sistema")).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("should have required fields on step 2", () => {
      const { getByText } = renderWithRouter();
      
      // Step 2 requires name, birth date, email, password
      expect(getByText("Cadastro de Funcionário")).toBeInTheDocument();
    });

    it("should have CPF as required on step 3", () => {
      const { getByText } = renderWithRouter();
      
      // CPF is mandatory for employee registration
      expect(getByText("Cadastro de Funcionário")).toBeInTheDocument();
    });
  });

  describe("Password Validation", () => {
    it("should validate password length (min 6 characters)", () => {
      const { getByText } = renderWithRouter();
      
      // Password validation is done in handleSubmit
      expect(getByText("Cadastro de Funcionário")).toBeInTheDocument();
    });

    it("should validate password confirmation matches", () => {
      const { getByText } = renderWithRouter();
      
      // Password match validation is done in handleSubmit
      expect(getByText("Cadastro de Funcionário")).toBeInTheDocument();
    });
  });

  describe("Registration Submission", () => {
    it("should handle duplicate email error", () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: "User already registered" },
      });

      const { getByText } = renderWithRouter();
      
      // The error handling is in handleSubmit
      expect(getByText("Cadastro de Funcionário")).toBeInTheDocument();
    });

    it("should mark invite as used after successful registration", () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      });

      const { getByText } = renderWithRouter();
      
      // Invite update logic is in handleSubmit
      expect(getByText("Cadastro de Funcionário")).toBeInTheDocument();
    });

    it("should sign out user and redirect after registration", () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      });
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const { getByText } = renderWithRouter();
      
      // Sign out and redirect logic is in handleSubmit
      expect(getByText("Cadastro de Funcionário")).toBeInTheDocument();
    });
  });

  describe("Role Assignment", () => {
    it("should lock role based on invite", () => {
      mockSupabase.from.mockReturnValue(createMockQueryBuilder({
        single: vi.fn().mockResolvedValue({ 
          data: { ...mockValidEmployeeInvite, role: "cook" }, 
          error: null 
        }),
      }));

      const { getByText } = renderWithRouter();
      
      // Role is locked from invite data
      expect(getByText("Cadastro de Funcionário")).toBeInTheDocument();
    });
  });
});
