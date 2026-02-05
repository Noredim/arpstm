# RBAC no Supabase

- A tabela `public.profiles` deve conter a coluna `role text` com valores: `ADMIN`, `GESTOR`, `COMERCIAL`.
- O arquivo `schema.sql` define a função `public.has_role(text[])` que usa `profiles.role`.
- Garanta que, ao criar usuários novos, o campo `role` seja preenchido conforme o perfil desejado.
- No front, o app atualmente usa um store em memória (`arp-store`) para gerenciar usuários/perfis locais, mas o Supabase já está pronto para RBAC real.
