# Backend - Clínica Odontológica

Backend Node.js para o sistema de gestão de clínicas odontológicas, com integração ao Stripe para pagamentos.

## 🚀 Tecnologias

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **Stripe** - Gateway de pagamento
- **CORS** - Controle de acesso cross-origin
- **Helmet** - Segurança HTTP
- **Morgan** - Logger de requisições
- **Express Rate Limit** - Controle de taxa de requisições

## 📂 Estrutura do Projeto

```
backend/
├── controllers/
│   ├── stripeController.js    # Lógica do Stripe
│   └── clinicController.js    # Lógica das clínicas
├── routes/
│   ├── stripe.js             # Rotas do Stripe
│   └── clinic.js             # Rotas das clínicas
├── .env.example              # Exemplo de variáveis de ambiente
├── package.json              # Dependências e scripts
├── server.js                 # Servidor principal
└── README.md                 # Este arquivo
```

## ⚙️ Configuração

### 1. Instalação das Dependências

```bash
cd backend
npm install
```

### 2. Configuração das Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure as variáveis:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_your_monthly_price_id
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_your_yearly_price_id

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

### 3. Configuração do Stripe

1. Crie uma conta no [Stripe Dashboard](https://dashboard.stripe.com)
2. Obtenha suas chaves de API (Secret Key)
3. Configure os preços dos planos premium
4. Configure o webhook endpoint: `https://seu-dominio.com/api/stripe/webhooks`

## 🚀 Execução

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

O servidor estará rodando em `http://localhost:3001`

## 📋 API Endpoints

### Stripe

#### Criar Sessão de Checkout
```http
POST /api/stripe/create-checkout-session
Authorization: Bearer <token>
Content-Type: application/json

{
  "clinicId": "clinic-123",
  "priceId": "price_xxx",
  "successUrl": "http://localhost:3000/premium/success",
  "cancelUrl": "http://localhost:3000/premium/cancel"
}
```

#### Criar Portal do Cliente
```http
POST /api/stripe/create-customer-portal
Authorization: Bearer <token>
Content-Type: application/json

{
  "customerId": "cus_xxx",
  "returnUrl": "http://localhost:3000/premium"
}
```

#### Obter Status da Assinatura
```http
GET /api/stripe/subscription-status/:clinicId
Authorization: Bearer <token>
```

#### Webhook (Stripe)
```http
POST /api/stripe/webhooks
Stripe-Signature: <signature>
Content-Type: application/json
```

### Clínicas

#### Obter Dados da Clínica
```http
GET /api/clinic/:clinicId
Authorization: Bearer <token>
```

#### Criar Clínica
```http
POST /api/clinic/:clinicId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Clínica Exemplo",
  "cnpj": "12.345.678/0001-90",
  "email": "contato@clinica.com"
}
```

#### Atualizar Clínica
```http
PUT /api/clinic/:clinicId
Authorization: Bearer <token>
Content-Type: application/json

{
  "subscription": {
    "plan": "premium",
    "status": "active",
    "expiresAt": "2024-12-31T23:59:59.000Z"
  }
}
```

## 🔧 Webhooks do Stripe

O backend processa os seguintes eventos do Stripe:

- `checkout.session.completed` - Assinatura criada com sucesso
- `invoice.payment_succeeded` - Pagamento bem-sucedido
- `invoice.payment_failed` - Falha no pagamento
- `customer.subscription.deleted` - Assinatura cancelada
- `customer.subscription.updated` - Assinatura atualizada

## 🛡️ Segurança

- **Helmet** - Headers de segurança HTTP
- **CORS** - Controle de origem cruzada
- **Rate Limiting** - Limite de requisições por IP
- **Validação** - Validação de entrada nos endpoints
- **Webhook Signature** - Verificação de assinatura do Stripe

## 🚀 Deploy

### Heroku

1. Crie um app no Heroku:
```bash
heroku create clinica-backend
```

2. Configure as variáveis de ambiente:
```bash
heroku config:set STRIPE_SECRET_KEY=sk_live_xxx
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

3. Faça o deploy:
```bash
git push heroku main
```

### Railway

1. Conecte seu repositório ao Railway
2. Configure as variáveis de ambiente no painel
3. O deploy será automático

### Vercel

1. Instale a CLI do Vercel:
```bash
npm i -g vercel
```

2. Faça o deploy:
```bash
vercel --prod
```

## 📝 Desenvolvimento

### Adicionando Nova Funcionalidade

1. Crie o controller em `controllers/`
2. Adicione as rotas em `routes/`
3. Registre as rotas no `server.js`
4. Teste os endpoints

### Estrutura de Resposta

#### Sucesso
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

#### Erro
```json
{
  "error": "Error message",
  "details": "Detailed error information",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença ISC.
