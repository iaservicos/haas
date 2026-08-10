# Teste: Detecção de Fotos Duplicadas

## Objetivo
Validar que fotos idênticas (mesmo hash MD5) são bloqueadas na segunda tentativa de upload.

## Passo 1: Preparar a foto
- Use uma imagem de teste (ex: laptop.jpg)

## Passo 2: Primeiro upload
- Abra a vistoria no portal
- Vá para a aba "Upload de Fotos"
- Selecione laptop.jpg
- Clique "Enviar Foto"
- ✅ Esperado: Upload bem-sucedido

**Resultado:**
- [ ] Foto salva no banco
- [ ] foto_hash gerado (MD5)
- [ ] Mensagem: "Importação realizada com sucesso!"

## Passo 3: Segundo upload (mesma foto)
- Selecione novamente laptop.jpg
- Clique "Enviar Foto"
- ❌ Esperado: Erro 409 - Foto duplicada

**Resultado:**
- [ ] Status HTTP 409 Conflict
- [ ] Mensagem: "Foto duplicada. A foto "laptop.jpg" já foi enviada anteriormente."
- [ ] Dica: "Tente enviar uma foto diferente do equipamento."
- [ ] Arquivo NÃO é salvo novamente

## Passo 4: Upload de foto diferente
- Selecione outra foto do mesmo equipamento
- Clique "Enviar Foto"
- ✅ Esperado: Upload bem-sucedido

**Resultado:**
- [ ] Foto com hash diferente é aceita
- [ ] Ambas aparecem no histórico

## Logs esperados no backend

```
[inspecao.ts] Iniciando upload de foto...
[inspecao.ts] Hash da foto: abc123def456...

// Primeiro upload
[inspecao.ts] ⚠️ Foto duplicada detectada! Hash encontrado em: 42
```

## Banco de dados

Verificar na tabela `fotos_vistoria`:
```sql
SELECT id, foto_nome, foto_hash, created_at FROM fotos_vistoria 
WHERE numero_serie = 'SN001' 
ORDER BY created_at DESC;
```

Esperado:
- Cada foto tem um hash único
- Foto duplicada não aparece na lista
