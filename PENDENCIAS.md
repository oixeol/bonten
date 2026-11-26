# BONTEN — Pendências (testes em dispositivo real)

Itens que só podem ser validados em dispositivo real (não cobertos por
typecheck/build/testes automatizados). Criado conforme seção 16.6 do
`BONTEN_prompt_completo.md`.

## Voz (LiveKit)

- [ ] Microfone + 2 clientes reais: validar mute/deafen/sound (áudio real).
- [ ] Qualidade de conexão / ping exibido na `VoiceBar`.
- [ ] Indicadores de mute/deafen vermelhos.
- [ ] Barra de voz: nome do canal (esq), controles (centro), ping (dir).
- [ ] Deafen muta o microfone; desmutar áudio desmuta o microfone; desconectar reseta ambos.
- [ ] Provider global de voz sobrevive à navegação entre rotas.
- [ ] Criar canal modal: tipos Text/Voz + toggle Private (fluxo real).
- [ ] Canais de voz privados: acesso por cargo (ADMIN/MANAGE_CHANNELS).

## E2EE (DMs)

- [ ] Dois clientes reais trocando chaves públicas X25519 e mensagens cifradas.
- [ ] Validação de key pinning (mudança de chave bloqueia envio).
- [ ] Mensagens legadas (plaintext) exibem aviso.

## Upload / Mídia

- [ ] Upload de avatar/GIF (permissões de arquivo do SO).
- [ ] GIFs 320×320px `object-contain`.
- [ ] GIFs de perfil/servidor somente VIP (`isVip`).

## Mobile / Responsividade

- [ ] Responsividade e gestos em dispositivo físico.
- [ ] Mobile rail (5 abas) navegável.
- [ ] Command palette em mobile.

## Moderação (Fase 5)

- [ ] Fluxo de denúncia end-to-end (criar report, moderar, log).
- [ ] Fila de moderação humana (admin).

## Descoberta (Fase 5)

- [ ] Busca de jogadores/comunidades com resultados reais.
- [ ] Recomendações básicas (ordenadas por status online).

## Início (Fase 6)

- [ ] Sidebar: amigos online, notificações, comunidades recomendadas com dados reais.
- [ ] Feed com posts reais (backend de feed — Fase 6+).

## Revisão completa do MVP (seção 9)

- [ ] Acessibilidade (ARIA, foco, contraste).
- [ ] Polimento visual final.
- [ ] Testes E2E (Playwright/Cypress) em CI.
- [ ] Revisão de segurança (CSRF, sessões, E2EE).

## Ordem de performance (lista do usuário)

### Implementado (código)
- [x] Compressão Brotli/Gzip (middleware `compression()` no NestJS)
- [x] Cabeçalhos de segurança (helmet: CSP, HSTS, X-Frame-Options, etc.)
- [x] Timeout nas APIs externas (AbortController 5s em fetch calls)
- [x] Lazy loading nas imagens fora da tela (`loading="lazy" decoding="async"`)
- [x] Hook `useDebounce` criado para busca e autocompletar
- [x] Requisições paralelas (`Promise.all` onde aplicável)
- [x] Índices para consultas mais comuns (Prisma `@@index`)
- [x] Select only needed columns (parcial — Prisma select em alguns endpoints)
- [x] Pool de conexões (Prisma default)
- [x] Evitar re-renders desnecessários (`useMemo`/`useCallback` em vários pontos)
- [x] Hospedar fontes (next/font self-hosted)
- [x] Esconder chaves API (env vars, não expostas no frontend)
- [x] Limpar segredos do GIT (.gitignore inclui .env)
- [x] Chaves públicas do Banco (Prisma usa credenciais do env)
- [x] Criptografar dados sensíveis (E2EE DMs, senhas argon2)
- [x] Autenticação no servidor (AuthGuard em todos os controllers)
- [x] Travar acesso aos registros (ownership/permission checks)
- [x] Usuário A não edita dados do B (validação de ownership)
- [x] Cookies de sessão seguros (httpOnly, sameSite, secure)
- [x] Hash nas senhas (argon2id)
- [x] Limite de tentativas (rate limiting)
- [x] Proteção contra bots e prompt injection (CSRF, validação de entrada)
- [x] Consultas parametrizadas (Prisma)
- [x] Validar toda entrada (class-validator + ValidationPipe)
- [x] Escape conteúdo do usuário (MarkdownText, sem innerHTML)
- [x] Restringir uploads (validação de tipo/tamanho)
- [x] Evitar chamadas duplicadas a API (Promise.all em vários pontos)
- [x] Corrigir consultas N+1 (Prisma includes otimizados)
- [x] Dividir JavaScript por páginas (Next.js automático)
- [x] Renderizar no servidor ou no build (Next.js SSR/SSG)
- [x] Imagens em WebP/AVIF (Next.js Image config)

### Pendente (requer implementação adicional)
- [ ] Skeletons de carregamento (componentes por página)
- [ ] Debounce aplicado em todos os inputs de busca (hook criado, falta aplicar)
- [ ] Paginar resultados da API (cursor/offset em endpoints)
- [ ] Arquivos estáticos via CDN (configurar no deploy)
- [ ] Tarefas lentas em fila de Jobs (BullMQ/Redis)
- [ ] Cache Redis dos dados mais consultados (cache layer)
- [ ] Remover dependências sem uso (executar depcheck)
- [ ] Transmitir respostas da IA token a token (SSE streaming)
- [ ] Atualizar interface sem esperar o servidor (optimistic updates)
- [ ] Virtualizar listas longas (react-window)
- [ ] Select only needed columns (Prisma select em todos os endpoints)
- [ ] Cache dos estáticos no navegador (Cache-Control headers)
- [ ] Distribuir tráfego entre várias instâncias (load balancer)
- [ ] Monitorar velocidade dos usuários reais (RUM / Web Vitals)
- [ ] Testar em celulares e redes lentas (manual)
- [ ] RLS (Row Level Security no PostgreSQL)
- [ ] OpenTelemetry (rastrear requisições lentas)
- [ ] Backup automático do banco (pg_dump cron)
- [ ] Force HTTPS (reverse proxy / nginx)
- [ ] Atualizar dependências (npm audit / pnpm update)
- [ ] Teste de ataques (pentest)
- [ ] Carregar scripts de terceiros depois da página (next/script strategy)
- [ ] Monitore a velocidade dos seus usuários reais (Web Vitals reporting)

## Itens já validados (automatizado)

- Typecheck: api + web + shared (✅)
- Build produção: api + web + shared (✅)
- Testes unitários: 88/88 passando (DMs, voice, channels, roles, auth, envelope, games) (✅)
- CSRF double-submit em navegador real (✅ — verificado anteriormente)
- Docker compose up (api + web + postgres + redis + seaweedfs + livekit) (✅)
- Rota `/comunidades` → `/servidores` renomeada (✅)
- E2EE backend: envelope v1, validação de chave pública, rejeição de substituição (✅)
- Parte 2: Times, Parties, Matchmaking, Ranking, Torneios, Integrity (✅)