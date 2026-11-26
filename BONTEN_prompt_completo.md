# BONTEN — Plataforma Gamer All-in-One

## 1. Visão geral do projeto

Desenvolva o BONTEN, uma plataforma gamer all-in-one com foco em comunicação por voz, comunidades, descoberta de jogadores, interação social e gerenciamento de equipes de esports.

O objetivo é reunir em um único ecossistema funcionalidades que atualmente estão distribuídas entre plataformas como Discord, ferramentas de gerenciamento de equipes e redes sociais gamers.

Slogan: CONNECT. PLAY. EVOLVE.

O BONTEN deve ter identidade própria, ser comercializável, escalável e possuir qualidade visual e técnica de um produto profissional.

Seu principal diferencial será a experiência de voz integrada à descoberta de jogadores e à formação de comunidades.

## 2. Identidade visual

### Paleta oficial

- Preto principal: #090909
- Grafite: #171717
- Cinza de superfícies: #242424
- Laranja principal: #FF7900
- Laranja claro: #FF9D42
- Branco: #F5F5F5
- Cinza secundário: #A3A3A3

### Diretrizes

- Predominância de preto e grafite.
- Laranja para ações principais, indicadores e elementos selecionados.
- Gradientes discretos em tons de laranja.
- Não utilizar roxo ou azul como cores principais.
- Evitar excesso de neon e efeitos visuais.
- Garantir contraste e acessibilidade.
- Manter identidade consistente em todas as telas.
- O visual deve ser sutil e profissional, nunca exageradamente gamer: sem estética agressiva, sem brilhos, glitch, partículas, molduras chamativas ou fontes e ícones temáticos exagerados.
- O caráter gamer aparece no contexto e no conteúdo (jogos, salas, status, comunidades), não em ornamentos. Referência de tom: Linear e Spotify, mais do que sites de periféricos gamer.

### Logotipo

Criar uma identidade original para BONTEN, incluindo símbolo, logotipo horizontal e ícone independente. O visual deve ser moderno, minimalista, discreto e reconhecível, sem estética gamer exagerada, com aplicação em fundos claros e escuros.

## 3. Público-alvo

- Jogadores casuais.
- Jogadores competitivos.
- Comunidades de jogos.
- Streamers e criadores de conteúdo.
- Equipes de esports.
- Organizações e gestores de equipes.

## 4. Navegação principal

Desenvolver cinco abas principais.

### 4.1 Início

- Saudação personalizada.
- Amigos online.
- Atividade recente.
- Salas de voz ativas.
- Jogos populares entre amigos.
- Acesso rápido às salas.
- Comunidades recomendadas.
- Convites pendentes.
- Notificações.

### 4.2 Comunidades

- Criar e participar de comunidades.
- Canais de texto.
- Salas de voz.
- Lista de membros.
- Cargos e permissões.
- Convites por link.
- Eventos e anúncios.
- Ferramentas de moderação.
- Configurações administrativas.

### 4.3 Voz

A principal funcionalidade diferenciadora do BONTEN.

- Salas permanentes e temporárias.
- Salas públicas e privadas.
- Criação rápida de salas.
- Lista de participantes.
- Indicador de quem está falando.
- Controles de microfone e áudio.
- Entrada e saída rápidas.
- Descoberta de salas por jogo.
- Jogadores disponíveis para partidas.
- Indicadores de qualidade da conexão.

Preparar a arquitetura para videochamadas e compartilhamento de tela em versões futuras.

#### 4.3.1 Uso normal do app durante chamadas e em comunidades (obrigatório)

O usuário deve poder usar o app normalmente enquanto estiver em uma sala de voz ou dentro de uma comunidade (servidor). Estar em chamada nunca pode bloquear nem limitar a navegação.

- A conexão de voz deve viver em um provedor global no layout raiz do Next.js, independente da rota. Trocar de aba, de página, de comunidade ou de canal não pode derrubar nem reiniciar a chamada.
- Exibir uma barra de chamada persistente em todas as telas, com a sala atual, quem está falando, microfone, áudio e sair, e um atalho para voltar à sala.
- Durante a chamada, o usuário pode ler e enviar mensagens, navegar pelas cinco abas, buscar jogadores e comunidades, abrir perfis, mudar configurações e entrar em outros canais de texto, inclusive de outras comunidades.
- Entrar em outra sala de voz troca de sala automaticamente, com confirmação clara. Só pode haver uma sala de voz ativa por usuário.
- Recarregar a página, perder a conexão ou trocar de rede deve levar a reconexão automática, com indicador de estado e sem perder as configurações de áudio.
- Se o usuário abrir o app em outra aba ou dispositivo, tratar a sessão de voz de forma explícita: avisar e permitir transferir a chamada, sem criar sessões duplicadas.
- No celular, manter o áudio funcionando com o app em segundo plano e com a tela bloqueada, quando a plataforma permitir.
- Permanecer em uma comunidade, ler canais, receber notificações e ver a lista de membros não deve exigir nem interferir na conexão de voz.
- Criar testes automatizados e manuais para: navegar entre todas as abas durante a chamada, trocar de comunidade, recarregar a página, perder a rede e abrir uma segunda aba.

