## Guia do Middleware de Integração PMS

Este guia explica como usar o middleware para conectar sistemas externos (PMS, Booking Engines, Channel Managers, etc).

## Arquitetura

```
┌─────────────────┐
│  Sistema A (PMS)│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│    API Middleware (Esta Aplicação)  │
│  ┌──────────┐  ┌─────────────────┐ │
│  │ Webhooks │  │ Proxy/Forward   │ │
│  └──────────┘  └─────────────────┘ │
│  ┌──────────────────────────────┐  │
│  │ Transformers │ HTTP Client   │  │
│  └──────────────────────────────┘  │
└─────────────────┬───────────────────┘
                  │
                  ▼
       ┌──────────────────────┐
       │ Sistema B (External) │
       └──────────────────────┘
```

## Funcionalidades

### 1. Receber Webhooks

Endpoints para receber notificações de sistemas externos:

```bash
# Webhook genérico
POST /webhooks/:integration
Content-Type: application/json

{
  "event": "reservation.created",
  "data": { ... }
}

# Webhook específico por evento
POST /webhooks/:integration/:event
```

**Exemplo:**
```bash
curl -X POST http://localhost:3000/webhooks/booking_engine/reservation.created \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: <hmac_signature>" \
  -d '{
    "reservation_id": "RES-123",
    "guest_name": "John Doe",
    "check_in": "2025-01-15",
    "check_out": "2025-01-20"
  }'
```

### 2. Proxy/Forward de Requisições

Encaminha requisições autenticadas para sistemas externos:

```bash
# Listar integrações disponíveis
GET /proxy/integrations

# Verificar status de uma integração
GET /proxy/:integration/status

# Forward de requisição
POST /proxy/:integration/:endpoint
Authorization: Bearer <access_token>
```

**Exemplo:**
```bash
# 1. Obter token OAuth
curl -X POST http://localhost:3000/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "my_app",
    "client_secret": "my_secret",
    "grant_type": "client_credentials"
  }'

# 2. Fazer requisição via proxy
curl -X POST http://localhost:3000/proxy/booking_engine/createReservation \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reservationId": "RES-123",
    "guestName": "John Doe",
    "checkInDate": "2025-01-15",
    "checkOutDate": "2025-01-20",
    "roomType": "Deluxe",
    "numberOfGuests": 2,
    "totalAmount": 500,
    "currency": "USD"
  }'
```

### 3. Transformação de Dados

Os dados são automaticamente transformados entre formatos diferentes:

**Formato Interno →** Transformador **→ Formato Externo**

```typescript
// Entrada (formato interno)
{
  "reservationId": "RES-123",
  "guestName": "John Doe",
  "checkInDate": "2025-01-15"
}

// Saída (formato do booking engine)
{
  "reservation_id": "RES-123",
  "guest": {
    "name": "John Doe"
  },
  "stay": {
    "check_in": "2025-01-15T00:00:00.000Z"
  }
}
```

## Configuração de Integrações

As integrações são configuradas em `src/config/integrations.ts`:

```typescript
{
  "booking_engine": {
    "name": "Booking Engine",
    "enabled": true,
    "baseUrl": "https://api.booking-engine.example.com",
    "auth": {
      "type": "api_key",
      "credentials": {
        "apiKey": process.env.BOOKING_ENGINE_API_KEY
      }
    },
    "endpoints": {
      "createReservation": {
        "path": "/v1/reservations",
        "method": "POST",
        "transformer": "BookingReservationTransformer"
      }
    },
    "webhooks": {
      "enabled": true,
      "secret": process.env.BOOKING_ENGINE_WEBHOOK_SECRET,
      "events": ["reservation.created", "reservation.updated"]
    }
  }
}
```

### Variáveis de Ambiente

Configure as credenciais das integrações no arquivo `.env`:

```env
# Booking Engine
BOOKING_ENGINE_URL=https://api.booking-engine.example.com
BOOKING_ENGINE_API_KEY=your_api_key_here
BOOKING_ENGINE_WEBHOOK_SECRET=your_webhook_secret

# PMS System
PMS_SYSTEM_URL=https://api.pms.example.com
PMS_SYSTEM_TOKEN=your_bearer_token

# Channel Manager
CHANNEL_MANAGER_URL=https://api.channelmanager.example.com
CHANNEL_MANAGER_CLIENT_ID=your_client_id
CHANNEL_MANAGER_CLIENT_SECRET=your_client_secret
```

## Criar um Transformer Customizado

1. Crie um arquivo em `src/transformers/examples/MyTransformer.ts`:

