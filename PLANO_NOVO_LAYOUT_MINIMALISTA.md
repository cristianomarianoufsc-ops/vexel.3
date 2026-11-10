# VexelHub — Plano de Transição: Novo Layout Minimalista 9:16 e Estratégia de Produto

> **Atenção para o próximo agente:** Este documento contém todo o alinhamento de produto, modelo de negócio, status das aprovações da Meta e a especificação detalhada da nova interface minimalista definida com o fundador. Leia este arquivo integralmente antes de iniciar o desenvolvimento.

---

## 1. Origem, Propósito e Identidade do VexelHub

O **VexelHub** nasceu da necessidade real do fundador de divulgar a sua banda virtual (**Vexel**) e de ajudar amigos e criadores que estão começando canais de cortes (podcast, games, entretenimento).

### A dor real do criador:
* O criador atual grava ou edita um vídeo curto e precisa publicá-lo em várias redes.
* Ele **não agenda** posts para a semana que vem; ele produz e quer **publicar na hora**.
* Ele tem que abrir o YouTube Studio, depois o Instagram, depois o TikTok, copiar e colar a legenda 3 vezes, reescrever títulos e conferir formatos. Isso consome de 20 a 30 minutos por vídeo.

### A dor do TDAH e das ferramentas tradicionais:
* Softwares consolidados (Metricool, Later, Hootsuite, Buffer) são caros e **inchados** (*feature creep*). Eles possuem dezenas de abas, gráficos, relatórios e menus que geram **paralisia por análise** e cansaço mental para quem tem TDAH ou simplesmente quer agilidade.
* **O VexelHub será o "Anti-Metricool":** radicalmente simples, sem distrações, 1 única tela com 1 único propósito — subir o vídeo 9:16, digitar o texto, selecionar as redes e publicar em 15 segundos.

---

## 2. Posicionamento de Mercado & Modelo de Negócio

* **Público-alvo:** Editores de cortes de podcast/vídeo, criadores de conteúdo iniciantes, músicos independentes, pessoas com TDAH e pequenos negócios locais.
* **Preço sugerido:** **R$ 14,90/mês** (ou faixa entre R$ 9,90 e R$ 15,00) via Stripe.
  * Concorrentes cobram em dólar (US$ 18 a US$ 35/mês = R$ 100 a R$ 190/mês). Cobrar R$ 15 em reais cria uma vantagem competitiva brutal no Brasil (*preço de impulso*).
* **Custos de Infraestrutura e Margem:**
  * O stack atual usa Vercel (Frontend), Fly.io (API), Neon (Postgres), Clerk (Auth) e Supabase Storage (vídeos).
  * O custo por usuário ativo é inferior a R$ 1,50 a R$ 2,00/mês.
  * O VexelHub é um *distribuidor* de mídia, não um serviço de nuvem/Google Drive: os arquivos no Supabase Storage só precisam ficar disponíveis pelo tempo que o Instagram/YouTube levam para baixar. Uma limpeza automática pós-publicação mantém o custo de storage quase nulo.

---

## 3. Status Atual das Plataformas & Meta App Review

1. **Meta (Instagram Reels):**
   * Todas as 5 seções da análise do app no painel da Meta foram preenchidas e estão com o **check verde** (Verificação, Configurações do app, Uso permitido, Tratamento de dados, Instruções da análise com o screencast gravado).
   * As chamadas de teste de API exigidas (`media` e `media_publish`) foram executadas com sucesso pelo backend e reconhecidas pela telemetria da Meta.
   * O pedido está pronto para envio final de análise.
   * *Acesso em modo desenvolvimento:* Para amigos e testadores usarem antes da aprovação pública, basta adicionar a pessoa em **Funções do app (Roles) ➔ Testadores** no painel da Meta. A pessoa dá 1 clique para aceitar o convite e já pode conectar a conta no VexelHub.
2. **YouTube Shorts:** Totalmente funcional via Google OAuth e API Data v3.
3. **TikTok:** Totalmente funcional via Direct Post com `FILE_UPLOAD` binário em partes e permissão Sandbox `SELF_ONLY`.

---

## 4. A Nova Interface Minimalista 9:16 (Especificação Técnica)

### Regra de Ouro da Arquitetura:
**NÃO exclua permanentemente as funcionalidades existentes** (calendário, ideias, histórico completo, etc.). 
* Mova ou arquive esses componentes em rotas ou pastas legadas (`src/pages/legacy/` ou deixe-os desativados do menu principal).
* A rota principal (`/`) deve se tornar a nova experiência ultra-focada descrita abaixo.

### Componentes da Tela Principal (`/`):