### 4.4 Descobrir

- Busca de jogadores.
- Busca de comunidades.
- Filtros por jogo.
- Filtros por modalidade.
- Filtros por nível competitivo.
- Jogadores procurando duo ou equipe.
- Grupos temporários.
- Recomendações de jogadores.

### 4.5 Perfil

- Avatar.
- Nome de usuário.
- Biografia.
- Status online.
- Jogos favoritos.
- Comunidades.
- Amigos.
- Conquistas.
- Estatísticas competitivas futuras.
- Personalização do perfil.

## 5. Diferenciais competitivos

O BONTEN não deve ser apenas um clone do Discord.

Priorizar:

1. Descoberta inteligente de jogadores.
2. Salas de voz abertas e fáceis de encontrar.
3. Matchmaking social.
4. Integração entre comunidades e grupos.
5. Organização simplificada de partidas.
6. Ferramentas de gerenciamento de equipes.
7. Conversão de encontros temporários em amizades e comunidades.

Não exigir que o usuário abandone outras plataformas imediatamente. Criar motivos concretos para utilizar o BONTEN.

## 6. Tecnologias e linguagens obrigatórias

É obrigatório utilizar as tecnologias especificadas nesta seção. Não substituir as linguagens por outras sem justificativa técnica e aprovação.

A arquitetura deve separar claramente frontend, backend principal e serviços especializados.

### 6.1 Frontend — TypeScript + React + Next.js

Linguagens e frameworks:

- TypeScript.
- React.
- Next.js.

Responsabilidades:

- Construção de toda a interface visual.
- Navegação entre as cinco abas.
- Componentes reutilizáveis.
- Design system.
- Gerenciamento de estado da interface.
- Formulários e validações.
- Consumo das APIs do backend.
- Comunicação em tempo real por WebSocket.
- Integração com os recursos de voz.
- Responsividade para desktop, tablet e celular.

Next.js será utilizado como framework principal, aproveitando seus recursos de roteamento, renderização, otimização e organização da aplicação.

React será a base dos componentes e TypeScript será utilizado para tipagem, segurança e manutenção do código.

O frontend deve ser organizado por funcionalidades e módulos, evitando componentes gigantes e código duplicado.

### 6.2 Backend principal — TypeScript + NestJS

Linguagem: TypeScript.

Framework: NestJS.

Será o núcleo principal da aplicação e responsável pelas regras de negócio.

Responsabilidades:

- Autenticação e autorização.
- Cadastro e gerenciamento de usuários.
- Perfis gamers.
- Sistema de amizades.
- Comunidades.
- Canais.
- Mensagens.
- Cargos e permissões.
- Notificações.
- Convites.
- Moderação.
- Gerenciamento de partidas e grupos.
- Integração com os serviços especializados.
- APIs REST.
- Coordenação de eventos WebSocket.

Utilizar arquitetura de monólito modular inicialmente, com módulos independentes e limites bem definidos.

Não dividir tudo em microsserviços desde o início.

### 6.3 Backend especializado — Rust

Linguagem: Rust.

Runtime assíncrono: Tokio.

Rust será utilizado para serviços especializados que realmente necessitem de alto desempenho, eficiência de memória e baixa latência.

Responsabilidades previstas:

- Serviço avançado de matchmaking.
- Processamento intensivo de eventos.
- Cálculos competitivos e rankings em grande escala.
- Processamento de grandes volumes de dados em tempo real.
- Serviços especializados de baixa latência.
- Operações computacionalmente intensivas.

Rust não deve substituir automaticamente o backend principal. Deve atuar como serviço especializado, conectado ao núcleo TypeScript por APIs ou comunicação interna apropriada.

Não criar serviços Rust desnecessários no MVP.

### 6.4 Backend de inteligência e dados — Python

Linguagem: Python.

Framework: FastAPI.

Python será responsável por funcionalidades inteligentes, análise de dados e automação.

Responsabilidades:

- Inteligência artificial.
- Sistema de recomendação de jogadores.
- Recomendação de comunidades.
- Análise de comportamento e engajamento.
- Estatísticas de jogadores e equipes.
- Relatórios.
- Detecção de padrões e atividades suspeitas.
- Moderação assistida por IA.
- Automação de processos.
- Análises de desempenho competitivo.

