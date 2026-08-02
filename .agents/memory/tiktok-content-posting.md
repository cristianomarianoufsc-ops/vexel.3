---
name: TikTok Content Posting
description: Regras específicas do TikTok Content Posting API usadas pelo VexelHub.
---

O fluxo do TikTok não deve copiar o OAuth ou a publicação do Instagram: o token OAuth v2 retorna diretamente no corpo, enquanto as respostas da Content Posting API usam `data` e `error`. O Direct Post deve consultar as opções de privacidade do criador antes de iniciar o vídeo, usar os escopos `video.publish` e `video.upload`, enviar `FILE_UPLOAD` com `video_size`, `chunk_size` e `total_chunk_count`, e consultar o `publish_id` até concluir ou falhar. Para vídeos menores que 10 MB, `chunk_size` precisa ser exatamente o tamanho do arquivo; caso contrário o TikTok rejeita `video/init` com `The chunk size is invalid`. Clientes não auditados só podem publicar com `SELF_ONLY`, então esse é o padrão seguro. A identificação básica da conta pode usar o `open_id` devolvido pelo OAuth; não dependa de `/v2/user/info` nem do scope `user.info.basic` durante a conexão do Sandbox.

**Why:** A documentação do TikTok usa formatos de resposta e regras de transferência diferentes; assumir o formato de outra plataforma causa falhas difíceis de diagnosticar. O fluxo foi validado no Sandbox com uma publicação real concluída, inclusive em publicação simultânea com YouTube e Instagram.

**How to apply:** Ao alterar o helper TikTok, preserve o upload sequencial em blocos válidos, use o tamanho exato do arquivo para uploads de bloco único, mantenha o último bloco com o restante do arquivo, prefira `SELF_ONLY` sem override explícito, mantenha a renovação por refresh token e o registro do `publish_id` em `platformResults`. No OAuth, solicite apenas os scopes necessários ao fluxo habilitado no app e trate erros de autorização explicitamente.