---
name: Secrets do backend Fly
description: Relação entre os secrets do Repl e as variáveis do app publicado no Fly.
---

Os secrets salvos no Repl não atualizam automaticamente as variáveis do app publicado no Fly. Para alterar credenciais usadas pelo backend público, é necessário atualizar os secrets do app Fly correspondente e aguardar a substituição das máquinas. A troca das credenciais Sandbox do TikTok confirmou o fluxo de conexão OAuth. No fluxo atual, `POST /posts/:id/publish` pode responder HTTP 200 mesmo quando uma plataforma falha, pois o detalhe fica em `platformResults`.

**Why:** O frontend público usa o backend hospedado no Fly; alterar apenas os secrets locais não muda o `client_key` usado pelo OAuth em produção.

**How to apply:** Ao trocar credenciais de integrações usadas pelo backend publicado, atualize também o app Fly, valide o health check público e não registre os valores das credenciais em logs ou respostas.