Os serviços Python devem se comunicar com o backend principal por APIs bem definidas.

Não colocar todas as regras de negócio da aplicação em Python.

### 6.5 Backend de comunicação e infraestrutura — Go

Linguagem: Go.

Go será utilizado para serviços de infraestrutura e comunicação em tempo real que se beneficiem de concorrência eficiente e baixo consumo de recursos.

Responsabilidades previstas:

- Serviços auxiliares de comunicação em tempo real.
- Gerenciamento de conexões persistentes, quando necessário.
- Processamento de eventos de comunicação.
- Serviços de presença em grande escala, caso o serviço principal precise ser separado.
- Gateways especializados.
- Infraestrutura de suporte à comunicação e distribuição de eventos.

Para voz e vídeo, utilizar LiveKit, cuja infraestrutura de mídia utiliza Go.

Não desenvolver um servidor de mídia próprio do zero. Utilizar o LiveKit como SFU para encaminhamento de áudio e vídeo.

Go poderá ser utilizado para serviços complementares e integrações com essa infraestrutura, sem duplicar funções já oferecidas pelo LiveKit.

### 6.6 Banco de dados e infraestrutura

- PostgreSQL: banco de dados principal.
- Redis: cache, presença e informações temporárias.
- WebSocket: comunicação em tempo real.
- WebRTC: transporte de áudio e vídeo.
- LiveKit: infraestrutura de voz e mídia.
- Docker: containers e ambientes de desenvolvimento.
- Armazenamento compatível com S3: arquivos e mídias.
- CDN: distribuição de conteúdo.
- Monitoramento: logs, métricas e rastreamento de erros.

### 6.7 Docker (obrigatório)

Todo o projeto deve rodar em containers Docker, tanto em desenvolvimento quanto em produção.

- Criar um Dockerfile para cada serviço (frontend, NestJS e, quando existirem, Rust, Python, Go e n8n), com builds multi-stage e imagens enxutas.
- Criar um `docker-compose.yml` que suba o ambiente completo com um único comando: frontend, backend, PostgreSQL, Redis, LiveKit, armazenamento compatível com S3 (ex.: MinIO) e n8n, quando usado.
- Separar ambientes (desenvolvimento e produção) com arquivos de compose distintos.
- Usar volumes para dados persistentes, redes internas entre os serviços e healthchecks em cada container.
- Variáveis sensíveis em arquivos `.env` fora do repositório, com um `.env.example` documentado.
- Containers sem rodar como root sempre que possível, e sem expor portas desnecessárias.
- Documentar nas instruções de execução local como subir, parar, ver logs e reiniciar o ambiente.

### 6.8 Idioma e internacionalização (obrigatório)

O app deve se adaptar automaticamente ao idioma do Windows do usuário.

- Detectar o idioma preferido do usuário na primeira visita, usando a lista de idiomas do navegador (`navigator.languages` e o cabeçalho `Accept-Language`), que reflete o idioma de exibição do Windows. Se o BONTEN virar aplicativo desktop no futuro, ler o idioma do sistema diretamente.
- Idiomas iniciais: Português (Brasil) e Inglês. Estruturar para adicionar novos idiomas apenas incluindo arquivos de tradução, sem mexer no código dos componentes.
- Se o idioma detectado não for suportado, usar o inglês como padrão; se houver variante próxima (ex.: pt-PT), usar o idioma base mais próximo (pt-BR).
- Permitir que o usuário troque o idioma manualmente nas configurações. A escolha manual sempre prevalece sobre a detecção automática e deve ser salva no perfil.
- Usar uma biblioteca de i18n integrada ao Next.js (ex.: next-intl) e nenhum texto fixo no código: todos os textos da interface ficam em arquivos de tradução organizados por módulo.
- Formatar datas, horas, números e plurais conforme o idioma e a região, usando a API `Intl`.
- O backend não envia frases prontas para a interface: envia códigos de erro e de evento, e o frontend os traduz. E-mails e notificações usam o idioma salvo no perfil do usuário.
- Prever textos mais longos em alguns idiomas, para que o layout não quebre.

## 7. Como as linguagens trabalharão juntas

A arquitetura deve seguir esta divisão:

```text
BONTEN
│
├── FRONTEND
│   ├── TypeScript
│   ├── React
│   └── Next.js
│
├── BACKEND PRINCIPAL
│   ├── TypeScript
│   └── NestJS
│       ├── Autenticação
│       ├── Usuários
│       ├── Comunidades
│       ├── Mensagens
│       ├── Amigos
│       └── Regras de negócio
│
├── SERVIÇOS ESPECIALIZADOS
│   ├── Rust + Tokio
│   │   └── Matchmaking e processamento de alto desempenho
│   │
│   ├── Python + FastAPI
│   │   └── IA, recomendações e análise de dados
│   │
│   └── Go
│       └── Infraestrutura auxiliar de comunicação e eventos
│
├── AUTOMAÇÕES (somente se necessário)
│   └── n8n
│       └── Emails, alertas, rotinas agendadas e integrações externas
│
├── VOZ E VÍDEO
│   ├── WebRTC
│   └── LiveKit / SFU
│
└── INFRAESTRUTURA
    ├── PostgreSQL
    ├── Redis
    ├── Docker
    ├── S3
    └── CDN
```

