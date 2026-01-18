import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: AppRole[];
}

/**
 * Protects routes based on user roles.
 * If allowedRoles is empty, all authenticated staff can access.
 * If user doesn't have required role, redirects to dashboard.
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { roles, loading, isStaff } = useAuth();

  if (loading) {
    return null;
  }

  // If no specific roles required, allow all staff
  if (allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Check if user has at least one of the allowed roles
  const hasAccess = roles.some(role => allowedRoles.includes(role));

  if (!hasAccess) {
    // Redirect to main dashboard if unauthorized
    return <Navigate to="/painel" replace />;
  }

  return <>{children}</>;
}
