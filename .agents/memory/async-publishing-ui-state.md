---
name: Async publishing UI state
description: Separação entre progresso persistido no banco e uma publicação ativa na interface.
---

Resultados `pending` persistidos são dados históricos e podem permanecer no banco após uma aba ser fechada, uma falha ou uma requisição interrompida. Eles não devem, sozinhos, ativar uma barra de progresso ou polling quando a página é aberta.

**Why:** A interface começou a exibir “Publicando...” automaticamente para rascunhos que tinham `pending` salvo, embora o usuário não tivesse iniciado uma publicação naquela sessão.

**How to apply:** Mantenha um estado local de operações iniciadas explicitamente pelo usuário. Exiba a barra, desabilite o botão e faça polling somente para IDs presentes nesse estado local; use os resultados persistidos apenas para renderizar o último status conhecido.