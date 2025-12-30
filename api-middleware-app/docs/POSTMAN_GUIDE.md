# Guia da Coleção Postman - API Middleware

Este guia explica como importar e usar a coleção do Postman para testar a API Middleware.

## 📦 Arquivos Criados

- `API-Middleware.postman_collection.json` - Coleção com todos os endpoints
- `API-Middleware.postman_environment.json` - Variáveis de ambiente

## 🚀 Como Importar

### 1. Importar a Coleção

1. Abra o Postman
2. Clique em **Import** (canto superior esquerdo)
3. Selecione o arquivo `API-Middleware.postman_collection.json`
4. Clique em **Import**

### 2. Importar o Environment

1. No Postman, clique no ícone de **Environments** (canto superior direito)
2. Clique em **Import**
3. Selecione o arquivo `API-Middleware.postman_environment.json`
4. Clique em **Import**
5. Selecione o environment **"API Middleware - Local"** no dropdown

## ⚙️ Configuração

Antes de começar a testar, configure as variáveis de ambiente:

1. Clique no ícone de **Environments**
2. Selecione **"API Middleware - Local"**
3. Edite as seguintes variáveis:
   - `base_url` - URL da API (padrão: `http://localhost:3000`)
   - `client_id` - Seu Client ID
   - `client_secret` - Seu Client Secret

> **Nota:** As variáveis `access_token` e `refresh_token` serão preenchidas automaticamente após executar o request "Get Access Token".

## 📋 Estrutura da Coleção

### 1. Health & Status
- **Health Check** - Verifica se a API está online
- **Example Data** - Exemplo de endpoint público

### 2. Authentication
- **Get Access Token** - Obtém token de acesso (OAuth 2.0)
  - ✅ Salva automaticamente o `access_token` e `refresh_token`
- **Refresh Token** - Renova um token expirado
  - ✅ Atualiza automaticamente os tokens
- **Revoke Token** - Revoga um token (logout)

### 3. Proxy
- **List Integrations** - Lista todas as integrações disponíveis (público)
- **Get Integration Status** - Verifica status de uma integração (autenticado)
- **Proxy POST Request** - Encaminha requisição POST com transformação de dados
- **Proxy GET Request** - Encaminha requisição GET
- **Proxy PUT Request** - Encaminha requisição PUT com transformação
- **Proxy PATCH Request** - Encaminha requisição PATCH
- **Proxy DELETE Request** - Encaminha requisição DELETE

### 4. Webhooks
- **Receive Webhook** - Recebe webhook genérico
- **Receive Event-Specific Webhook** - Recebe webhook de evento específico

## 🔄 Fluxo de Teste Recomendado

### Passo 1: Verificar Saúde da API
```
1. Execute: Health Check
   - Confirme que a API está rodando
```

### Passo 2: Autenticação
```
2. Configure client_id e client_secret no Environment
3. Execute: Get Access Token
   - O access_token será salvo automaticamente
   - O refresh_token será salvo automaticamente
```

### Passo 3: Testar Endpoints Protegidos
```
4. Execute: List Integrations
   - Veja quais integrações estão disponíveis

5. Execute: Get Integration Status
   - Substitua :integration pelo nome da integração
   - O token será enviado automaticamente no header

6. Execute: Proxy POST Request
   - Substitua :integration e :endpoint
   - Modifique o body conforme necessário
```

### Passo 4: Testar Webhooks
```
7. Execute: Receive Webhook
   - Substitua :integration pelo nome
   - Modifique o body do webhook
```

## 🔑 Autenticação Automática

A coleção está configurada para gerenciar tokens automaticamente:

1. **Obter Token:** Execute "Get Access Token" uma vez
2. **Uso Automático:** Todos os endpoints autenticados usarão `{{access_token}}`
3. **Renovação:** Se expirar, execute "Refresh Token"
4. **Logout:** Execute "Revoke Token" quando terminar

## 📝 Variáveis de Path

Alguns endpoints usam variáveis de path. Atualize-as conforme necessário:

- `:integration` - Nome da integração (ex: `booking_engine`, `pms_system`)
- `:endpoint` - Endpoint de destino (ex: `reservations`, `guests`)
- `:event` - Tipo de evento (ex: `reservation.created`, `guest.updated`)

## 🧪 Exemplos de Integração

### Booking Engine
```
Integration: booking_engine
Endpoints disponíveis:
- reservations
- guests
- rooms
```

### PMS System
```
Integration: pms_system
Endpoints disponíveis:
- properties
- bookings
- rates
```

## 💡 Dicas

1. **Scripts de Teste:** A coleção inclui scripts que salvam automaticamente tokens
2. **Variáveis:** Use `{{variavel}}` para referenciar valores do environment
3. **Headers:** O header `Authorization: Bearer {{access_token}}` é adicionado automaticamente
4. **Body Templates:** Os bodies são exemplos - modifique conforme sua necessidade

## 🐛 Troubleshooting

### Token Inválido
```
Erro: 401 Unauthorized
Solução: Execute "Get Access Token" novamente
```

### Integração Não Encontrada
```
Erro: 404 Not Found
Solução: Execute "List Integrations" para ver as disponíveis
```

### Server Não Responde
```
Erro: Error: connect ECONNREFUSED
Solução: Verifique se o servidor está rodando em localhost:3000
```

## 📚 Recursos Adicionais

- [Documentação da API](../README.md)
- [Configuração de Integrações](../src/config/integrations.ts)
- [Testes E2E](../scripts/testEndToEnd.ts)
