# API Testing Guide

Guia de testes manuais da API usando curl.

## Configuração Inicial

### 1. Inicializar o Banco de Dados
```bash
npx ts-node scripts/initDatabase.ts
```

### 2. Criar um Cliente OAuth
```bash
npx ts-node scripts/createClient.ts test_client secret123 "Test Client" "Cliente para testes"
```

### 3. Iniciar o Servidor
```bash
# Porta padrão (3000)
npm start

# Ou especificar outra porta
PORT=3001 npm start
```

## Endpoints Públicos

### Health Check
```bash
curl http://localhost:3001/health | jq .
```

**Resposta:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-30T18:41:27.192Z",
  "uptime": 356.009818255
}
```

### Example Endpoint
```bash
curl http://localhost:3001/example
```

**Resposta:**
```json
{
  "message": "This is an example response from the controller."
}
```

### Listar Integrações
```bash
curl http://localhost:3001/proxy/integrations | jq .
```

**Resposta:**
```json
{
  "count": 2,
  "integrations": [
    {
      "name": "booking_engine",
      "displayName": "Booking Engine",
      "baseUrl": "https://api.booking-engine.example.com",
      "endpoints": ["createReservation", "getReservation", ...],
      "webhooksEnabled": true
    },
    ...
  ]
}
```

## Autenticação OAuth 2.0

### 1. Obter Access Token (Client Credentials Flow)
```bash
curl -X POST http://localhost:3001/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "test_client",
    "client_secret": "secret123",
    "grant_type": "client_credentials"
  }' | jq .
```

**Resposta:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "76b16a31dc0d7e696d56...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### 2. Refresh Access Token
```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "76b16a31dc0d7e696d56...",
    "grant_type": "refresh_token"
  }' | jq .
```

**Resposta:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "cafbea585f4cea619e0053...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### 3. Revogar Token (Logout)
```bash
curl -X POST http://localhost:3001/auth/revoke \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }' | jq .
```

**Resposta:**
```json
{
  "message": "Token revoked successfully"
}
```

## Endpoints Protegidos (Requerem Autenticação)

### Status de uma Integração
```bash
# Primeiro, obtenha um access token
TOKEN=$(curl -s -X POST http://localhost:3001/auth/token \
  -H "Content-Type: application/json" \
  -d '{"client_id":"test_client","client_secret":"secret123","grant_type":"client_credentials"}' \
  | jq -r .access_token)

# Use o token para acessar endpoints protegidos
curl http://localhost:3001/proxy/booking_engine/status \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Resposta:**
```json
{
  "integration": "booking_engine",
  "name": "Booking Engine",
  "enabled": true,
  "baseUrl": "https://api.booking-engine.example.com",
  "connectionStatus": "unreachable",
  "endpoints": ["createReservation", "getReservation", ...],
  "webhooks": {
    "enabled": true,
    "events": ["reservation.created", ...]
  }
}
```

### Proxy para Endpoint de Integração
```bash
# GET request
curl http://localhost:3001/proxy/booking_engine/getReservation?id=123 \
  -H "Authorization: Bearer $TOKEN" | jq .

# POST request
curl -X POST http://localhost:3001/proxy/booking_engine/createReservation \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "guestName": "John Doe",
    "checkIn": "2025-01-15",
    "checkOut": "2025-01-20",
    "roomType": "deluxe"
  }' | jq .
```

## Testes de Erro

### Autenticação sem credenciais
```bash
curl -X POST http://localhost:3001/auth/token \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

**Resposta:**
```json
{
  "error": "invalid_request",
  "error_description": "Missing required parameters: client_id, client_secret, grant_type"
}
```

### Acesso sem token
```bash
curl http://localhost:3001/proxy/booking_engine/status | jq .
```

**Resposta:**
```json
{
  "error": "unauthorized",
  "error_description": "No authorization header provided"
}
```

### Token inválido
```bash
curl http://localhost:3001/proxy/booking_engine/status \
  -H "Authorization: Bearer invalid_token" | jq .
```

**Resposta:**
```json
{
  "error": "unauthorized",
  "error_description": "Invalid or expired access token"
}
```

## Scripts Úteis

### Teste Completo de Autenticação
```bash
#!/bin/bash

# 1. Obter token
echo "1. Obtendo access token..."
RESPONSE=$(curl -s -X POST http://localhost:3001/auth/token \
  -H "Content-Type: application/json" \
  -d '{"client_id":"test_client","client_secret":"secret123","grant_type":"client_credentials"}')

TOKEN=$(echo $RESPONSE | jq -r .access_token)
REFRESH_TOKEN=$(echo $RESPONSE | jq -r .refresh_token)

echo "Access Token: $TOKEN"
echo ""

# 2. Testar endpoint protegido
echo "2. Testando endpoint protegido..."
curl -s http://localhost:3001/proxy/booking_engine/status \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""

# 3. Refresh token
echo "3. Fazendo refresh do token..."
NEW_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH_TOKEN\",\"grant_type\":\"refresh_token\"}")

NEW_TOKEN=$(echo $NEW_RESPONSE | jq -r .access_token)
echo "Novo Access Token: $NEW_TOKEN"
echo ""

# 4. Revogar token
echo "4. Revogando token..."
curl -s -X POST http://localhost:3001/auth/revoke \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$NEW_TOKEN\"}" | jq .
echo ""

# 5. Tentar usar token revogado
echo "5. Tentando usar token revogado..."
curl -s http://localhost:3001/proxy/booking_engine/status \
  -H "Authorization: Bearer $NEW_TOKEN" | jq .
```

## Variáveis de Ambiente

Se necessário, configure no arquivo `.env`:

```env
NODE_ENV=development
PORT=3001
JWT_SECRET=your-secret-key-change-this-in-production
LOG_LEVEL=debug
```

## Troubleshooting

### Porta em uso
Se a porta 3000 já estiver em uso:
```bash
PORT=3001 npm start
```

### Tabelas não existem
Se encontrar erro "no such table":
```bash
npx ts-node scripts/initDatabase.ts
```

### Cliente não existe
Se encontrar erro de autenticação:
```bash
npx ts-node scripts/createClient.ts test_client secret123 "Test Client"
```
