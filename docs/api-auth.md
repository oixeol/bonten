# BONTEN API — Autenticação (Fase 1)

Base URL: `http://localhost:4000/api`

Autenticação por **sessão em cookie** (httpOnly), guardada no Redis. CSRF por double-submit cookie + vínculo com a sessão.

## Cookies

| Cookie        | HttpOnly | Uso                          |
|---------------|----------|------------------------------|
| `bonten_sid`  | sim      | Token opaco da sessão        |
| `bonten_csrf` | não      | Token CSRF (lido pelo JS)    |

Em requisições mutantes (POST/PUT/PATCH/DELETE) autenticadas, envie o header `x-csrf-token` com o mesmo valor do cookie `bonten_csrf`.

## Endpoints

### `POST /auth/register`
Cria conta e inicia sessão. (isento de CSRF)

Body:
```json
{ "email": "a@b.com", "username": "player1", "password": "senha12345", "displayName": "Player 1", "locale": "pt-BR" }
```
Resposta `201`:
```json
{ "user": { "id": "uuid", "username": "player1", "email": "a@b.com", "displayName": "Player 1", "avatarUrl": null, "bio": null, "status": "online", "locale": "pt-BR", "createdAt": "..." } }
```
Set-Cookie: `bonten_sid`, `bonten_csrf`.

### `POST /auth/login`
Body: `{ "identifier": "a@b.com OU player1", "password": "senha12345" }` → `200` + `{ user }` + cookies.

### `GET /auth/me`
Requer sessão. → `200` `{ user }` | `401 { code: "auth.unauthenticated" }`.

### `POST /auth/logout`
Requer sessão + CSRF. Destroza a sessão no Redis e limpa cookies. → `204`.

### `GET /auth/csrf-token`
Requer sessão. Rotaciona o CSRF e devolve `{ "csrfToken": "..." }`.

## Códigos de erro (formato `{ "code": "..." }`)

| code | HTTP | Significado |
|------|------|-------------|
| `auth.invalid_credentials` | 401 | E-mail/username ou senha inválidos |
| `auth.email_already_registered` | 409 | E-mail em uso |
| `auth.username_already_taken` | 409 | Username em uso |
| `auth.unauthenticated` | 401 | Sem sessão válida |
| `auth.csrf_invalid` | 403 | CSRF ausente/divergente |
| `validation_failed` | 400 | Campos inválidos |
| `internal_error` | 500 | Erro interno |

O frontend traduz cada `code` via arquivos de tradução (seção 6.8).

## Fluxo recomendado (frontend)

1. `POST /auth/register` ou `/auth/login` → cookies definidos automaticamente.
2. Ler `bonten_csrf` (não-httpOnly) e guardar para mutações.
3. Em POST/PUT/PATCH/DELETE autenticados, enviar `x-csrf-token: <valor do cookie>`.
4. `GET /auth/me` para restaurar sessão ao recarregar a página.