### Regras de integração

- O frontend deve consumir os serviços por interfaces bem definidas.
- O NestJS será o ponto central das regras de negócio.
- Rust, Python e Go devem possuir responsabilidades específicas.
- Utilizar APIs HTTP ou gRPC quando apropriado.
- Utilizar WebSocket para eventos em tempo real.
- Evitar comunicação direta desnecessária entre todos os serviços.
- Definir contratos, formatos de dados e tratamento de erros.
- Implementar autenticação entre serviços.
- Manter logs e monitoramento centralizados.

Importante: não criar quatro backends completos e independentes. Criar um backend principal e serviços especializados conforme a necessidade.

## 8. Organização dos módulos

O backend principal deverá conter:

1. Authentication.
2. Users.
3. Gamer Profiles.
4. Friends.
5. Presence.
6. Communities.
7. Channels.
8. Messaging.
9. Voice Integration.
10. Discovery.
11. Matchmaking Integration.
12. Notifications.
13. Moderation.
14. Competitive Statistics.
15. Organizations.
16. Media Management.

Os serviços especializados devem permanecer separados quando houver justificativa técnica.

## 9. Escopo do MVP

Desenvolver inicialmente:

- Cadastro e login.
- Perfil gamer.
- Sistema de amizades.
- Status online.
- Criação de comunidades.
- Canais de texto.
- Salas de voz em grupo.
- Controles de microfone e áudio.
- Lista de participantes.
- Busca de comunidades.
- Descoberta básica de jogadores.
- Convites.
- Bloqueio e denúncia.
- Moderação básica.

Deixar para versões futuras:

- Feed social completo.
- Vídeos curtos.
- Videochamadas.
- Compartilhamento de tela.
- Marketplace.
- Torneios avançados.
- Gestão profissional de organizações.
- Matchmaking competitivo avançado.
- IA avançada.
- Estatísticas avançadas.

## 10. Segurança

Implementar:

- Autenticação segura.
- Controle de permissões.
- Proteção de dados.
- Bloqueio de usuários.
- Denúncias.
- Moderação.
- Proteção contra spam.
- Validação de entradas.
- Rate limiting.
- Registro de ações administrativas.
- Comunicação segura entre serviços.

### 10.1 Proteção de chaves e criptografia (obrigatório)

**Chaves e segredos**

- Nenhuma chave secreta pode ser exposta ao navegador, ao frontend, ao repositório, aos logs, às imagens Docker ou às respostas das APIs. Somente chaves públicas podem chegar ao cliente (ex.: URL pública da API, URL do LiveKit, chave pública de notificações push).
- Variáveis com prefixo `NEXT_PUBLIC_` só podem conter valores públicos. Antes de cada entrega, revisar o bundle do frontend para confirmar que nenhum segredo foi incluído.
- Segredos (segredo da API do LiveKit, senhas de banco, chaves de assinatura de tokens, webhooks, credenciais de S3 e do n8n) ficam apenas no backend, via variáveis de ambiente ou Docker secrets, nunca no código nem nos workflows exportados.
- O cliente nunca recebe a chave secreta do LiveKit: o NestJS gera tokens de acesso de curta duração, com permissões mínimas, para cada sala e usuário.
- Manter `.env` fora do Git, com `.env.example` apenas com nomes e valores de exemplo. Adicionar verificação automática de segredos no repositório (secret scanning) e plano de rotação de chaves.
- Senhas com hash forte (Argon2id ou bcrypt), tokens de sessão com expiração e renovação segura, e cookies `HttpOnly`, `Secure` e `SameSite`.
- Comunicação entre serviços autenticada e criptografada (mTLS ou tokens assinados), sem segredos em URLs.

**Criptografia em trânsito e em repouso**

- Todo tráfego em HTTPS/TLS e WebSocket seguro (WSS).
- Dados sensíveis criptografados em repouso (banco, backups e armazenamento S3).

**Mensagens**