```typescript
import { BaseTransformer } from '../baseTransformer';

interface InputFormat {
  field1: string;
  field2: number;
}

interface OutputFormat {
  different_field1: string;
  different_field2: string;
}

export class MyTransformer extends BaseTransformer<InputFormat, OutputFormat> {
  constructor() {
    super('MyTransformer');
  }

  transform(input: InputFormat): OutputFormat {
    return {
      different_field1: input.field1.toUpperCase(),
      different_field2: input.field2.toString()
    };
  }

  validate(input: InputFormat): boolean {
    return input.field1 && input.field2 > 0;
  }
}
```

2. Registre o transformer em `src/transformers/index.ts`:

```typescript
import { MyTransformer } from './examples/MyTransformer';

transformerRegistry.register('MyTransformer', new MyTransformer());
```

3. Configure no endpoint:

```typescript
"myEndpoint": {
  "path": "/api/endpoint",
  "method": "POST",
  "transformer": "MyTransformer"
}
```

## Segurança de Webhooks

Os webhooks usam validação HMAC SHA256:

### 1. Configurar Secret

```env
BOOKING_ENGINE_WEBHOOK_SECRET=my_super_secret_key
```

### 2. Gerar Signature (sistema externo)

```javascript
const crypto = require('crypto');

const payload = JSON.stringify(data);
const signature = crypto
  .createHmac('sha256', 'my_super_secret_key')
  .update(payload)
  .digest('hex');

// Enviar no header
headers['X-Webhook-Signature'] = signature;
```

### 3. Validação Automática

O middleware valida automaticamente a assinatura antes de processar o webhook.

## HTTP Client com Retry

O HTTP client possui retry automático com backoff exponencial:

```typescript
import { createHttpClient } from './services/httpClient';

const client = createHttpClient('booking_engine', {
  timeout: 30000,  // 30 segundos
  retries: 3       // 3 tentativas
});

// Fazer requisição
const response = await client.post('/v1/reservations', data);
```

## Logging

Todos os requests, webhooks e transformações são logados:

```bash
# Logs em console (desenvolvimento)
2025-12-30 10:30:15 [info]: HTTP Request { method: 'POST', url: '/v1/reservations' }
2025-12-30 10:30:16 [info]: Integration Call { integration: 'booking_engine', status: 'success' }

# Logs em arquivo
logs/combined.log  # Todos os logs
logs/error.log     # Apenas erros
```

## Endpoints Disponíveis

### Autenticação
- `POST /auth/token` - Obter access token
- `POST /auth/refresh` - Renovar token
- `POST /auth/revoke` - Revogar token

### Webhooks
- `POST /webhooks/:integration` - Receber webhook genérico
- `POST /webhooks/:integration/:event` - Receber webhook específico

### Proxy
- `GET /proxy/integrations` - Listar integrações
- `GET /proxy/:integration/status` - Status da integração
- `POST /proxy/:integration/:endpoint` - Forward POST
- `GET /proxy/:integration/:endpoint` - Forward GET
- `PUT /proxy/:integration/:endpoint` - Forward PUT
- `DELETE /proxy/:integration/:endpoint` - Forward DELETE

### Utilitários
- `GET /health` - Health check
- `GET /example` - Exemplo

## Exemplo Completo: Fluxo de Reserva

```bash
# 1. Sistema externo cria reserva (webhook)
POST /webhooks/booking_engine/reservation.created
X-Webhook-Signature: abc123...
{
  "reservation_id": "RES-001",
  "guest_name": "John Doe"
}

# 2. Middleware processa e transforma dados
# 3. Middleware autentica no sistema PMS

POST /proxy/pms_system/syncReservation
Authorization: Bearer <token>
{
  "reservationId": "RES-001",  # Formato transformado
  "guestName": "John Doe"
}

# 4. PMS recebe dados no formato esperado
```

## Monitoramento

O middleware gera logs estruturados em JSON para fácil análise:

```json
{
  "timestamp": "2025-12-30T10:30:15.123Z",
  "level": "info",
  "message": "Integration Call",
  "integration": "booking_engine",
  "action": "createReservation",
  "status": "success",
  "duration": 245,
  "statusCode": 200
}
```

## Troubleshooting

### Webhook não está sendo recebido
- Verifique se a integração está habilitada (`enabled: true`)
- Verifique se webhooks estão habilitados (`webhooks.enabled: true`)
- Verifique a assinatura HMAC

### Erro ao fazer proxy
- Verifique se você está autenticado (token válido)
- Verifique se a integração existe e está habilitada
- Verifique se o endpoint está configurado
- Verifique logs em `logs/error.log`

### Erro de transformação
- Verifique se o transformer está registrado
- Verifique se os campos obrigatórios estão presentes
- Verifique validações do transformer
- Veja logs detalhados da transformação

## Performance

- **Retry automático**: 3 tentativas com backoff exponencial
- **Timeout padrão**: 30 segundos por requisição
- **Rate limiting**: Configurável por integração
- **Connection pooling**: Gerenciado pelo axios
- **Logs assíncronos**: Winston com rotação de arquivos
