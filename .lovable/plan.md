
# Plano: Prevenção de Registros Órfãos no Sistema de Deleção

## Problema Identificado

Quando um usuário é deletado, pode haver registros "órfãos" (perfis sem conta de autenticação correspondente) se:
1. A conta de autenticação for removida mas o perfil não (por causa de FKs bloqueando)
2. A busca por email não encontrar perfis existentes quando o usuário de auth já foi deletado
3. O diagnóstico não detectar perfis órfãos

## Solução Proposta

### 1. Melhorar Detecção de Perfis Órfãos no Diagnóstico

Adicionar verificação de perfis por **email** (não apenas por user_id) na função de diagnóstico:

```text
┌─────────────────────────────────────────────────────────────┐
│  DIAGNÓSTICO ATUAL        │  DIAGNÓSTICO MELHORADO          │
├─────────────────────────────────────────────────────────────┤
│  ✓ auth.users             │  ✓ auth.users                   │
│  ✓ profiles (por user_id) │  ✓ profiles (por user_id)       │
│                           │  ✓ profiles (por email) ← NOVO  │
│  ✓ parent_invites         │  ✓ parent_invites               │
│  ✓ employee_invites       │  ✓ employee_invites             │
│  ...                      │  ...                            │
└─────────────────────────────────────────────────────────────┘
```

### 2. Deletar Perfis por Email (Fallback)

Quando a busca por email não encontrar um usuário em `auth.users`, a função deve:
- Verificar se existe um perfil com esse email
- Se existir, limpar referências de asaas e deletar o perfil

### 3. Garantir Ordem Correta de Deleção

A ordem de deleção já foi corrigida, mas será reforçada com logs:

```text
1. Limpar referências asaas_customers (linked_parent_id → null)
2. Limpar referências asaas_payments (linked_parent_id → null)
3. Limpar referências asaas_subscriptions (linked_parent_id → null)
4. Deletar employee_profiles
5. Deletar profiles
6. Deletar auth.users
```

---

## Detalhes Técnicos

### Arquivo: `supabase/functions/delete-user/index.ts`

**Mudança 1 - Diagnóstico de perfis por email:**
```typescript
// Na seção de diagnóstico, adicionar:
if (searchEmail) {
  const { data: profileByEmail, count: profileByEmailCount } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, user_id", { count: "exact" })
    .ilike("email", searchEmail);
  
  diagnostics.push({
    source: "profiles (por email - órfão?)",
    found: (profileByEmailCount || 0) > 0,
    count: profileByEmailCount || 0,
    details: profileByEmail?.[0] 
      ? `${profileByEmail[0].full_name} (user_id: ${profileByEmail[0].user_id || 'null'})`
      : undefined,
  });
}
```

**Mudança 2 - Deleção de perfis órfãos por email:**
```typescript
// Na seção de deleção, após deletar por userId:
if (searchEmail) {
  // Buscar e deletar perfis órfãos por email (caso não tenham sido pegos por userId)
  const { data: orphanedProfiles } = await supabaseAdmin
    .from("profiles")
    .select("user_id")
    .ilike("email", searchEmail);
  
  for (const orphan of (orphanedProfiles || [])) {
    if (orphan.user_id && orphan.user_id !== targetUserId) {
      // Limpar asaas antes de deletar
      await supabaseAdmin.from("asaas_customers").update({ linked_parent_id: null }).eq("linked_parent_id", orphan.user_id);
      await supabaseAdmin.from("asaas_payments").update({ linked_parent_id: null }).eq("linked_parent_id", orphan.user_id);
      await supabaseAdmin.from("asaas_subscriptions").update({ linked_parent_id: null }).eq("linked_parent_id", orphan.user_id);
    }
  }
  
  // Deletar perfis órfãos por email
  const { error: orphanProfileError, count: orphanProfileCount } = await supabaseAdmin
    .from("profiles")
    .delete({ count: "exact" })
    .ilike("email", searchEmail);
  
  if (orphanProfileCount && orphanProfileCount > 0) {
    deleteResults.push({
      source: "profiles (órfãos por email)",
      deleted: !orphanProfileError,
      count: orphanProfileCount,
      error: orphanProfileError?.message,
    });
  }
}
```

---

## Resultado Esperado

- O diagnóstico mostrará perfis órfãos encontrados por email
- A deleção por email também removerá perfis órfãos
- O email sempre será completamente liberado após a exclusão
- Logs detalhados para auditoria

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/delete-user/index.ts` | Adicionar detecção e deleção de perfis órfãos por email |

## Teste Recomendado

Após a implementação, usar a ferramenta "Liberar E-mail" com um email que tenha perfil mas não tenha conta de autenticação para verificar que o sistema detecta e remove o registro corretamente.
