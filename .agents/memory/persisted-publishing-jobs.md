---
name: Persisted publishing jobs
description: Regra arquitetural para acompanhar publicações longas entre requisições e recarregamentos.
---

O endpoint de publicação deve apenas reivindicar o post, responder rapidamente e iniciar o processamento em segundo plano. O status `publishing` e o progresso detalhado por plataforma devem ser persistidos no próprio post; o frontend consulta esse estado até `published` ou `failed`.

**Why:** uploads longos não produzem progresso útil quando a requisição HTTP fica aberta e o estado somente muda ao terminar uma plataforma. Persistir o job permite acompanhar a operação após reload e evita que `pending` histórico seja confundido com uma operação ativa.

**How to apply:** use percentual de bytes quando a plataforma fornecer upload em chunks; para APIs com processamento remoto, represente etapas ponderadas e mostre a etapa atual sem alegar bytes que não foram medidos.