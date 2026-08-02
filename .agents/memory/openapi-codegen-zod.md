---
name: OpenAPI codegen e Zod
description: Compatibilidade entre a versão do Orval e o Zod usado pelos schemas gerados.
---

O codegen do OpenAPI pode terminar a geração com sucesso, mas produzir `zod.int()` nos schemas quando a versão instalada do Zod só suporta `zod.number().int()`. Nesse caso, o typecheck falha em vários schemas não relacionados à mudança feita.

**Why:** A versão do Orval e a versão do Zod podem ficar desalinhadas no workspace; a geração não garante que os arquivos gerados compilam.

**How to apply:** Depois de alterar o OpenAPI, rode o codegen e o typecheck. Se a saída trocar `zod.number().int()` por `zod.int()` e o Zod não expuser `zod.int`, não envie essa alteração gerada; restaure os arquivos afetados, trate a compatibilidade de versões separadamente e valide novamente.