- Mensagens diretas e grupos privados com criptografia ponta a ponta (E2EE): as chaves privadas são geradas e ficam apenas no dispositivo do usuário, e o servidor armazena somente texto cifrado e chaves públicas.
- Usar um protocolo e bibliotecas consolidados e auditados (ex.: Signal Protocol ou MLS). Não inventar criptografia própria.
- Canais de comunidades com muitos membros, moderação e busca usam TLS e criptografia em repouso, sem E2EE por padrão, porque E2EE impede moderação no servidor e busca. Apresentar esse trade-off para minha decisão antes de implementar.
- Denúncias: o usuário denunciante envia voluntariamente o conteúdo da mensagem como prova, e o servidor nunca descriptografa mensagens por conta própria.

**Voz e vídeo**

- WebRTC já cifra o transporte (DTLS-SRTP), mas o SFU consegue acessar a mídia. Para salas privadas, ativar a criptografia ponta a ponta do LiveKit (E2EE), com as chaves das salas distribuídas apenas entre os participantes e nunca armazenadas no servidor.
- Rotacionar a chave da sala quando um participante entra ou sai, para que quem saiu não acompanhe a conversa.
- Salas públicas usam, no mínimo, criptografia de transporte. Informar na interface, de forma clara, quando uma sala é ponta a ponta e quando não é.

**Testes**

- Criar testes automatizados para: ausência de segredos no frontend, geração de tokens de curta duração, cifragem e decifragem de mensagens, e comportamento das chaves ao entrar e sair de salas.

### 10.2 Sistema de denúncias avaliadas por IA

Toda denúncia deve ser avaliada automaticamente por IA, com decisão humana nos casos graves ou incertos.

**Fluxo**

1. O usuário denuncia uma mensagem, perfil, comunidade ou sala de voz, escolhendo uma categoria (assédio, discurso de ódio, spam, golpe, conteúdo sexual, ameaça, outros) e podendo adicionar um comentário.
2. O NestJS registra a denúncia, valida e aplica rate limiting contra abuso do próprio sistema de denúncias.
3. O serviço Python (FastAPI) avalia a denúncia e devolve: categoria sugerida, gravidade, nível de confiança, resumo curto e justificativa.
4. O NestJS decide a ação conforme as regras abaixo e registra tudo no log de auditoria.
5. O denunciante e o denunciado são notificados do resultado, no idioma de cada um.

**Responsabilidades**

- Python (FastAPI): análise de conteúdo e contexto, classificação, pontuação de gravidade e confiança, detecção de padrões (reincidência, ataques coordenados, denúncias falsas em massa).
- NestJS: regras de negócio, aplicação das ações, permissões, notificações, histórico e fila de moderação.
- n8n (se usado): apenas alertas aos moderadores, sem decisões.
- A IA recomenda; o NestJS executa. A IA nunca tem acesso direto ao banco nem a ações administrativas.

**Regras de decisão**

- Confiança alta e gravidade baixa (ex.: spam óbvio): ação automática reversível (ocultar conteúdo, aviso ao usuário).
- Gravidade média ou confiança média: enviar para a fila de moderadores humanos, já com o resumo e a justificativa da IA.
- Gravidade alta (ameaças, exploração de menores, autolesão, violência): prioridade máxima, alerta imediato aos moderadores e preservação das evidências. Nunca resolver apenas pela IA.
- Banimentos, suspensões longas e remoção de comunidades exigem sempre confirmação humana.
- Todo usuário penalizado pode contestar, e a contestação é revisada por um humano diferente do primeiro.
- Reincidência aumenta a gravidade da ação de forma gradual (aviso, silenciamento temporário, suspensão).

**Privacidade e criptografia**

- A IA só analisa o conteúdo que o denunciante enviou voluntariamente como prova, mais o contexto estritamente necessário. Mensagens com criptografia ponta a ponta nunca são descriptografadas pelo servidor (seção 10.1).
- Não enviar à IA mais dados pessoais do que o necessário. Mascarar ou omitir dados identificadores sempre que possível.
- As chaves do provedor de IA ficam apenas no backend, nunca no cliente.
- Definir prazo de retenção das evidências e dos resultados da análise.

**Qualidade e transparência**

- Registrar para cada decisão: denúncia, resultado da IA, versão do modelo, ação tomada e moderador responsável. Esse registro é imutável.
- Avaliar periodicamente falsos positivos e falsos negativos e ajustar limites de confiança.
- Mostrar ao usuário o motivo da ação de forma clara e sem expor dados de quem denunciou.
- Punir de forma proporcional quem abusa do sistema de denúncias.
- Criar testes automatizados para: classificação por categoria, regras de decisão por gravidade e confiança, escalonamento humano, contestação e proteção da identidade do denunciante.

## 11. Design profissional e experiência do usuário

O BONTEN deve parecer um produto comercial real, não um template ou projeto acadêmico.

Referências de qualidade de experiência: Discord, Linear, Steam e Spotify, sem copiar suas interfaces.

### Requisitos visuais

