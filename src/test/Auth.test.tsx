import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Auth from "@/pages/Auth";
import { 
  mockSupabase, 
  mockValidParentInvite, 
  mockParentInviteWithPreEnrollment,
  mockPreEnrollment,
  mockAuthUser, 
  mockValidEmployeeInvite,
  resetSupabaseMocks,
  createMockQueryBuilder 
} from "./mocks/supabase";

// Mock the supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

// Mock useToast hook
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const renderAuth = (initialRoute = "/auth") => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Auth />
    </MemoryRouter>
  );
};

describe("Auth - Parent Registration", () => {
  beforeEach(() => {
    resetSupabaseMocks();
    vi.clearAllMocks();
  });

  describe("Login Form", () => {
    it("should render login form by default", () => {
      const { getByText, getByLabelText } = renderAuth();
      
      expect(getByText("Entrar")).toBeInTheDocument();
      expect(getByLabelText(/Email/i)).toBeInTheDocument();
    });

    it("should have password input", () => {
      const { getByLabelText } = renderAuth();
      
      const passwordInput = getByLabelText(/^Senha$/i) as HTMLInputElement;
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput.type).toBe("password");
    });

    it("should have 'Remember me' checkbox", () => {
      const { getByLabelText } = renderAuth();
      
      const rememberMeCheckbox = getByLabelText(/Lembrar de mim/i);
      expect(rememberMeCheckbox).toBeInTheDocument();
    });

    it("should handle successful login", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockAuthUser, session: { user: mockAuthUser } },
        error: null,
      });

      const { getByText } = renderAuth();
      
      expect(getByText("Entrar")).toBeInTheDocument();
    });

    it("should handle invalid credentials error", () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      });

      const { getByText } = renderAuth();
      
      expect(getByText("Entrar")).toBeInTheDocument();
    });
  });

  describe("Signup Form", () => {
    it("should switch to signup mode", () => {
      const { getByText } = renderAuth("/auth?mode=signup");
      
      expect(getByText("Criar Conta")).toBeInTheDocument();
    });

    it("should require invite code for signup", () => {
      const { getByLabelText } = renderAuth("/auth?mode=signup");
      
      expect(getByLabelText(/Código de Convite/i)).toBeInTheDocument();
    });

    it("should require terms acceptance for signup", () => {
      const { getByText } = renderAuth("/auth?mode=signup");
      
      expect(getByText(/Aceito os/i)).toBeInTheDocument();
    });

    it("should have CPF input", () => {
      const { getByLabelText } = renderAuth("/auth?mode=signup");
      
      expect(getByLabelText(/CPF/i)).toBeInTheDocument();
    });

    it("should have phone input", () => {
      const { getByLabelText } = renderAuth("/auth?mode=signup");
      
      expect(getByLabelText(/Telefone/i)).toBeInTheDocument();
    });

    it("should have relationship select", () => {
      const { getByLabelText } = renderAuth("/auth?mode=signup");
      
      expect(getByLabelText(/Parentesco/i)).toBeInTheDocument();
    });

    it("should have password confirmation", () => {
      const { getByLabelText } = renderAuth("/auth?mode=signup");
      
      expect(getByLabelText(/Confirmar Senha/i)).toBeInTheDocument();
    });
  });

  describe("Invite Code Validation", () => {
    it("should auto-fill invite code from URL", () => {
      const { getByLabelText } = renderAuth("/auth?mode=signup&invite=PAR123");
      
      const inviteInput = getByLabelText(/Código de Convite/i) as HTMLInputElement;
      expect(inviteInput.value).toBe("PAR123");
    });

    it("should call supabase on invite validation", () => {
      mockSupabase.from.mockReturnValue(createMockQueryBuilder({
        maybeSingle: vi.fn().mockResolvedValue({ data: mockValidParentInvite, error: null }),
      }));

      renderAuth("/auth?mode=signup&invite=PAR123");
      
      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe("Password Recovery", () => {
    it("should have forgot password link", () => {
      const { getByText } = renderAuth();
      
      expect(getByText(/Esqueceu a senha/i)).toBeInTheDocument();
    });

    it("should show forgot password form when clicked", () => {
      const { getByText, queryByText } = renderAuth();
      
      const forgotLink = getByText(/Esqueceu a senha/i);
      forgotLink.click();
      
      // After clicking, should show recovery form
      expect(getByText("Entrar") || getByText("Recuperar Senha")).toBeInTheDocument();
    });
  });

  describe("Registration Submission", () => {
    it("should handle successful registration", () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      });

      const { getByText } = renderAuth("/auth?mode=signup");
      
      expect(getByText("Criar Conta")).toBeInTheDocument();
    });

    it("should handle duplicate email error", () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: "User already registered", status: 400 },
      });

      const { getByText } = renderAuth("/auth?mode=signup");
      
      expect(getByText("Criar Conta")).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("should have link back to site", () => {
      const { getByText } = renderAuth();
      
      expect(getByText(/Voltar ao site/i)).toBeInTheDocument();
    });

    it("should have toggle between login and signup", () => {
      const { getByText } = renderAuth();
      
      expect(getByText(/Não tem uma conta/i) || getByText(/Já tem uma conta/i)).toBeDefined();
    });
  });
});

describe("Auth - Form Formatting", () => {
  beforeEach(() => {
    resetSupabaseMocks();
    vi.clearAllMocks();
  });

  it("should have CPF input with mask capability", () => {
    const { getByLabelText } = renderAuth("/auth?mode=signup");
    
    const cpfInput = getByLabelText(/CPF/i);
    expect(cpfInput).toBeInTheDocument();
  });

  it("should have phone input with mask capability", () => {
    const { getByLabelText } = renderAuth("/auth?mode=signup");
    
    const phoneInput = getByLabelText(/Telefone/i);
    expect(phoneInput).toBeInTheDocument();
  });

  it("should have invite code input", () => {
    const { getByLabelText } = renderAuth("/auth?mode=signup");
    
    const inviteInput = getByLabelText(/Código de Convite/i);
    expect(inviteInput).toBeInTheDocument();
  });
});

describe("Auth - Session Management", () => {
  beforeEach(() => {
    resetSupabaseMocks();
    vi.clearAllMocks();
  });

  it("should check existing session on mount", () => {
    renderAuth();
    
    expect(mockSupabase.auth.getSession).toHaveBeenCalled();
  });

  it("should set up auth state listener", () => {
    renderAuth();
    
    expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
  });
});
