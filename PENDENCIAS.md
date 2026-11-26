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

## Itens já validados (automatizado)

- Typecheck: api + web + shared (✅)
- Build produção: api + web + shared (✅)
- Testes unitários: 85/85 passando (DMs, voice, channels, roles, auth, envelope) (✅)
- CSRF double-submit em navegador real (✅ — verificado anteriormente)
- Docker compose up (api + web + postgres + redis + seaweedfs + livekit) (✅)
- Rota `/comunidades` → `/servidores` renomeada (✅)
- E2EE backend: envelope v1, validação de chave pública, rejeição de substituição (✅)