```
+-------------------------------------------------------------+
|                      [ VexelHub Logo ]       [ Avatar / Sair ]
|                                                             |
|                   +-----------------------+                 |
|                   |                       |                 |
|                   |                       |                 |
|                   |           +           |                 |
|                   |    Arraste o vídeo    |                 |
|                   |       (9:16)          |                 |
|                   |                       |                 |
|                   |                       |                 |
|                   +-----------------------+                 |
|                                                             |
|   Legenda / Título: [ Escreva sua legenda aqui...         ] |
|                                                             |
|   Publicar em:                                              |
|   [✓] YouTube Shorts   [✓] Instagram Reels   [✓] TikTok     |
|                                                             |
|               [    PUBLICAR AGORA 🚀    ]                  |
|                                                             |
+-------------------------------------------------------------+
```

1. **Moldura Central 9:16 (Smartphone Preview):**
   * Proporção fixa 9:16 no centro da tela com cantos arredondados e borda sutil.
   * **Estado Vazio:** Uma cruz (`+`) elegante no meio, com indicação visual para arrastar ou clicar para selecionar o arquivo de vídeo (`.mp4`, `.mov`).
   * **Estado Carregado:** O vídeo roda automaticamente em loop dentro do container 9:16, permitindo ao criador ver exatamente como seu corte ficará no celular.
   * Botão sutil para trocar/remover o vídeo.

2. **Campo de Legenda/Título:**
   * Campo de texto limpo logo abaixo da moldura do vídeo.
   * O texto digitado aqui é automaticamente replicado para todas as redes selecionadas.

3. **Seletores das Plataformas ("O Trio de Ouro"):**
   * 3 botões/pills visuais:
     * **YouTube Shorts** (Ícone oficial + status: Conectado / Conectar)
     * **Instagram Reels** (Ícone oficial + status: Conectado / Conectar)
     * **TikTok** (Ícone oficial + status: Conectado / Conectar)
   * Se a conta ainda não estiver conectada, um clique abre o OAuth da rede para conexão imediata.

4. **Botão de Ação "PUBLICAR AGORA":**
   * Botão principal em destaque, grande e com alto contraste.
   * Ao clicar:
     * Dispara upload para o Supabase Storage.
     * Chama a rota `/api/posts/:id/publish` que já suporta publicação simultânea.
     * Exibe barra de progresso suave no próprio botão ou container ("Enviando...", "Processando Instagram...", "Publicado!").

5. **Fluxo de Onboarding & 1º Envio Grátis:**
   * O usuário pode acessar a página, arrastar o vídeo e digitar a legenda **sem estar logado**.
   * Ao clicar em "Conectar redes" ou "Publicar", abre o modal de login instantâneo de **1 clique com o Google (Clerk)**.
   * O primeiro post após o login é **100% gratuito** (Momento "UAU" ao ver o vídeo cair nas 3 redes).
   * Após a primeira publicação bem-sucedida, exibe tela de comemoração com oferta da assinatura de **R$ 14,90/mês** via Stripe para postagens ilimitadas.

---

## 5. Roteiro de Execução para o Próximo Agente

1. **Inspeção do Frontend:**
   * Inspecionar `artifacts/vexelhub/src/App.tsx`, `artifacts/vexelhub/src/pages/` e componentes de upload e publicação.
2. **Modularização / Arquivamento:**
   * Manter o código antigo preservado, mas limpar a rota raiz `/` para ser o estúdio 9:16.
3. **Construção do Layout 9:16:**
   * Implementar o componente de container 9:16 responsivo (fica perfeito tanto no desktop quanto no celular).
   * Conectar o dropzone de vídeo e preview HTML5.
   * Conectar os botões das 3 redes com os status vindos de `GET /api/platforms`.
4. **Integração com o Backend:**
   * Conectar o botão "Publicar Agora" aos endpoints existentes (`POST /api/posts` e `POST /api/posts/:id/publish`).
5. **Validação:**
   * `pnpm --filter @workspace/vexelhub run build`
   * Testar a interface localmente.
6. **Entrega no GitHub:**
   * Comitar e dar push na branch `main` do repositório `cristianomarianoufsc-ops/vexel.3` para acionar o deploy automático na Vercel.

---

## 6. Estratégia de Deploy Seguro Durante a Análise da Meta (Risco ZERO)

> **Observação Importante para o Próximo Agente:**
> O screencast enviado para a Meta App Review foi gravado com o layout anterior. Para garantir risco ZERO de reprovação por divergência visual se o analista da Meta abrir `https://vexel-2.vercel.app` nas próximas 24h a 48h:
> 1. Construa o novo layout 9:16 primeiro em uma rota dedicada (ex: `/studio` ou `/v2`) ou ambiente de preview.
> 2. O amigo/testador pode usar e testar por essa rota normalmente.
> 3. Assim que a Meta aprovar oficialmente a análise, promova a rota `/studio` para ser a rota raiz `/`.

