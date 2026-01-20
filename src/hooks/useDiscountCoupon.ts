import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DiscountCoupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  applicable_classes: string[] | null;
  applicable_plans: string[] | null;
}

interface UseDiscountCouponReturn {
  coupon: DiscountCoupon | null;
  isLoading: boolean;
  error: string | null;
  validateCoupon: (code: string) => Promise<DiscountCoupon | null>;
  clearCoupon: () => void;
  calculateDiscount: (originalPrice: number) => { discountedPrice: number; discountAmount: number };
}

export function useDiscountCoupon(): UseDiscountCouponReturn {
  const [coupon, setCoupon] = useState<DiscountCoupon | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const validateCoupon = useCallback(async (code: string): Promise<DiscountCoupon | null> => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError("Digite um código de cupom");
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("discount_coupons")
        .select("*")
        .eq("code", cleanCode)
        .eq("is_active", true)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError("Cupom não encontrado ou inativo");
        setCoupon(null);
        toast({
          title: "Cupom inválido",
          description: "O código informado não foi encontrado ou está inativo.",
          variant: "destructive",
        });
        return null;
      }

      const now = new Date();
      const today = now.toISOString().split("T")[0];

      // Check validity dates
      if (data.valid_from && data.valid_from > today) {
        setError("Este cupom ainda não está ativo");
        setCoupon(null);
        toast({
          title: "Cupom não disponível",
          description: "Este cupom ainda não está ativo.",
          variant: "destructive",
        });
        return null;
      }

      if (data.valid_until && data.valid_until < today) {
        setError("Este cupom expirou");
        setCoupon(null);
        toast({
          title: "Cupom expirado",
          description: "Este cupom não está mais válido.",
          variant: "destructive",
        });
        return null;
      }

      // Check usage limit
      if (data.max_uses && data.current_uses >= data.max_uses) {
        setError("Este cupom atingiu o limite de uso");
        setCoupon(null);
        toast({
          title: "Cupom esgotado",
          description: "Este cupom atingiu o limite máximo de uso.",
          variant: "destructive",
        });
        return null;
      }

      // Coupon is valid!
      const validCoupon = data as DiscountCoupon;
      setCoupon(validCoupon);
      
      const discountText = validCoupon.discount_type === "percentage" 
        ? `${validCoupon.discount_value}% de desconto`
        : `R$ ${validCoupon.discount_value.toFixed(2)} de desconto`;

      toast({
        title: "Cupom aplicado! 🎉",
        description: `${discountText} será aplicado na sua mensalidade.`,
      });

      return validCoupon;
    } catch (err) {
      console.error("Error validating coupon:", err);
      setError("Erro ao validar cupom");
      setCoupon(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const clearCoupon = useCallback(() => {
    setCoupon(null);
    setError(null);
  }, []);

  const calculateDiscount = useCallback((originalPrice: number): { discountedPrice: number; discountAmount: number } => {
    if (!coupon) {
      return { discountedPrice: originalPrice, discountAmount: 0 };
    }

    let discountAmount: number;

    if (coupon.discount_type === "percentage") {
      discountAmount = (originalPrice * coupon.discount_value) / 100;
    } else {
      discountAmount = Math.min(coupon.discount_value, originalPrice);
    }

    const discountedPrice = Math.max(0, originalPrice - discountAmount);

    return { discountedPrice, discountAmount };
  }, [coupon]);

  return {
    coupon,
    isLoading,
    error,
    validateCoupon,
    clearCoupon,
    calculateDiscount,
  };
}