- Design premium e moderno.
- Identidade sutil e sofisticada, com toque gamer discreto e sem exageros.
- Navegação intuitiva.
- Hierarquia visual clara.
- Tipografia profissional.
- Ícones consistentes.
- Cards e painéis refinados.
- Animações discretas.
- Transições suaves.
- Estados de carregamento.
- Skeleton screens.
- Estados vazios bem projetados.
- Feedback visual imediato.
- Responsividade.
- Acessibilidade.

A aba de voz deve ser um dos elementos visuais mais marcantes do produto.

O usuário precisa identificar facilmente quem está falando, quem está conectado, quais salas estão disponíveis e como iniciar uma conversa.

### Qualidade do frontend

- Criar design system próprio.
- Criar componentes reutilizáveis.
- Manter espaçamentos consistentes.
- Evitar excesso de elementos.
- Não criar botões sem funcionalidade.
- Não apresentar dados fictícios como dados reais.
- Testar todos os fluxos de interação.
- Otimizar carregamento e renderização.

### 11.1 Sem aparência de "vibecode" (obrigatório)

O BONTEN não pode parecer um projeto gerado por IA com template genérico. Cada tela deve parecer desenhada por um designer de produto.

**Evitar**

- Emojis como ícones ou decoração de interface.
- Cards todos iguais, empilhados em grades repetitivas, com cantos muito arredondados e sombras pesadas.
- Gradientes grandes, brilhos, efeitos de vidro (glassmorphism) e animações de "wow" sem função.
- Títulos genéricos e textos de marketing vazios ("Revolucione sua experiência", "O futuro dos games").
- Telas de entrada com hero gigante, botões grandes demais e muito espaço vazio sem propósito.
- Mesma fonte padrão do template, sem hierarquia de tamanhos e pesos.
- Dados de exemplo óbvios (usuários "John Doe", números redondos, avatares genéricos) apresentados como reais.
- Componentes de biblioteca usados sem personalização, com a aparência padrão.
- Espaçamentos e raios de borda inconsistentes entre telas.

**Fazer**

- Definir tokens de design (cores, espaçamento, raios, sombras, tipografia) antes de criar qualquer tela, e usá-los em todo o app.
- Escolher uma família tipográfica com personalidade e legibilidade, com escala de tamanhos e pesos bem definida.
- Usar um único conjunto de ícones consistente (SVG), com mesmo traço e tamanho.
- Priorizar densidade de informação útil, alinhamentos precisos e hierarquia clara, como em Linear e Spotify.
- Escrever textos de interface curtos, diretos e específicos, na voz da marca, sempre via arquivos de tradução.
- Projetar estados vazios, de erro e de carregamento com conteúdo útil e orientação real.
- Aplicar animações apenas para dar feedback ou orientar a atenção, discretas e rápidas.
- Usar dados reais vindos do backend e, quando não houver, mostrar o estado vazio em vez de inventar conteúdo.
- Revisar cada tela contra este checklist antes de apresentá-la para minha confirmação, e dizer o que foi ajustado para evitar a aparência genérica.

## 12. Monetização

Manter funcionalidades essenciais gratuitas.

Possíveis recursos premium:

- Personalização avançada de perfil.
- Recursos adicionais para comunidades.
- Ferramentas profissionais para organizações.
- Armazenamento adicional.
- Recursos para criadores.
- Estatísticas e relatórios.
- Personalização de salas e comunidades.

Não limitar funções essenciais de comunicação por voz atrás de uma assinatura.

## 13. Roadmap de desenvolvimento

O desenvolvimento segue as fases abaixo, em ordem. Cada fase termina com validação e confirmação minha antes de avançar (seção 16). O guia de fases (arquivo separado) detalha cada uma.

### Fase 0 — Planejamento (sem código)

- Apresentar arquitetura, estrutura de pastas, plano de execução, papel de cada linguagem e uso (ou não) do n8n.
- Listar as decisões pendentes para eu aprovar (ex.: E2EE em canais de comunidades, seção 10.1).

### Fase 1 — Fundação

- Repositório, Docker e docker-compose (seção 6.7), gestão de segredos (seção 10.1).
- Next.js, React, TypeScript e internacionalização (seção 6.8).
- NestJS, PostgreSQL e Redis.
- Autenticação segura.
- Frontend partes 1 a 3: design system e logotipo, layout e navegação, autenticação e estados globais.

### Fase 2 — Perfil, amizades e presença

- Perfis gamers, amizades, bloqueio e status online (Redis e WebSocket).
- Frontend parte 4: aba Perfil.

### Fase 3 — Comunidades e texto

- Comunidades, canais, mensagens, cargos e permissões, convites e notificações.
- E2EE em mensagens diretas e grupos privados (seção 10.1).
- Frontend parte 5: aba Comunidades.

