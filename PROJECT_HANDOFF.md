# VexelHub — Handoff para o próximo agente

## 1. O que é o projeto

O VexelHub é um hub para criadores publicarem vídeos curtos em várias plataformas. O usuário entra com Clerk, envia um vídeo, escreve título/legenda, escolhe as plataformas e acompanha o resultado de cada publicação em um único lugar.

Plataformas previstas:

- YouTube Shorts — publicação real implementada.
- Instagram Reels — publicação real implementada.
- TikTok — interface e início do OAuth existem, mas publicação real ainda não foi implementada.

## 2. Arquitetura e ambientes

O repositório é um monorepo pnpm:

- `artifacts/vexelhub` — frontend React + Vite.
- `artifacts/api-server` — API Express.
- `lib/db` — schema e acesso ao PostgreSQL com Drizzle.
- `lib/api-zod` — contratos/validações compartilhadas.
- `artifacts/mockup-sandbox` — servidor de previews de componentes.

Ambientes atuais:

- Frontend: Vercel — `https://vexel-2.vercel.app`
- Backend: Fly — `https://vexelhub-api.fly.dev`
- Banco: PostgreSQL/Neon usado pelo backend.
- Armazenamento de vídeos: Supabase Storage, bucket `videos`.
- Autenticação: Clerk.

O frontend usa `VITE_API_BASE_URL` quando configurado. Em produção, o `vercel.json` encaminha as rotas `/api/*` para o backend do Fly.

## 3. Como executar localmente

Use pnpm; não use npm ou yarn:

```bash
pnpm install
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/vexelhub run dev
pnpm --filter @workspace/mockup-sandbox run dev
```

Comandos de validação:

```bash
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/vexelhub run build
pnpm run typecheck
git diff --check
```

O build do API é a validação principal usada no deploy. O typecheck completo pode continuar exibindo erros antigos de exports nos pacotes compartilhados; não confundir esses erros conhecidos com uma falha do build do backend.

Regra obrigatória de entrega: toda alteração solicitada deve ser validada e sincronizada na branch `main` do repositório GitHub conectado ao Vercel antes de ser considerada concluída. A resposta final deve confirmar o commit remoto. O remote interno `gitsafe-backup` não conta como push para o GitHub.

Workflows registrados no Replit:

- `artifacts/vexelhub: web`
- `artifacts/api-server: API Server`
- `artifacts/mockup-sandbox: Component Preview Server`

Depois de alterar código do backend, reinicie `artifacts/api-server: API Server` antes de testar o preview.

## 4. Autenticação e isolamento por usuário

O middleware `requireAuth` usa o `userId` do Clerk e garante/cria o usuário no banco. Posts, assets e conexões de plataforma são filtrados por esse `userId`.

O schema de conexões está em `lib/db/src/schema/platforms.ts`. Cada linha contém:

- `userId`
- `platform`
- `isConnected`
- `accountName`
- `accountId`
- `accessToken`
- `refreshToken`
- `tokenExpiresAt`

As conexões do YouTube e Instagram ficam persistidas no banco por usuário. Logout não desconecta nenhuma plataforma. Um novo usuário precisa autorizar suas próprias contas.

Importante: anteriormente o Instagram era copiado de `INSTAGRAM_ACCESS_TOKEN` para qualquer usuário sem conexão. Isso foi removido e publicado. O endpoint `GET /api/platforms` agora apenas cria as linhas vazias e retorna o estado do usuário autenticado.

## 5. Fluxo de plataformas

Arquivo principal:

- `artifacts/api-server/src/routes/platforms.ts`

Endpoints relevantes:

- `GET /api/platforms` — lista conexões do usuário autenticado.
- `POST /api/platforms/:platform/connect` — retorna a URL OAuth.
- `GET /api/platforms/youtube/callback` — troca o código do Google e salva a conexão.
- `GET /api/platforms/instagram/callback` — troca o código do Instagram, obtém token de longa duração e salva a conexão.
- `DELETE /api/platforms/:platform` — limpa a conexão daquele usuário.

