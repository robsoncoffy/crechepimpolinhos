
# Guia Completo para Ativar Login com Google

## Visao Geral
O login com Google requer configuracao em 3 locais:
1. **Google Cloud Console** - Criar credenciais OAuth
2. **Lovable Cloud** - Configurar o provedor de autenticacao
3. **Codigo** - Adicionar o botao de login com Google

## Status Atual
Os secrets `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` ja estao configurados no projeto. Isso e um bom sinal - as credenciais podem ja estar criadas no Google Cloud Console.

---

## Passo 1: Configurar Google Cloud Console

### 1.1 Acessar o Console
Acesse: **https://console.cloud.google.com/**

### 1.2 Configurar a Tela de Consentimento OAuth
1. Va em **APIs e Servicos** → **Tela de consentimento OAuth**
2. Configure:
   - **Tipo de usuario**: Externo
   - **Nome do aplicativo**: Creche Pimpolinhos
   - **Email de suporte**: seu email
   - **Dominios autorizados**: Adicione `supabase.co`
   - **Escopos**: Adicione:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`

### 1.3 Criar Credenciais OAuth
1. Va em **APIs e Servicos** → **Credenciais**
2. Clique em **Criar Credenciais** → **ID do cliente OAuth**
3. Configure:
   - **Tipo de aplicativo**: Aplicativo da Web
   - **Nome**: Creche Pimpolinhos Web
   - **Origens JavaScript autorizadas**:
     ```
     https://www.crechepimpolinhos.com.br
     https://crechepimpolinhos.lovable.app
     https://18dd1870-3f03-4c3d-a7c0-e13301683901.lovableproject.com
     http://localhost:5173
     ```
   - **URIs de redirecionamento autorizados**:
     ```
     https://ksguxhmqctmepbddbhdz.supabase.co/auth/v1/callback
     ```

4. Copie o **ID do Cliente** e o **Segredo do Cliente**

---

## Passo 2: Configurar no Lovable Cloud

### 2.1 Acessar o Painel do Backend
Clique no botao abaixo para abrir as configuracoes do backend:

### 2.2 Configurar o Provedor Google
1. No painel, va em **Users** → **Authentication Settings**
2. Em **Sign In Methods**, encontre **Google**
3. **Ative** o toggle do Google
4. Insira:
   - **Client ID**: O ID copiado do Google Cloud Console
   - **Client Secret**: O segredo copiado
5. Salve as configuracoes

---

## Passo 3: Alteracoes no Codigo

### 3.1 Adicionar Botao de Login com Google
No arquivo `src/pages/Auth.tsx`, sera adicionado:

```text
+---------------------------------------------+
|  [G] Entrar com Google                      |
+---------------------------------------------+
|                  ou                          |
+---------------------------------------------+
|  Email: ___________________________         |
|  Senha: ___________________________         |
|  [Entrar]                                   |
+---------------------------------------------+
```

### 3.2 Funcao de Login com Google
```typescript
const handleGoogleLogin = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/painel`,
    },
  });
  
  if (error) {
    toast({
      title: "Erro ao entrar com Google",
      description: error.message,
      variant: "destructive",
    });
  }
};
```

### 3.3 Componente do Botao
```typescript
<Button
  type="button"
  variant="outline"
  className="w-full"
  onClick={handleGoogleLogin}
>
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
    {/* Icone do Google */}
  </svg>
  Entrar com Google
</Button>

<div className="relative my-4">
  <div className="absolute inset-0 flex items-center">
    <span className="w-full border-t" />
  </div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-background px-2 text-muted-foreground">
      ou continue com email
    </span>
  </div>
</div>
```

---

## Passo 4: Verificar Site URL e Redirect URLs

### No Lovable Cloud, confirme que as URLs estao corretas:
- **Site URL**: `https://www.crechepimpolinhos.com.br`
- **Redirect URLs** (adicionar todas):
  - `https://www.crechepimpolinhos.com.br/**`
  - `https://crechepimpolinhos.lovable.app/**`
  - `https://18dd1870-3f03-4c3d-a7c0-e13301683901.lovableproject.com/**`

---

## Resumo das Acoes

| Onde | Acao |
|------|------|
| Google Cloud Console | Verificar/criar credenciais OAuth com URLs corretas |
| Lovable Cloud | Ativar Google como provedor e inserir credenciais |
| Codigo | Adicionar botao de login com Google na pagina Auth.tsx |

---

## Secao Tecnica

### Arquivos que serao modificados:
1. `src/pages/Auth.tsx` - Adicionar botao e funcao de login com Google

### Dependencias:
- Nenhuma nova dependencia necessaria (Supabase JS ja suporta OAuth)

### Consideracoes de Seguranca:
- O fluxo OAuth e gerenciado pelo Supabase, nao expondo credenciais no frontend
- O `GOOGLE_CLIENT_SECRET` fica apenas no backend
- Usuarios que fizerem login com Google terao perfil criado automaticamente pelo trigger existente `handle_new_user`

### Fluxo de Autenticacao:
1. Usuario clica "Entrar com Google"
2. Redirecionado para tela de login do Google
3. Google redireciona para `supabase.co/auth/v1/callback`
4. Supabase cria/atualiza usuario e redireciona para o app
5. Trigger `handle_new_user` cria perfil automaticamente

