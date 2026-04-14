# 🧠 HAVIS AI Hub BACKEND

A high-performance, production-ready Python backend powered by **FastAPI** and **Groq Cloud API**. This architecture is built with a strict separation of concerns, modular design, and robust validation.

---

## 🏗️ Architecture Stack

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Async, Type-safe)
- **AI Core**: [Groq API](https://groq.com/) (Ultra-low latency LLM processing)
- **Validation**: [Pydantic v2](https://docs.pydantic.dev/) (Strict schemas)
- **Settings**: [Pydantic Settings](https://docs.pydantic.dev/latest/usage/settings/) (Environment-managed)
- **ORM**: [SQLAlchemy 2.0](https://docs.sqlalchemy.org/) (Postgres ready, pooling)
- **Logging**: [Structlog](https://www.structlog.org/) + [Rich](https://github.com/Textualize/rich) (Deep observability)
- **Security**: [Jose](https://python-jose.readthedocs.io/) + [Passlib](https://passlib.readthedocs.io/) (JWT and Hashing)

---

## 📂 Project Structure

```text
backend/
├── app/
│   ├── api/                 # 🚀 API Routing Implementation
│   │   └── v1/              # Versioned API routes (v1)
│   │       ├── endpoints/   # Individual feature routers (ai, health, etc.)
│   │       └── router.py    # Aggregated root router (v1)
│   ├── core/                # ⚖️ Centralized Foundation
│   │   ├── config.py        # Settings validation (Pydantic)
│   │   ├── exceptions.py    # Custom domain exceptions
│   │   ├── logging.py       # Observability configuration
│   │   └── security.py      # JWT & Encryption handles
│   ├── db/                  # 🐘 Database Persistence Layer
│   │   └── session.py       # Session management & Pooling
│   ├── providers/           # 🔌 External API Clients
│   │   └── groq.py          # Isolated GroqProvider (Async)
│   ├── schemas/             # 🛠️ Data Transfer Objects (Validation)
│   │   ├── ai.py            # AI-specific request/response types
│   │   └── base.py          # Generic wrapper models
│   ├── services/            # 🧠 Heavy Lifting (Business Logic)
│   │   └── ai_service.py    # Orchestration of LLM workflows
│   ├── utils/               # 🔧 Utility Helper Methods
│   │   └── text_utils.py    # AI response cleaning & parsing
│   └── main.py              # 🏁 Entry point & Middleware config
├── .env.example             # Template for secrets
├── requirements.txt         # Dependency tree
└── run.py                   # Dev runner script
```

---

## 🔧 Core Architectural Strengths

### 1. **Strict Separation of Concerns**
- **Thin Routes**: Routes ONLY handle the mapping of requests and responses. Zero business logic is allowed.
- **Service Layer**: All complex orchestration, prompt construction, and "thinking" logic resides in the `services/` layer.
- **Provider Layer**: The `providers/` directory abstracts all low-level SDK calls to Groq. This ensures that switching AI vendors in the future is just one file change away.

### 2. **Professional AI Integration**
- The `GroqProvider` is fully asynchronous and supports both standard chat completions and streaming.
- **JSON Enforcement**: All AI outputs are processed using `json_mode` on the Groq side and validated via Pydantic on our side.
- **Malformed Response Cleaning**: The `text_utils` helper uses regex-based extraction to ensure valid JSON even if the AI wraps it in markdown commentary.

### 3. **Observability and Monitoring**
- **Structured Logs**: Production logs are generated as machine-readable JSON for ELK/Datadog integration. Development logs are color-coded and highly readable via `Rich`.
- **System Health**: Includes separate `/liveness`, `/readiness`, and deep-check endpoints to verify DB connectivity and AI provider uptime.

### 4. **Scalable Configuration**
- Uses **Pydantic Settings** to validate all environment variables on startup. The app will refuse to start if a critical setting (like `GROQ_API_KEY`) is missing.

---

## ⚡ Quickstart

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
2. **Setup Env**:
   - Rename `.env.example` to `.env`
   - Set your `GROQ_API_KEY`
3. **Launch Dev Server**:
   ```bash
   python run.py
   ```

---

*Built with precision and high-performance in mind for the HAVIS AI Hub.*