O frontend das conexões está em:

- `artifacts/vexelhub/src/pages/settings.tsx`

## 6. YouTube — estado atual

Implementado em:

- `artifacts/api-server/src/lib/youtube.ts`
- `artifacts/api-server/src/routes/platforms.ts`
- `artifacts/api-server/src/routes/posts.ts`

O fluxo:

1. Usuário autoriza o canal via Google OAuth.
2. O callback salva access token, refresh token, canal e validade.
3. Na publicação, o access token é renovado quando necessário.
4. O vídeo é enviado para a API Data do YouTube.
5. O resultado grava URL e status em `posts.platformResults`.

Variáveis necessárias no backend:

- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`

## 7. Instagram — estado atual

Implementado em:

- `artifacts/api-server/src/lib/instagram.ts`
- `artifacts/api-server/src/routes/platforms.ts`
- `artifacts/api-server/src/routes/posts.ts`
- `artifacts/api-server/src/lib/supabaseStorage.ts`
- `artifacts/api-server/src/lib/storageProvider.ts`

O app Meta utilizado é o VexelHub-IG, associado ao portfólio empresarial Outcore. A conta validada durante a implementação foi `bandaoutcore`, uma conta profissional Business.

Escopos usados no Instagram Login:

- `instagram_business_basic`
- `instagram_business_content_publish`

O fluxo de publicação:

1. Obtém a conexão do Instagram do usuário autenticado.
2. Gera uma URL assinada temporária no Supabase Storage.
3. Cria um container `REELS` no Instagram usando `video_url`.
4. Aguarda o processamento até `FINISHED`.
5. Chama `media_publish`.
6. Busca o permalink e grava o resultado no post.

Variáveis necessárias no backend:

- `INSTAGRAM_CLIENT_ID` ou `INSTAGRAM_APP_ID`
- `INSTAGRAM_APP_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- opcionalmente `SUPABASE_STORAGE_BUCKET` — padrão `videos`

Existe também `INSTAGRAM_ACCESS_TOKEN` no ambiente do Fly por causa da configuração inicial. Ele não deve ser usado para conectar automaticamente novos usuários. O OAuth por usuário é a fonte correta para novas conexões.

Requisito importante: o Instagram precisa conseguir baixar o vídeo por uma URL pública. URLs locais, URLs `.replit.dev` e endpoints privados do Replit não servem para o `video_url` do Instagram. A URL assinada do Supabase resolve esse requisito.

Nunca registre tokens ou secrets no Git, no chat ou em screenshots.

## 8. Publicação de posts

Arquivo principal:

- `artifacts/api-server/src/routes/posts.ts`

Endpoint:

- `POST /api/posts/:id/publish`

O endpoint:

1. Busca o post pelo ID e pelo `userId` autenticado.
2. Busca as conexões do mesmo usuário.
3. Publica em cada plataforma selecionada.
4. Salva `status`, `publishedAt` e `platformResults`.

O status e a mensagem de erro de cada plataforma devem continuar sendo preservados mesmo quando apenas uma plataforma falhar.

## 9. TikTok — estado atual

A integração TikTok está implementada e validada em publicação real por usuário.

O OAuth e a publicação real foram implementados em `artifacts/api-server/src/routes/platforms.ts`, `artifacts/api-server/src/lib/tiktok.ts` e `artifacts/api-server/src/routes/posts.ts`. O fluxo usa:

- `TIKTOK_CLIENT_KEY`
- callback em `/api/platforms/tiktok/callback`;
- scopes `video.publish` e `video.upload`; o `open_id` retornado pelo OAuth identifica a conta sem depender do scope opcional `user.info.basic`;
- renovação de access token via refresh token;
- consulta de `creator_info/query` para respeitar as opções de privacidade da conta;
- Content Posting API Direct Post com `FILE_UPLOAD`, upload binário em partes e consulta assíncrona de status;
- seleção padrão de privacidade `SELF_ONLY`, necessária para clientes Sandbox/não auditados; `TIKTOK_DEFAULT_PRIVACY` pode sobrescrever isso para uma conta auditada;
- gravação do `publish_id`, status e mensagem de erro em `platformResults`.

