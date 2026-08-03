---
name: Git remote push
description: Como enviar arquivos ao GitHub neste projeto — git push normal não funciona; usar curl com GITHUB_TOKEN via API REST.
---

Neste projeto, o clone local e a `main` do GitHub têm históricos independentes sem ancestral comum. Por isso `git push` normal é recusado e `force push` apagaria o histórico remoto. A ferramenta `gitPush` do Replit também falha: retorna `BRANCH_ALREADY_EXISTS` para a `main` e `UNKNOWN` ao tentar criar branches novas.

O método confirmado é usar a API REST do GitHub via `curl` com o `GITHUB_TOKEN` (que existe como secret do Replit e fica disponível como variável de ambiente no shell).

**Why:** `GITHUB_TOKEN` funciona no shell como `$GITHUB_TOKEN`, mas o Git CLI não o usa automaticamente como credencial HTTPS. A API REST contorna isso completamente e permite atualizar arquivos individualmente sem precisar de histórico compatível.

**How to apply:** Push para o GitHub é obrigatório ao concluir qualquer alteração solicitada, porque o Vercel usa o `main` remoto. Primeiro valide o código; depois envie os arquivos alterados para o `main` remoto, confirme o SHA retornado pelo GitHub e só então informe a conclusão. Para cada arquivo que precisa ir ao GitHub, execute a sequência abaixo no shell:

```bash
# 1. Busca o SHA atual do arquivo no GitHub (necessário para update; omitir se o arquivo é novo)
SHA=$(curl -s \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/OWNER/REPO/contents/PATH?ref=main" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('sha',''))")

# 2. Monta o JSON com o conteúdo em base64 e envia
BODY=$(python3 -c "
import json, base64
content = open('/caminho/local/para/arquivo','rb').read()
obj = {
  'message': 'Mensagem do commit',
  'content': base64.b64encode(content).decode(),
  'branch':  'main',
  'sha':     '$SHA'
}
print(json.dumps(obj))
")

curl -s -X PUT \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/OWNER/REPO/contents/PATH" \
  -d "$BODY" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('commit:', d.get('commit',{}).get('sha',''), d.get('message',''))"
```

Pontos importantes:
- `OWNER` = `cristianomarianoufsc-ops`, `REPO` = `vexel.3`.
- Caminhos com caracteres especiais (ex: `.agents/memory/`) precisam ser URL-encoded na URL da API: `.agents%2Fmemory%2F`.
- Se o arquivo ainda não existe no GitHub, omitir o campo `sha` do body.
- Cada arquivo gera um commit separado no GitHub.
- O remote `gitsafe-backup` é o backup interno do Replit; confirmações de push nele não significam que o GitHub foi atualizado.
- Nunca considerar uma alteração concluída apenas porque existe no workspace local ou no `gitsafe-backup`; confirme `refs/heads/main` no GitHub após o envio.