### Fase 4 — Voz

- Integrar LiveKit: salas permanentes e temporárias, controles de áudio, participantes e qualidade da conexão.
- Garantir que o app funcione normalmente durante a chamada (seção 4.3.1) e E2EE nas salas privadas.
- Frontend parte 6: aba Voz.

### Fase 5 — Descoberta e moderação básica

- Busca de jogadores e comunidades, filtros, grupos temporários e recomendações básicas.
- Denúncias, fila de moderação humana e registro de ações administrativas, com o modelo de dados já preparado para a análise por IA.
- Frontend parte 7: aba Descobrir.

### Fase 6 — Início e fechamento do MVP

- Frontend parte 8: aba Início, integrando amigos online, salas ativas, comunidades recomendadas, convites e notificações.
- Revisão completa do MVP (seção 9).

### Fase 7 — Serviços especializados

- Python: recomendações e avaliação de denúncias por IA (seção 10.2).
- Rust e Go somente com necessidade comprovada por métricas.
- n8n somente onde for justificado (seção 16.2).

### Fase 8 — Polimento e entrega

- Frontend parte 9: integração final, responsividade, acessibilidade e performance.
- Testes, documentação das APIs, instruções de execução local e documentação de implantação.

### Fase 9 — Expansão (futuro)

- Feed social, clipes, vídeo, compartilhamento de tela, matchmaking avançado, gestão de equipes, torneios e recursos profissionais para organizações.

## 14. Entregáveis

Apresentar:

1. Arquitetura técnica completa.
2. Estrutura de diretórios.
3. Design system.
4. Protótipos das cinco abas.
5. Componentes reutilizáveis.
6. Frontend funcional.
7. Backend principal.
8. Serviços especializados.
9. Modelo do banco de dados.
10. Integração de autenticação.
11. Sistema de comunidades.
12. Comunicação por texto.
13. Integração de voz.
14. Documentação das APIs.
15. Testes.
16. Instruções de execução local.
17. Documentação de implantação.

## 15. Regras obrigatórias de desenvolvimento

- Não substituir as linguagens especificadas sem justificativa.
- Não misturar responsabilidades entre serviços.
- Não criar microsserviços desnecessários.
- Não implementar Rust, Python e Go apenas para dizer que foram utilizados.
- Priorizar segurança, manutenção e desempenho.
- Utilizar tipagem forte no TypeScript.
- Documentar as integrações.
- Criar testes automatizados para funcionalidades críticas.
- Não entregar apenas telas estáticas.
- Não simular funcionalidades que deveriam estar conectadas ao backend.
- Desenvolver por etapas, validando cada etapa antes de avançar.

Antes de iniciar a implementação, apresente a arquitetura, a estrutura de pastas e o plano de execução. Explique como cada linguagem será utilizada.

Resultado final esperado: um BONTEN profissional, atraente, funcional, escalável e com identidade própria. Uma plataforma gamer que possa evoluir de um MVP para um ecossistema completo, com comunicação por voz como principal diferencial competitivo.

## 16. Regras de execução, n8n e confirmação por etapas

### 16.1 Princípio geral

Faça direito, não rápido. Nada de código placeholder, telas estáticas, dados fictícios apresentados como reais ou botões sem função. Antes de cada etapa, diga o que vai fazer; depois, mostre o que foi feito e como testar. Se algo do documento for ambíguo ou tecnicamente inviável, pergunte antes de decidir sozinho.

### 16.2 n8n (somente se necessário)

Use o n8n apenas para automações e integrações de fluxo **fora do caminho crítico** do produto, por exemplo:

- Emails transacionais (boas-vindas, convites, recuperação de conta).
- Alertas de denúncias para moderadores (Discord, email, Telegram).
- Relatórios periódicos e rotinas agendadas.
- Webhooks de integrações externas e avisos administrativos.

O n8n **não** deve ser usado para: autenticação, regras de negócio, mensagens em tempo real, voz, matchmaking ou qualquer coisa que exija baixa latência. Isso continua no NestJS, Rust, Go e LiveKit.

Regras:

- O n8n roda em Docker.
- O NestJS o aciona por webhook autenticado (segredo/assinatura).
- Credenciais ficam em variáveis de ambiente, nunca nos workflows exportados.
- Todo workflow é exportado em JSON e versionado no repositório.
- Documente cada fluxo (gatilho, entrada, saída, tratamento de erro).
- Antes de incluir o n8n, justifique em 2–3 linhas por que ele é melhor que código no NestJS para aquele caso. Se não houver justificativa, não use.

### 16.3 Frontend dividido em partes, com confirmação

O frontend **não** deve ser entregue de uma vez. Construa nesta ordem, **uma parte por vez**:

