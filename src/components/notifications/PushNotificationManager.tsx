import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

export function PushNotificationManager() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<PermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkNotificationStatus();
  }, [user]);

  const checkNotificationStatus = async () => {
    setChecking(true);
    
    // Check if push notifications are supported
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      setChecking(false);
      return;
    }

    // Check permission status
    const currentPermission = Notification.permission as PermissionState;
    setPermission(currentPermission);

    // Check if already subscribed
    if (user && currentPermission === "granted") {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          // Verify subscription exists in database
          const { data } = await supabase
            .from("push_subscriptions")
            .select("id")
            .eq("user_id", user.id)
            .eq("endpoint", subscription.endpoint)
            .single();
          
          setIsSubscribed(!!data);
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
      }
    }
    
    setChecking(false);
  };

  const requestPermission = async () => {
    if (permission === "unsupported") {
      toast.error("Notificações push não são suportadas neste navegador");
      return;
    }

    setLoading(true);
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      
      if (result === "granted") {
        await subscribeUser();
      } else if (result === "denied") {
        toast.error("Permissão negada. Você pode ativar nas configurações do navegador.");
      }
    } catch (error) {
      console.error("Error requesting permission:", error);
      toast.error("Erro ao solicitar permissão");
    } finally {
      setLoading(false);
    }
  };

  const subscribeUser = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key from system settings
      const { data: vapidSetting } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "vapid_public_key")
        .single();
      
      const vapidPublicKey = vapidSetting?.value;
      
      if (!vapidPublicKey) {
        toast.info("Push notifications ainda não foram configuradas. Entre em contato com o administrador.");
        setLoading(false);
        return;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      // Save subscription to database
      const subscriptionJson = subscription.toJSON();
      const keys = subscriptionJson.keys as { p256dh?: string; auth?: string } | undefined;
      
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: keys?.p256dh || "",
          auth: keys?.auth || "",
        }, {
          onConflict: "user_id,endpoint",
        });

      if (error) throw error;
      
      setIsSubscribed(true);
      toast.success("Notificações ativadas com sucesso!");
    } catch (error) {
      console.error("Error subscribing:", error);
      toast.error("Erro ao ativar notificações");
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeUser = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint);
      }
      
      setIsSubscribed(false);
      toast.success("Notificações desativadas");
    } catch (error) {
      console.error("Error unsubscribing:", error);
      toast.error("Erro ao desativar notificações");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      if (permission === "granted") {
        await subscribeUser();
      } else {
        await requestPermission();
      }
    } else {
      await unsubscribeUser();
    }
  };


  if (checking) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notificações Push
        </CardTitle>
        <CardDescription>
          Receba alertas em tempo real mesmo quando não estiver no aplicativo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {permission === "unsupported" ? (
          <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Não suportado</p>
              <p className="text-sm text-muted-foreground">
                Seu navegador não suporta notificações push. Tente usar Chrome, Firefox ou Edge.
              </p>
            </div>
          </div>
        ) : permission === "denied" ? (
          <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg">
            <BellOff className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Permissão negada</p>
              <p className="text-sm text-muted-foreground">
                Você precisa ativar as notificações nas configurações do navegador.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications">Ativar notificações</Label>
                <p className="text-sm text-muted-foreground">
                  {isSubscribed 
                    ? "Você receberá alertas de mensagens, atualizações de agenda e pagamentos."
                    : "Ative para receber alertas importantes em tempo real."
                  }
                </p>
              </div>
              <Switch
                id="push-notifications"
                checked={isSubscribed}
                onCheckedChange={handleToggle}
                disabled={loading}
              />
            </div>

            {isSubscribed && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">Notificações ativas</span>
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Processando...</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}