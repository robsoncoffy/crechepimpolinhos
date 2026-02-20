import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Email {
  id: string;
  threadId: string;
  snippet: string;
  labelIds: string[];
  subject: string;
  from: string;
  to: string;
  cc: string;
  date: string;
  internalDate: string;
  isRead: boolean;
  isStarred: boolean;
  bodyHtml: string;
  bodyText: string;
}

interface UseGmailResult {
  emails: Email[];
  isLoading: boolean;
  error: string | null;
  isAuthorized: boolean;
  accountEmail: string | null;
  nextPageToken: string | null;
  fetchEmails: (options?: {
    maxResults?: number;
    pageToken?: string;
    query?: string;
    labelIds?: string;
  }) => Promise<void>;
  sendEmail: (params: {
    to: string;
    cc?: string;
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
  }) => Promise<boolean>;
  checkStatus: () => Promise<void>;
  getAuthUrl: () => Promise<string | null>;
}

export function useGmail(): UseGmailResult {
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const { toast } = useToast();

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-oauth/status`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      
      if (!response.ok) {
        console.error("Status check error:", response.statusText);
        return;
      }

      const data = await response.json();
      setIsAuthorized(data?.isAuthorized || false);
      setAccountEmail(data?.email || null);
    } catch (err) {
      console.error("Status check failed:", err);
    }
  }, []);

  const getAuthUrl = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-oauth/authorize`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      
      if (!response.ok) {
        console.error("Auth URL error:", response.statusText);
        toast({
          title: "Erro",
          description: "Não foi possível gerar a URL de autorização",
          variant: "destructive",
        });
        return null;
      }

      const data = await response.json();
      return data?.authUrl || null;
    } catch (err) {
      console.error("Get auth URL failed:", err);
      return null;
    }
  }, [toast]);

  const fetchEmails = useCallback(async (options: {
    maxResults?: number;
    pageToken?: string;
    query?: string;
    labelIds?: string;
  } = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.maxResults) params.set("maxResults", options.maxResults.toString());
      if (options.pageToken) params.set("pageToken", options.pageToken);
      if (options.query) params.set("q", options.query);
      if (options.labelIds) params.set("labelIds", options.labelIds);

      const { data, error: fnError } = await supabase.functions.invoke("gmail-inbox", {
        body: null,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (fnError) {
        throw new Error(fnError.message || "Erro ao buscar e-mails");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setEmails(data?.messages || []);
      setNextPageToken(data?.nextPageToken || null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setError(message);
      toast({
        title: "Erro ao buscar e-mails",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const sendEmail = useCallback(async (params: {
    to: string;
    cc?: string;
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
  }): Promise<boolean> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("gmail-send", {
        body: params,
      });

      if (fnError) {
        throw new Error(fnError.message || "Erro ao enviar e-mail");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "E-mail enviado",
        description: "O e-mail foi enviado com sucesso!",
      });

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({
        title: "Erro ao enviar e-mail",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    emails,
    isLoading,
    error,
    isAuthorized,
    accountEmail,
    nextPageToken,
    fetchEmails,
    sendEmail,
    checkStatus,
    getAuthUrl,
  };
}
