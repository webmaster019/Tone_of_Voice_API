# ToneAssistant – Full Application Documentation

## 📌 Overview

ToneAssistant is a NestJS-based AI-powered backend that detects, evaluates, and improves brand tone-of-voice in text. It integrates with Slack to provide real-time notifications and approval workflows for tone drift suggestions.

---

## 🧱 Architecture Overview

* **NestJS** – Modular framework for scalable application structure
* **OpenAI GPT-4** – Generates tone suggestions, rewrites, and evaluations
* **Redis** – Tracks feedback statistics
* **TypeORM + PostgreSQL** – Manages tone signatures, evaluations, feedback, and rejections
* **Slack Integration** – Interactive notifications (approve/reject tone updates)
* **Chart.js (via chartjs-node-canvas)** – Server-side rendered evaluation visualizations
* **wink-nlp** – Performs lightweight NLP analysis for readability and metadata
* **Swagger UI** – Interactive documentation at `/docs`

---

## 🔧 Modules and Services

### 🧠 ToneModule

* `ToneService` – Core service that handles:

  * Tone analysis
  * Text rewriting
  * Tone evaluation and scoring
  * Signature storage and updating

* `ToneController` – REST API to:

  * Analyze tone
  * Rewrite text
  * Evaluate tone
  * Fetch tone charts, evaluations, and signatures

**Entities:**

* `ToneSignature`
* `ToneEvaluation`
* `ToneFeedback`
* `ToneRejection`

### 🧪 NlpModule

* `NlpService` – Lightweight NLP engine powered by `wink-nlp`

  * Tokenizes text
  * Calculates readability scores
  * Detects sentiment, emojis, hashtags, exclamations, etc.

### 💬 SlackModule

* `SlackService` – Sends alerts and messages to Slack
* `SlackController` – Handles Slack interactivity via `/slack/interact`

  * `approve_signature_update`
  * `reject_signature_update`

### ⏱ RetuneJobModule

* `RetuneJobService` – Scheduled service to detect tone drift

  * Runs every 10 minutes (via `@Cron`)
  * Scans evaluations with low tone alignment
  * Uses OpenAI to suggest updated tone signatures
  * Sends suggestions to Slack with approve/reject buttons

---

## 🚦 Workflow

1. ✍️ User submits text → analyzed via NLP + OpenAI → tone signature stored
2. 🔁 New content is rewritten using brand’s tone signature → evaluated
3. 📊 Evaluation scores and user feedback saved
4. 🧪 Retune job detects tone drift based on low-alignment evaluations
5. 🧠 OpenAI proposes updated tone signature
6. 💬 Slack posts a message for human approval
7. ✅ Approve = updated in DB | ❌ Reject = reviewer adds reason

---

## 🔌 Slack Integration Guide

### 📎 App Setup

Use this one-click link:
[Create Slack App](https://api.slack.com/apps?new_app=1&name=ToneAssistant&redirect_url=https://yourdomain.com/slack/oauth/callback)

### 🌐 Environment Configuration

```env
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=your_user
DATABASE_PASSWORD=your_password
DATABASE_DB=tone_db

OPENAI_API_KEY=sk-...
APP_REDIS_URL=redis://localhost:6379

SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_NOTIFY_USER_ID=U01ABC123,U02DEF456
SLACK_NOTIFY_CHANNEL=#tone-alerts
```

---

## 🚀 Swagger Setup

To enable Swagger UI in your NestJS app, update your `main.ts`:

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
          .setTitle('ToneAssistant API')
          .setDescription('API for tone analysis, rewriting, and evaluation')
          .setVersion('1.0')
          .addTag('Tone')
          .addTag('Evaluation')
          .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

✅ You can now access Swagger UI at:

```
http://localhost:3000/docs
```

To export OpenAPI JSON or YAML:

```ts
import { writeFileSync } from 'fs';
writeFileSync('./openapi.json', JSON.stringify(document, null, 2));
```

---

## 📚 REST API Endpoints

### 🎯 `/tone` (ToneController)

#### `POST /tone/signature/analyze`

Analyze tone and return signature.

**Request Body:**

```json
{ "text": "We’re excited to announce our latest features!" }
```

**Response:**

```json
{
  "tone": "Excited",
  "languageStyle": "Informal",
  "formality": "Low",
  "formsOfAddress": "We/Our",
  "emotionalAppeal": "Positive",
  "classification": "Conversational",
  "readabilityScore": 72.4,
  "sentiment": "Positive",
  "wordCount": 9
}
```

#### `POST /tone/signature/save`

Analyze tone and save to DB.

```json
{ "text": "Empower your ideas with our platform.", "brandId": "acme-brand" }
```

#### `POST /tone/signature/rewrite`

```json
{ "text": "Try our service now!", "brandId": "acme-brand" }
```

**Response:**

```json
"Experience innovation through our tailored solutions."
```

#### `POST /tone/signature/rewrite-with-evaluation`

```json
{ "text": "Let’s change the world together.", "brandId": "acme-brand" }
```

**Response:**

```json
{
  "rewrittenText": "Join us in transforming the future.",
  "fluency": "High",
  "authenticity": "Medium",
  "toneAlignment": "High",
  "readability": "Excellent",
  "score": 0.91
}
```

#### `GET /tone/signature/:brandId`

Fetch stored signature.

#### `GET /tone/brand`

Returns all brand IDs.

#### `POST /tone/brand/detect`

```json
{ "text": "Start building with confidence today." }
```

**Response:**

```json
{ "match": "acme-brand", "confidence": "high" }
```

---

### 📊 `/tone/evaluation` (EvaluationController)

#### `POST /tone/evaluation/feedback`

```json
{ "evaluationId": "abc123", "helpful": true }
```

#### `POST /tone/evaluation/signature/evaluate`

```json
{
  "brandId": "acme-brand",
  "originalText": "Try our product today!",
  "rewrittenText": "Experience innovation with us."
}
```

**Response:**

```json
{
  "fluency": "High",
  "authenticity": "High",
  "tone_alignment": "Medium",
  "readability": "Good",
  "strengths": ["Clear messaging"],
  "suggestions": ["Improve tone consistency"]
}
```

#### `GET /tone/evaluation/matrix`

Returns evaluation records in matrix format.

#### `GET /tone/evaluation/search`

Query:

```
?brandId=acme-brand&minScore=0.6&maxScore=1.0&page=1&limit=10
```

#### `GET /tone/evaluation/chart`

Query:

```
?brandId=acme-brand
```

Response: `[{ timestamp, score, fluency, toneAlignment, ... }]`

#### `GET /tone/evaluation/chart/preview`

Preview chart data grouped by trait and timestamp.

#### `GET /tone/evaluation/chart/image`

Returns `image/png`.

#### `GET /tone/evaluation/chart/traits?brandId=acme-brand&type=radar`

Returns trait chart (bar/radar PNG).

#### `GET /tone/evaluation/stats?brandId=acme-brand`

```json
{ "avgScore": 0.82, "minScore": 0.5, "maxScore": 0.96 }
```

#### `GET /tone/evaluation/feedback/:evaluationId`

Returns helpful/unhelpful counts from Redis.

#### `GET /tone/evaluation/tone-insights`

Returns top-performing tone traits:

```json
[
  { "trait": "tone:Conversational", "avgScore": 0.89 },
  { "trait": "formality:Low", "avgScore": 0.85 }
]
```

#### `GET /tone/evaluation/rejections`

Returns list of rejected suggestions.

#### `GET /tone/evaluation/rejections/chart`

Returns a PNG bar chart by reviewer.

---
