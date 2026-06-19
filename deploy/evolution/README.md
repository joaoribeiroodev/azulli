# Evolution API — Oracle Cloud Always Free

Stack Docker para WhatsApp inbound do Azulli: Evolution API, Manager, Postgres e Redis.

**Custo:** $0 no tier Always Free da Oracle (VM ARM Ampere).  
**HTTPS:** Cloudflare Tunnel recomendado (sem abrir 8080 na internet).

Arquivos neste diretório:

| Arquivo | Descrição |
|---------|-----------|
| `docker-compose.yml` | Serviços Evolution + dependências |
| `.env.example` | Variáveis mínimas — copie para `.env` |

Guia completo (webhook Azulli, ENVs Vercel, testes): [`docs/GROWTH_PLATFORM_SETUP.md`](../../docs/GROWTH_PLATFORM_SETUP.md) — seção **2B**.

## Quick start na VM

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo systemctl enable --now docker

mkdir -p ~/evolution && cd ~/evolution
# Copie docker-compose.yml e .env deste diretório, ou clone o repo Azulli
cp .env.example .env
# Edite .env: POSTGRES_PASSWORD, AUTHENTICATION_API_KEY, SERVER_URL

docker compose up -d
docker compose ps
```

Manager (só na VM ou via tunnel): `http://127.0.0.1:3000`  
API: `http://127.0.0.1:8080`
