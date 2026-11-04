# Entrar com GitHub e com Google

O login social é opcional. Sem as chaves, o cadastro com nome e e-mail continua funcionando, e os botões aparecem apagados.

As chaves ficam no arquivo `.env`, na raiz do projeto (o mesmo do `DATABASE_URL`). Se ele ainda não existe, copie o `.env.example` com o nome `.env`. Depois de colar as chaves, pare o `pnpm dev` e rode de novo.

## GitHub (uns 2 minutos)

1. Abra https://github.com/settings/developers e clique em **New OAuth App**.
2. Preencha assim:
   - **Application name:** System Design Lab (local)
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/api/entrar/github/callback`
3. Clique em **Register application**.
4. Copie o **Client ID**.
5. Clique em **Generate a new client secret** e copie o segredo. Ele só aparece uma vez.
6. No `.env`:

   ```
   GITHUB_CLIENT_ID=o-client-id-copiado
   GITHUB_CLIENT_SECRET=o-segredo-copiado
   ```

## Google (uns 5 minutos)

1. Abra https://console.cloud.google.com/ e crie um projeto (ex. "System Design Lab").
2. No menu, vá em **APIs e serviços → Tela de consentimento OAuth** (em inglês, "Google Auth Platform").
   - Tipo de usuário: **Externo**.
   - Nome do app e o seu e-mail de suporte. O resto pode ficar em branco.
   - Em **Público** ("Audience"), deixe em **Teste** e adicione o seu Gmail em **Usuários de teste**. Assim só você consegue entrar, e não precisa de verificação do Google.
3. Vá em **Credenciais → Criar credenciais → ID do cliente OAuth** (ou **Clientes → Criar cliente**).
   - Tipo de aplicativo: **Aplicativo da Web**.
   - Em **URIs de redirecionamento autorizados**, adicione: `http://localhost:3000/api/entrar/google/callback`
4. Clique em **Criar** e copie o **ID do cliente** e a **Chave secreta do cliente**.
5. No `.env`:

   ```
   GOOGLE_CLIENT_ID=o-id-do-cliente.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=a-chave-secreta
   ```

## Como funciona

- O endereço de volta é sempre o do Painel (porta 3000). Os outros apps usam o mesmo login, porque o cookie de `localhost` vale para todas as portas.
- **Primeira vez:** cria a conta com o nome, o e-mail e a foto do GitHub ou do Google. O resto do cadastro você completa em **Conta**.
- **Já tem conta:** se o e-mail for o mesmo, o login entra nela. Se você já estiver logado, o botão **Conectar**, na página Conta, liga o GitHub ou o Google à conta aberta.
- Contas com GitHub ou Google conectado não aparecem na lista de "entrar com um clique". Elas só entram pelo provedor.
- Quando a Central de estudos for ler os seus repositórios, ela usa um token próprio, só de leitura. O login do GitHub não dá acesso aos seus repositórios.