O app TikTok Sandbox usado no teste precisa continuar configurado com Login Kit Web, a conta de teste autorizada, a redirect URI pública `https://vexelhub-api.fly.dev/api/platforms/tiktok/callback`, os scopes de publicação acima e Direct Post habilitado.

Validação concluída:

- a conexão OAuth foi concluída com sucesso;
- um vídeo chegou à conta TikTok de teste;
- o backend registrou `privacyLevel: "SELF_ONLY"`, upload concluído e status final `PUBLISH_COMPLETE`;
- uma publicação selecionando YouTube, Instagram e TikTok ao mesmo tempo foi concluída com sucesso nas três plataformas.

Limitação atual do TikTok:

- como o app ainda não foi auditado, a conta usada no Sandbox precisa ser privada;
- posts do cliente não auditado devem usar `SELF_ONLY`;
- contas públicas e posts públicos dependem da auditoria/aprovação do app pelo TikTok.

Não assumir que o fluxo do Instagram pode ser copiado literalmente. A API do TikTok tem requisitos próprios de aprovação, scopes, publicação e formato de upload; o helper dedicado segue a documentação oficial atual.

## 10. Deploy do backend no Fly

O deploy usa:

- `artifacts/api-server/Dockerfile`
- `artifacts/api-server/fly.toml`
- app Fly `vexelhub-api`

O Dockerfile é importante porque o projeto é um monorepo pnpm. Ele usa:

```bash
pnpm --filter @workspace/api-server deploy --prod --legacy /prod
```

Isso garante que a imagem final tenha a árvore de dependências de produção do workspace da API.

Método que funcionou neste ambiente:

```bash
flyctl deploy \
  --app vexelhub-api \
  --config artifacts/api-server/fly.toml \
  --dockerfile artifacts/api-server/Dockerfile \
  --local-only .
```

O builder remoto já retornou `401 Unauthorized` neste projeto. Se isso acontecer novamente, prefira o deploy local acima antes de alterar o código.

Validação após deploy:

```bash
curl -fsS -w '\nHTTP %{http_code}\n' \
  https://vexelhub-api.fly.dev/api/healthz
flyctl status --app vexelhub-api
```

Resultado esperado do health check:

```text
{"status":"ok"}
HTTP 200
```

## 11. Estado conhecido e cuidados

- Não substituir Neon, Supabase ou Fly por serviços novos sem solicitação explícita.
- Não expor secrets em logs, documentação ou respostas.
- Não usar `localhost` ou `REPLIT_DEV_DOMAIN` em URLs que serviços externos precisam acessar.
- A conta atual do Instagram continua salva no banco do usuário que fez OAuth.
- Desconectar pela tela limpa os tokens daquela plataforma para o usuário.
- O frontend e o backend são artefatos separados; alterações no backend não exigem migrar o frontend para outro artefato.
- A pasta `.migration-backup` contém cópias antigas e workflows com dependências ausentes; não usar como fonte principal.

## 12. Critério de conclusão do TikTok

Considerar o trabalho concluído somente quando:

- um usuário consegue conectar sua própria conta TikTok;
- outro usuário não herda essa conexão;
- logout/login da mesma conta preserva a conexão;
- um vídeo de teste é realmente publicado ou o fluxo retorna um erro oficial e compreensível;
- uma publicação simultânea em YouTube, Instagram e TikTok é concluída com sucesso;
- o resultado aparece em `platformResults`;
- o build do backend passa;
- o backend publicado responde `HTTP 200` no health check;
- o deploy preserva as variáveis existentes do YouTube, Instagram, Supabase, Clerk e banco.