1. Design system (cores, tipografia, espaçamentos, ícones, componentes base) e logotipo.
2. Layout geral e navegação entre as cinco abas.
3. Autenticação (cadastro/login) e estados globais (carregamento, vazio, erro).
4. Aba Perfil.
5. Aba Comunidades.
6. Aba Voz (a mais cuidada visualmente).
7. Aba Descobrir.
8. Aba Início (por último entre as abas, pois reúne dados de todas as outras).
9. Integração final com APIs e WebSocket, polimento, responsividade e acessibilidade.

Cada parte pertence a uma fase do roadmap (seção 13) e é entregue dentro dela.

**Em cada parte:**

- Ao terminar e depois de concluir a verificação obrigatória (seção 16.6), **pare** e apresente: o que foi feito, como rodar/ver, o que ainda não está conectado ao backend e pontos que quer decidir comigo.
- **Não avance** para a próxima parte até eu responder explicitamente "confirmado" (ou pedir ajustes).
- Se eu pedir ajustes, aplique, reapresente e espere nova confirmação.
- Nunca junte duas partes na mesma entrega sem minha autorização.

### 16.4 Ordem geral de trabalho

1. Antes de codar: apresente arquitetura, estrutura de pastas, plano de execução, o papel de cada linguagem e onde o n8n entraria (ou por que não entraria). Aguarde minha aprovação.
2. Siga as fases do roadmap (seção 13), validando cada uma antes de avançar.
3. Em cada etapa: testes automatizados para o que é crítico, documentação atualizada e checklist de segurança (seção 10).
4. Rust, Python e Go só entram quando houver necessidade comprovada, conforme a seção 15.
5. Tudo deve rodar via Docker (seção 6.7). Cada etapa entregue precisa funcionar com `docker compose up`.
6. Em toda tela, usar textos traduzíveis desde o início (seção 6.8), nunca texto fixo no código, e confirmar que o app respeita o idioma do Windows.
7. Em cada etapa, verificar que nenhuma chave secreta foi exposta e que a criptografia da seção 10.1 está sendo aplicada.
8. Em toda tela, aplicar o checklist da seção 11.1 para que o app não tenha aparência genérica de IA ou template.
9. Em toda tela, respeitar o visual sutil definido nas seções 2 e 11. Se algo parecer exageradamente gamer, simplifique antes de me mostrar.

### 16.5 Formato das respostas

Seja objetivo: resumo do que foi feito, lista de arquivos criados/alterados, comandos para executar, o que testar, riscos e dúvidas. Sem enrolação e sem afirmar que algo funciona sem ter verificado.

### 16.6 Verificação obrigatória antes de dizer que está pronto

Nenhuma etapa, parte do frontend ou funcionalidade pode ser declarada pronta sem passar por este processo, nesta ordem:

1. **Executar:** fazer um build limpo e subir o ambiente com Docker (`docker compose up`), confirmando que tudo inicia sem erros nos logs.
2. **Testar tudo:** testar todas as funcionalidades da etapa de ponta a ponta. Cada tela, botão, formulário, fluxo, permissão, estado de erro, estado vazio e estado de carregamento. Quando for social ou tempo real, testar com mais de um usuário. Testar também em mais de um idioma e em tamanhos de tela diferentes.
3. **Rodar a automação:** testes automatizados (unitários, de integração e ponta a ponta quando fizer sentido), verificação de tipos, linter e build de produção, sem erros nem avisos relevantes.
4. **Revisar o código:** reler tudo como um revisor externo, procurando segredos expostos, falta de validação ou de permissões, duplicação, componentes gigantes, tipagem fraca, tratamento de erros ausente, código morto, TODOs, botões sem função, dados fictícios, textos sem tradução e aparência genérica.
5. **Corrigir** tudo o que a revisão e os testes encontraram.
6. **Testar de novo**, incluindo as funcionalidades das etapas anteriores, para garantir que nada quebrou.
7. **Reavaliar contra o documento:** conferir os requisitos da etapa um a um e listar o que está completo e o que não está.
8. **Só então** dizer que está pronto.

**Relatório de verificação (obrigatório em toda entrega)**

- O que foi testado e como, com o resultado de cada teste e a saída real resumida dos comandos executados.
- Problemas encontrados e o que foi corrigido.
- O que **não** foi possível testar (ex.: qualidade de áudio com dispositivos reais, celular físico, navegadores específicos) e como eu devo testar.
- Nunca afirmar que algo funciona sem ter executado. O que não foi verificado deve ser marcado como "não verificado".
- Se algo falhar, dizer claramente. Não esconder, não simular e não maquiar resultados. Se não for possível executar o ambiente, avisar em vez de supor que funciona.

