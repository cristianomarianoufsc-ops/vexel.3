# Guia de Armazenamento do VexelHub (Storage Architecture)

Este documento explica como funciona o armazenamento de vídeos do VexelHub, como o sistema foi preparado para rodar de forma autônoma na Fly.io hoje e **como alternar entre os provedores (Fly.io, Supabase e Cloudflare R2)** a qualquer momento apenas alterando variáveis de ambiente.

---

## 1. Visão Geral da Arquitetura

O VexelHub possui um adaptador de armazenamento unificado em `artifacts/api-server/src/lib/storageProvider.ts`.  
Ele suporta 3 provedores selecionáveis via variável de ambiente:

| Provedor | Variável `STORAGE_PROVIDER` | Onde os vídeos são salvos | Ideal para |
| :--- | :--- | :--- | :--- |
| **Fly.io Volume (Padrão)** | `fly` ou não definida | Disco persistente NVMe montado em `/data` | Uso individual, testes, sem dependência externa, nunca hiberna. |
| **Supabase Storage** | `supabase` | Bucket `videos` no Supabase Storage | Quando o Supabase estiver ativo e quiser usar CDN externo. |
| **Cloudflare R2** | `r2` | Bucket S3 compatível na Cloudflare | Escala para centenas de usuários (10 GB grátis, sem hibernação). |

---

## 2. Provedor Ativo: Fly.io Persistent Volume

* **Como funciona:**
  - O container da Fly.io tem um disco NVMe persistente de 1 GB montado em `/data`.
  - Os vídeos enviados ficam salvos em `/data/vexelhub-uploads/`.
  - Mesmo que a máquina entre em repouso (*sleep*) ou reinicie, **os arquivos em `/data` permanecem 100% seguros**.
* **Limpeza Automática (Auto-Cleanup):**
  - Para garantir que o disco de 1 GB nunca lote, assim que um agendamento é publicado com sucesso nas redes sociais (YouTube, Instagram e TikTok), o VexelHub **apaga automaticamente o arquivo local**, liberando espaço para os próximos agendamentos.
* **Gatilho de Agendamento Confiável (Cron):**
  - O GitHub Actions executa a cada 5 minutos (`.github/workflows/cron-scheduler.yml`), chamando `/api/cron/process-scheduled`.
  - Isso garante que o servidor acorde pontualmente na hora marcada para postar seu vídeo agendado.

---

## 3. O Caminho de Volta: Como voltar para o Supabase Storage

Se por qualquer motivo você decidir reativar e voltar a usar o Supabase Storage:

### Passo 1: Garantir que o projeto do Supabase está ativo
1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard).
2. Se o projeto estiver pausado, clique em **"Restore project"** (ou **"Unpause"**).
3. No menu **Storage**, certifique-se de que o bucket com nome `videos` existe e tem visibilidade pública (Public Bucket).

### Passo 2: Configurar as variáveis na Fly.io
No terminal ou no painel da Fly.io, defina a variável `STORAGE_PROVIDER`:

```bash
# Via Fly CLI:
flyctl secrets set STORAGE_PROVIDER=supabase --app vexelhub-api

# Ou caso queira forçar via flag:
flyctl secrets set USE_SUPABASE_STORAGE=true --app vexelhub-api
```

Certifique-se de que os segredos do Supabase continuam configurados na Fly.io:
* `SUPABASE_URL`: ex. `https://kuiggubfyxeactkiqewn.supabase.co`
* `SUPABASE_SERVICE_ROLE_KEY`: chave de serviço do Supabase
* `SUPABASE_STORAGE_BUCKET`: `videos`

### Passo 3: Reiniciar / Deploy
Assim que a variável for alterada, a API passa a enviar os vídeos diretamente para o bucket do Supabase. O Keep-Alive integrado no agendador fará pings a cada 12 horas para evitar novas pausas por inatividade.

---

## 4. O Caminho do Futuro: Como migrar para Cloudflare R2 (Escala Comercial)

Quando o VexelHub começar a receber muitos clientes pagantes, o **Cloudflare R2** é a melhor escolha mundial:
* 10 GB gratuitos todos os meses.
* Zero taxas de tráfego de saída (Egress gratuito).
* Nunca hiberna, sem regras de inatividade de 7 dias.

### Como ativar o R2:
1. Crie uma conta gratuita na [Cloudflare](https://dash.cloudflare.com/) e vá em **R2 Object Storage**.
2. Crie um bucket chamado `vexelhub-videos`.
3. Gere um **R2 API Token** com permissão de Leitura e Escrita.
4. Adicione os segredos na Fly.io:
   ```bash
   flyctl secrets set STORAGE_PROVIDER=r2 \
     R2_ACCOUNT_ID="seu_account_id" \
     R2_ACCESS_KEY_ID="sua_access_key" \
     R2_SECRET_ACCESS_KEY="seu_secret" \
     R2_BUCKET_NAME="vexelhub-videos" \
     --app vexelhub-api
   ```

---

## 5. Como testar e auditar o Armazenamento Ativo

Você pode verificar o status do armazenamento em tempo real acessando a rota pública de diagnósticos:

```bash
curl https://vexelhub-api.fly.dev/api/diagnostics
```

Ela retornará um JSON informando:
* `activeStorageProvider`: provedor ativo no momento (`fly`, `supabase` ou `r2`).
* `storageDir`: caminho em disco onde os arquivos estão sendo armazenados (ex: `/data/vexelhub-uploads`).
* `hasPersistentVolume`: `true` quando o volume de disco está montado com sucesso.
