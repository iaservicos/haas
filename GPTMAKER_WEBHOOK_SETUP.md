# 🔧 Configuração do Webhook GPTMaker

## 📋 Resumo

Este guia explica como configurar o webhook do GPTMaker para enviar análises de fotos automaticamente para o seu backend, que as salva no Supabase.

---

## 🎯 Fluxo Completo

\`\`\`
1. Cliente envia foto via WhatsApp → GPTMaker
2. GPTMaker analisa a foto
3. GPTMaker dispara webhook → Seu Backend
4. Backend recebe análise → Salva no Supabase
5. Frontend lê análise do Supabase → Exibe resultado
\`\`\`

---

## 🚀 URL do Webhook

Seu webhook está disponível em:

\`\`\`
https://haas-mu.vercel.app/api/webhooks/gptmaker
\`\`\`

**Para testar localmente:**
\`\`\`
http://localhost:3000/api/webhooks/gptmaker
\`\`\`

---

## 🔐 Configurar no GPTMaker

### 1. Acessar Dashboard

1. Acesse: https://gptmaker.ai/dashboard
2. Selecione seu agente
3. Vá para **Configurações** → **Webhooks**

### 2. Configurar Webhook \`onNewMessage\`

**Endpoint:** \`https://haas-mu.vercel.app/api/webhooks/gptmaker\`

**Payload esperado:**

\`\`\`json
{
  "chatId": "chat-123",
  "contextId": "vistoria-confirmacao-id",
  "messageId": "msg-456",
  "content": "{\"status\": \"OK\", \"resultado\": \"ok\", \"descricao\": \"Equipamento em bom estado\"}",
  "role": "assistant",
  "metadata": {
    "vistoria_id": "uuid-da-vistoria",
    "foto_id": 7,
    "numero_serie": "4A418GY4O",
    "prompt": "Analisar foto do equipamento"
  },
  "timestamp": "2026-04-28T14:45:00Z"
}
\`\`\`

---

## 🧪 Testar Webhook

### Com cURL

\`\`\`bash
curl -X POST https://haas-mu.vercel.app/api/webhooks/gptmaker \\
  -H "Content-Type: application/json" \\
  -d '{
    "chatId": "test-chat",
    "contextId": "vistoria-test-123",
    "messageId": "test-msg",
    "content": "{\"status\": \"OK\", \"resultado\": \"ok\", \"descricao\": \"Teste de webhook\"}",
    "role": "assistant",
    "metadata": {
      "vistoria_id": "550e8400-e29b-41d4-a716-446655440000",
      "foto_id": 7,
      "numero_serie": "TEST123",
      "prompt": "Analisar foto"
    },
    "timestamp": "2026-04-28T14:45:00Z"
  }'
\`\`\`

### Resposta Esperada

\`\`\`json
{
  "success": true,
  "message": "Análise recebida e salva com sucesso",
  "data": {
    "fotoId": 7,
    "vistoriaId": "550e8400-e29b-41d4-a716-446655440000",
    "numeroSerie": "TEST123"
  }
}
\`\`\`

---

## 📝 Próximos Passos

1. ✅ Copiar os 3 arquivos para seu VSCode
2. ✅ Fazer commit e push no GitHub
3. ✅ Vercel faz deploy automático
4. ✅ Configurar webhook no GPTMaker
5. ✅ Testar com cURL
6. ✅ Enviar foto real via WhatsApp
7. ✅ Verificar se análise chegou no Supabase
