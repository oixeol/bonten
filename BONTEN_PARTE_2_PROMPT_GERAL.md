# BONTEN — Parte 2: Competitivo (Times, Parties, Matchmaking e Integridade)

## 1. Visão geral do projeto

Desenvolva o **Bonten Competitive**, a Parte 2 do BONTEN: o módulo competitivo do ecossistema, com gerenciamento de times, parties, matchmaking, rankings, torneios, perfil competitivo e comunicação por voz integrada.

O objetivo é construir um sistema inspirado nas funcionalidades competitivas da FACEIT e da Gamers Club, mas com identidade, arquitetura e funcionalidades próprias, dentro do app BONTEN já existente.

Slogan do módulo: BUILD YOUR TEAM. COMPETE TOGETHER. (O slogan geral do BONTEN continua sendo CONNECT. PLAY. EVOLVE.)

IMPORTANTE: o sistema não deve ser baseado em comunidades ou Clubs. O conceito central são **TIMES (TEAMS)**.

O usuário deve poder:

- Criar seu próprio time.
- Procurar e entrar em um time existente.
- Jogar representando um time.
- Jogar individualmente.
- Jogar com amigos sem precisar pertencer a um time.
- Participar de matchmaking e campeonatos.

O sistema deve ser modular, escalável, profissional e preparado para suportar diferentes jogos competitivos.

O diferencial central é integrar gestão de times, matchmaking, competição e comunicação por voz em um único ecossistema.

### 1.1 Relação com a Parte 1

A Parte 1 do BONTEN (a plataforma base, com comunidades, voz, perfis, amizades e demais funcionalidades já construídas) continua valendo e não deve ser alterada nem reescrita. A Parte 2 é separada em escopo, com seu próprio prompt geral (este arquivo) e seu próprio guia de fases (**BONTEN_PARTE_2_GUIA_DE_FASES.md**), e corresponde ao desenvolvimento aprofundado do que a Parte 1 deixou para versões futuras (matchmaking competitivo avançado, torneios e gestão de equipes).

## 2. Integração com a Parte 1 e com o app existente

NÃO crie um novo app, projeto ou repositório. O Bonten Competitive é construído DENTRO do app BONTEN já existente.

- Antes de qualquer código, analise a base atual: estrutura de pastas, rotas, componentes, tema, autenticação, banco, serviços e voz (LiveKit).
- Reaproveite o que já existe: login e usuários, amigos, presença, notificações, design system, componentes e a voz atual. Não duplique nada.
- Adicione o módulo como nova área na navegação existente, seguindo os padrões e o estilo visual atuais.
- Estenda o banco atual com migrations novas, sem apagar ou quebrar tabelas existentes. Se `users` já existir, reutilize.
- Não quebre nenhuma funcionalidade atual. Teste a regressão do que já funcionava.
- Se encontrar conflito entre este prompt e a base existente, pare e me pergunte antes de decidir.

### 2.1 O que a Parte 2 herda da Parte 1

Continuam valendo, sem precisar ser repetidos aqui, os seguintes pontos do prompt geral da Parte 1:

- Seção 2: identidade visual, paleta e diretrizes (visual sutil e profissional, nunca exageradamente gamer).
- Seção 6.7: Docker obrigatório em desenvolvimento e produção.
- Seção 6.8: idioma e internacionalização (o app se adapta ao idioma do Windows, sem texto fixo no código).
- Seção 10 e 10.1: segurança, proteção de chaves e criptografia (nenhuma chave secreta exposta no frontend).
- Seção 10.2: denúncias avaliadas por IA, que a Parte 2 reaproveita e estende.
- Seção 11 e 11.1: qualidade de design e a regra de não ter aparência de "vibecode".
- Seção 4.3.1: uso normal do app durante chamadas de voz.
- Seção 16: regras de execução, confirmação por etapas e verificação obrigatória.

Se houver conflito entre a Parte 2 e a Parte 1, pare e pergunte antes de decidir.

## 3. Identidade visual e experiência do usuário

- Siga o design system atual do BONTEN (Parte 1, seção 2): tema escuro, preto como base, laranja como destaque.
- Minimalista e sutil, nada exageradamente gamer. Animações suaves, componentes consistentes, responsivo (desktop e mobile).
- Evite aparência de template genérico ou dashboard administrativo convencional.
- O usuário deve identificar facilmente três possibilidades: **jogar sozinho, jogar com amigos e jogar representando um time**. A navegação deve deixar essas opções claras.
- Não misturar a gestão permanente dos times com a gestão temporária das Parties.
- Priorizar simplicidade, velocidade e clareza.

## 4. Navegação

### 4.1 Topbar

- A topbar do app deve ter as abas **Competitivo** e **Times**.
- Se já existir uma aba, item de menu ou rota semelhante (por exemplo "Comunidades", "Clubs", "Servidores de times", "Esports" ou "Ranking"), NÃO crie outra: renomeie e adapte a existente para **Competitivo** ou **Times**, conforme o caso, ajustando rota, ícone, textos e permissões.
- Antes de alterar, liste o que encontrou e o que vai renomear, remover ou manter, e aguarde minha confirmação. Não apague funcionalidade existente que não tenha equivalente nas novas abas: me pergunte onde ela deve ficar.
- **Competitivo:** Dashboard competitivo, Matchmaking, Parties, Ranking, Torneios, Histórico de partidas e Perfil competitivo.
- **Times:** meus times, criar time, procurar times, LFT/LFP, convites, solicitações, escalações e gestão do time.
- Notificações e Configurações do módulo usam as já existentes no app, com seções próprias quando necessário.
- Respeite o estilo atual da topbar e mantenha o comportamento responsivo no mobile.

### 4.2 Áreas do módulo

Dashboard, Times, Matchmaking, Parties, Ranking, Torneios, Perfil competitivo, Histórico de partidas, Notificações e Configurações, distribuídas entre as abas **Competitivo** e **Times** da topbar (ver seção 4.1).

## 5. Modelo de domínio e jogos suportados

### 5.1 Modelo de domínio

- **Time:** organização competitiva permanente.
- **Party:** grupo temporário de amigos, sem vínculo com time e sem alterar elenco.
- Três formas de jogar, sempre claras na navegação: solo, com amigos (Party), representando um time.
- Ranking individual e ranking de times são independentes (Elo individual ≠ Elo coletivo), por jogo, modalidade, temporada e região.

### 5.2 Jogos suportados

- O módulo é modular por jogo: cada jogo é um registro em `games` com suas regras (formato, tamanho de equipe, modalidades, sistema de pontuação), sem código fixo para um jogo específico.
- Jogos iniciais: **League of Legends, Valorant, CS2 e TFT (Teamfight Tactics)**. Todos devem ser incluídos desde o início.
- O TFT NÃO é time contra time. Cada partida tem 8 jogadores em formato todos contra todos, com resultado por colocação (1º a 8º). Adapte a lógica a isso:
  - Modalidades: Solo e Double Up (duplas, 4 duplas por partida).
  - Resultado registrado por colocação, não por vitória ou derrota. Estatísticas: colocação média, top 4, vitórias (1º lugar), distribuição de colocações.
  - Rating por colocação (pontos ganhos ou perdidos conforme a posição), separado do Elo de jogos de time contra time. A interface de rating deve aceitar os dois modelos.
  - Matchmaking com lobbies de 8 jogadores (ou 4 duplas), balanceados por nível. Party como dupla no Double Up.
  - Times no TFT: usados para identidade, ranking coletivo (soma ou média dos membros), torneios e scrims, não como fila de partida.
  - Torneios de TFT: formato por pontos acumulados em várias rodadas, com corte, e não apenas chave eliminatória.
- Verificação de resultados via API oficial da Riot Games (conta vinculada, partida e colocação). Depende de chave de API da Riot: crie a interface de integração, marque o que depende de credencial e nunca exponha a chave no frontend.
- Estruture o sistema de modo que a adição de novos jogos seja configuração, não refatoração.

## 6. Sistema de times

### 6.1 Times

- **Campos:** nome, tag, logo, banner, jogo principal, descrição, região, idioma, modalidade, recrutamento aberto/fechado.
- **Cargos:**
  - Proprietário: controle total, transferência de propriedade, gerenciamento de cargos, exclusão.
  - Capitão: escalações, organizar partidas, convidar jogadores, atividades competitivas.
  - Administrador: gerenciar membros, moderar, organizar atividades.
  - Jogador: participar de partidas e competições, ver estatísticas.
  - Reserva: permanece no elenco e pode ser convocado.
- Permissões por cargo, sempre validadas no backend.
- **Recrutamento:** LFT, LFP, vagas, solicitações de entrada, convites, tryouts, histórico de transferências, filtros por jogo, região, nível e vagas.
- Histórico de integrantes, escalações, estatísticas coletivas, partidas e torneios.

### 6.2 Criar e entrar em um time

Tela inicial da aba **Times** para quem ainda não tem time (ou não tem time no jogo selecionado). Referência visual: imagem anexada pelo usuário (título "Comece agora" com dois cartões grandes lado a lado). Use como inspiração, com identidade própria do Bonten, sem copiar assets ou textos.

**Tela inicial:**

- Título e subtítulo curtos, e dois cartões grandes com ícone laranja, título e descrição: **Criar um time** ("Comece um time do zero") e **Entrar em um time** ("Tem um código para entrar?").
- Abaixo, um link discreto para **Procurar times** (lista de times com recrutamento aberto, filtros e LFT/LFP).
- Quem já tem time vai direto para a página de gerenciamento do time, com acesso a criar outro quando as regras permitirem.

**Criar um time (fluxo em etapas, com validação em cada uma):**
1. Identidade: nome, tag, logo e banner (upload com validação de tipo, tamanho e conteúdo).
2. Competitivo: jogo principal, modalidade, região e idioma.
3. Detalhes: descrição e recrutamento aberto ou fechado.
4. Revisão e criação. O criador vira **Proprietário** automaticamente, e o código de convite do time é gerado.
- Nome e tag únicos (verificação em tempo real), com regras de formato e filtro de termos ofensivos.
- Elegibilidade validada no backend: conta verificada, conta do jogo vinculada quando exigido, limite de times criados por usuário e cooldown contra criação em massa.

**Entrar em um time (três caminhos):**

- **Por código:** campo para digitar o código de convite. Mostra uma prévia do time (logo, nome, jogo, quantidade de membros) antes de confirmar. Trate: código inválido, expirado, esgotado, desativado ou time cheio, com mensagem clara.
- **Por link de convite** do time ou convite direto de um capitão/administrador (notificação com aceitar/recusar).
- **Por solicitação:** em times com recrutamento aberto, enviar pedido com mensagem. Capitão ou administrador aprovam ou recusam, e o jogador é notificado.

**Regras:**

- Defina e me confirme a regra de quantos times ativos um jogador pode ter (sugestão: um time ativo por jogo, para evitar conflito de escalação), e o cooldown ao trocar de time.
- Limite de convites e de solicitações pendentes por usuário, e rate limit nas tentativas de código para impedir adivinhação.
- Toda entrada, saída e criação registrada em histórico de transferências e auditoria.
- Estados de carregamento, erro e vazio. Responsivo: no mobile, os cartões ficam empilhados.

### 6.3 Página de gerenciamento do time

Página própria do time, dentro da aba **Times**. Referência visual: imagem anexada pelo usuário (lista de membros à esquerda e painel do time à direita). Use como inspiração de organização, com identidade própria do Bonten, sem copiar assets, logos ou textos da referência.

**Lista de membros (coluna principal):**

- Uma linha por integrante: avatar, nome, cargo (Proprietário, Capitão, Administrador, Jogador, Reserva) e indicador de presença ("online", "visto por último há 2 horas", "visto por último ontem"), com dados reais de presença (Redis).
- Ações por linha, exibidas conforme a permissão de quem está vendo: tornar capitão, alterar cargo, mover entre titular e reserva, remover do time e ver perfil (abre a página de perfil). Ações perigosas pedem confirmação.
- Cor de identificação por jogador, opcional, usada para diferenciá-lo na escalação e nas estatísticas do time.
- Ordenação e filtros: cargo, titulares/reservas, online.
- Seções adicionais: solicitações de entrada, convites enviados, escalações e histórico de integrantes.

**Painel lateral do time:**

- Logo, banner, nome, tag, site ou link do time (quando houver) e jogo principal.
- **Código de convite** do time com botão de copiar, e link de convite. O código pode ser regenerado e desativado, com limite de uso e de expiração, para evitar abuso.
- **Editar time** (abre a edição dos campos do time).
- **Entrar na sala de voz do time** (leva ao canal de voz do time).
- **Copiar IP/servidor do time**, apenas quando o jogo tiver servidor privado configurado. Se não houver, esconda o botão. Marque como dependência externa quando faltar integração.
- **Sair do time** e **Excluir time**, em estilo de perigo, no rodapé do painel.

**Regras:**

- Todas as ações validadas no backend por cargo. Proprietário não pode sair sem transferir a propriedade antes. Excluir o time exige confirmação forte (digitar o nome) e só o Proprietário pode fazer.
- Toda mudança de cargo, remoção, saída e transferência registrada em histórico e log de auditoria, com notificação aos envolvidos.
- Limites contra abuso: cooldown em transferências e saídas, rate limit em convites e no código.
- Estados de carregamento, erro e vazio. Responsivo: no mobile, o painel do time vai para o topo e as ações da linha viram um menu.

## 7. Parties, lobbies e convites

### 7.1 Parties

- Criar, convidar amigos, remover participantes, definir líder, entrar e sair, voz, ver jogadores disponíveis, entrar em filas.
- Jogador de time pode criar Party com jogadores de outros times ou sem time. A Party nunca modifica a composição de um time.

### 7.2 Status dos amigos (lobby ou partida)

Mostrar, em tempo real, o que cada amigo está fazendo no módulo competitivo. Reaproveite a lista de amigos e a presença já existentes no app, estendendo-as com os estados abaixo, sem criar outra lista.

**Estados:**

- **Offline.**
- **Online** (no app, fora do competitivo).
- **No lobby** (jogo, e se está sozinho ou em Party com quantos membros).
- **Em fila** (jogo e modo, com tempo de espera).
- **Em partida** (jogo, modo e tempo decorrido; mapa quando existir).
- **Em Party** (ocupação, ex.: 3/5).

**Onde aparece:** lista de amigos e barra lateral, painel de Party e lobby ("amigos disponíveis"), perfil competitivo e página do time (presença dos membros, reaproveitando os mesmos estados).

**Ações conforme o estado:**

- Amigo em lobby **aberto** com vaga: botão **Entrar no lobby**, direto na linha do amigo e também no menu de botão direito, sem pedir aprovação.
- Amigo em lobby **fechado**: botão **Pedir para entrar** (o líder aprova ou recusa). Se o amigo for o líder, ele recebe a solicitação em tempo real.
- Amigo sozinho no lobby, sem Party cheia: **Convidar** para a minha Party, ou entrar na dele conforme o tipo do lobby dele.
- Se eu já estiver em uma Party, o botão pede confirmação para sair da atual antes de entrar.
- Em fila ou em partida: sem convite. Opção de **avisar quando estiver livre** (notificação quando voltar ao lobby).
- Indicadores visuais claros por cor e ícone, e acessíveis por texto (não depender só de cor).

**Privacidade e justiça competitiva:**

- Cada jogador escolhe quem vê seu status: todos os amigos, só alguns grupos, ou aparecer como offline.
- Opção de ocultar os detalhes da partida (mostrar só "em partida", sem mapa, tempo ou modo), para evitar stream sniping em partidas competitivas.
- Nunca expor placar ou informações táticas da partida em andamento aos amigos.

**Técnico:**

- Presença no Redis com expiração (heartbeat), atualizada via WebSocket pelos serviços de lobby, fila e partida. A fonte do estado é o servidor, nunca o cliente.
- Tratar quedas de conexão (estado volta a offline após o timeout), múltiplos dispositivos e transições rápidas sem piscar na interface.
- Escala: enviar atualizações apenas aos amigos conectados, em lote, sem consultas por amigo em loop.
- Estados de carregamento, erro e vazio. Responsivo.

### 7.3 Lobby aberto e lobby fechado

Todo lobby (Party) tem um tipo, definido pelo líder e alterável a qualquer momento antes de entrar na fila:

- **Lobby fechado (padrão):** só entra quem for convidado pelo líder. Quem não foi convidado pode enviar **Pedir para entrar**, que o líder aprova ou recusa.
- **Lobby aberto:** qualquer jogador elegível pode entrar sozinho, sem convite e sem aprovação, desde que haja vaga.

**Como entrar em um lobby aberto:**

- Clicar com o **botão direito** no usuário (no mobile, toque longo) e escolher **Entrar no lobby**. O menu de contexto funciona em todo lugar onde o usuário aparece: lista de amigos, lista de jogadores disponíveis, lobby, página do time, ranking, chat e perfil.
- O menu mostra a ação conforme o estado: **Entrar no lobby** (aberto com vaga), **Pedir para entrar** (fechado), **Convidar para minha Party**, **Ver perfil**, e some ou desabilita com a razão (lobby cheio, em fila, em partida, bloqueado, fora da faixa de rating).
- **Pela lista de amigos:** a entrada também funciona direto na lista de amigos (e na barra lateral), com um botão visível na linha do amigo, sem depender do botão direito. O botão segue as mesmas regras: **Entrar no lobby** se o lobby do amigo estiver aberto, **Pedir para entrar** se estiver fechado, desabilitado com a razão quando não for possível.
- O lobby exibe um indicador claro do tipo (aberto ou fechado) para o líder e para quem o vê, inclusive na linha do amigo na lista (ex.: ícone de cadeado aberto ou fechado e a ocupação, como 3/5).

**Regras de entrada (validadas no backend):**

- Vaga disponível e respeito ao tamanho de Party permitido (nos jogos 5v5, entrar não pode levar a Party a 4 jogadores na fila competitiva, avisar antes de confirmar).
- Diferença máxima de rating, mesmo jogo, conta do jogo vinculada quando exigida, sem penalidade ativa e sem bloqueio entre as partes.
- Impedir entrada enquanto a Party estiver em fila, em confirmação de partida ou em partida. Entradas simultâneas pela mesma vaga: o backend decide, sem condição de corrida.
- Quem já está em outra Party precisa sair dela antes (confirmar a troca).
- Ao entrar alguém, o estado de "pronto" de todos é reiniciado, o novo membro entra no canal de voz da Party e todos veem a atualização em tempo real.

**Poderes do líder e proteção:**

- Alternar aberto/fechado, remover membro e banir jogador do lobby (ele não consegue voltar àquele lobby).
- Pode transferir a liderança. Se o líder sair, a liderança é transferida automaticamente.
- Limite de tentativas de entrada por minuto por usuário e cooldown após ser removido, contra spam e assédio. Denunciar e bloquear disponíveis direto no menu de contexto.
- Entradas, remoções e bans registrados no histórico e na auditoria, e visíveis ao serviço Integrity (grupos que entram e saem repetidamente, combinações suspeitas de contas).

**Privacidade:**

- Lobbies abertos são visíveis a quem pode ver o status do líder, conforme a privacidade dele. Quem aparecer como offline ou oculto não pode ser alvo de "Entrar no lobby".
- Respeitar a configuração do jogador: o lobby aberto não expõe detalhes de partidas em andamento.

**UX:** toast de confirmação, estados de carregamento, erro e vazio, e mensagens claras quando a entrada for negada. Responsivo, com toque longo no mobile e menu como painel deslizante.

### 7.4 Convites internos para Party (jogadores no lobby)

Sistema para o líder de uma Party chamar jogadores que estão **online e no lobby do mesmo jogo**, mesmo sem serem amigos.

**Jogadores disponíveis:**

- Lista em tempo real (WebSocket e presença no Redis) dos jogadores que estão no lobby do mesmo jogo, sem Party cheia e abertos a convites. Não mostrar quem está em partida, offline, em fila ou com convites desativados.
- Cada item mostra avatar, nome, rating no jogo, região, idioma, função/posição quando houver, microfone ativo e botão **Convidar** (abre o perfil competitivo em página ao clicar no nome).
- Filtros: faixa de rating compatível, região, idioma, função, com microfone, amigos primeiro.
- Ordenar por compatibilidade (rating próximo e mesma região).
- Aparece no próprio lobby e no slot vazio "+ Convidar".

**Fluxo do convite:**

- Convidar → notificação em tempo real para o jogador (aceitar ou recusar) → ao aceitar, entra na Party e no canal de voz dela → os demais veem a atualização no lobby.
- Convite com expiração (ex.: 60 segundos), cancelamento pelo remetente e estados: pendente, aceito, recusado, expirado, cancelado.
- Trate: Party que lotou, jogador que entrou em fila ou partida enquanto o convite estava pendente, jogador que saiu do lobby, líder que saiu, convite duplicado e disputas simultâneas pela mesma vaga (o backend decide, sem condição de corrida).
- Respeitar as regras de tamanho de Party: se aceitar levar a Party a um tamanho bloqueado (ex.: 4 em 5v5), avisar o líder antes de convidar e impedir a fila.
- Respeitar a diferença máxima de rating permitida na Party e a elegibilidade (penalidade ativa, conta do jogo vinculada).

**Quem pode ser convidado (privacidade):**

- Cada jogador escolhe: aceitar convites de todos, só de amigos e membros do time, ou ninguém. Também pode ativar o status **"Procurando Party"** para aparecer na lista.
- Não revelar presença de quem desativou. Jogadores bloqueados nunca aparecem nem recebem convites uns dos outros.

**Anti-abuso:**

- Limite de convites por minuto e de convites pendentes por usuário, com cooldown depois de várias recusas ao mesmo jogador.
- Opção de denunciar spam ou assédio direto na notificação do convite, e de bloquear o remetente.
- Registrar convites no histórico e na auditoria, ligados ao sistema de denúncias e ao serviço Integrity (convites em massa e combinações suspeitas de contas).

**Notificações e UX:**

- Notificação interna em tempo real (toast no lobby e item na central de Notificações) com aceitar e recusar sem sair da tela.
- Indicadores de quem está falando e de quem está pronto ao entrar.
- Estados de carregamento, erro e vazio ("Ninguém disponível agora"). Responsivo: no mobile, a lista vira painel deslizante.

## 8. Competição e matchmaking

### 8.1 Modos de competição

- **Por times:** fila exclusiva, partidas equilibradas, Elo coletivo, estatísticas por escalação, campeonatos, temporadas.
- **Individual e em grupo:** solo, com amigos, Parties, encontrar jogadores, filas competitivas.

### 8.2 Matchmaking (lógica real)

- **Filas:** individual, Party e time.
- **Critérios:** jogo, modalidade, região, nível, latência, tempo de espera, balanceamento de equipes.
- **Fluxo:** fila → partida encontrada → confirmação → lobby → partida → resultado.
- Cancelamento, penalidade por abandono e histórico.
- Elo inicialmente, com interface que permita migrar para Glicko-2.
- Defina a máquina de estados da fila e da partida ANTES de implementar. Trate: timeout de confirmação, desconexão, empate, resultado contestado.

### 8.3 Lobby de partidas (pré-fila)

Tela de lobby onde a Party (ou o jogador solo, ou o time) se prepara antes de entrar na fila. Referência visual: imagem anexada pelo usuário (lobby com cards de jogadores, abas de modo, seleção de mapas e botão grande de jogar). Use como inspiração de organização, com identidade própria do Bonten, sem copiar assets, logos ou textos da referência.

**Estrutura:**

- **Faixa de jogadores no topo:** um card por vaga (5 no CS2, conforme o jogo e o modo). Cada card mostra avatar com anel, nome, país e rating do jogador naquele jogo. O líder da Party fica em destaque (card maior ou central, com marca de líder). Vagas vazias mostram "+ Convidar" e abrem a lista de amigos disponíveis.
- **Estado por jogador:** online, em voz, pronto ou não pronto, de forma visível no card. Menu no card: ver perfil (abre a página de perfil), silenciar, promover a líder, remover (somente líder).
- **Abas de modo** logo abaixo, conforme o jogo selecionado (exemplo no CS2: 5v5 ranqueado, 5v5 não ranqueado, 2v2). As abas vêm da configuração do jogo em `games`, não fixas no código. Modos indisponíveis ao grupo atual (tamanho incompatível, elegibilidade) ficam desabilitados com a razão explicada.
- **Seleção de mapas** (quando o jogo tiver mapas): lista com miniaturas, múltipla escolha ou veto conforme as regras do modo, definida pelo líder. Para jogos sem mapa (LoL, TFT), essa área é substituída pelas opções cabíveis (fila, modalidade).
- **Botão principal grande (laranja), "Jogar":** só o líder inicia a busca. Habilitado apenas quando todos estão prontos e o grupo é válido. Durante a busca vira "Cancelar", com tempo de espera e estimativa.
- **Rodapé discreto:** região/servidor, latência e versão.
- **Voz integrada:** o canal de voz da Party ativo no próprio lobby (microfone, silenciar, indicador de quem está falando).
- **Seletor de contexto:** jogar solo, com amigos (Party) ou representando um time. Ao representar um time, mostrar a escalação válida e quem está convocado.

**Fluxo e estados (tempo real via WebSocket):**

- Lobby aberto → jogadores prontos → busca na fila → partida encontrada (popup de confirmação com contagem regressiva para todos) → todos aceitam → sala da partida (mapas/vetos, equipes, voz da partida) → partida em andamento → resultado.
- Tratar: recusa ou timeout da confirmação (volta o grupo aceito para a fila e penaliza quem recusou), saída de jogador durante a busca, líder saindo (transfere liderança), queda de conexão e reconexão ao lobby.
- Regras de elegibilidade validadas no backend: tamanho de Party permitido pelo jogo e modo (nos jogos 5v5, Party de 4 é bloqueada na fila competitiva, com a mensagem explicativa e o botão Jogar desabilitado), diferença máxima de rating dentro da Party, jogador banido ou com penalidade ativa não entra na fila, conta do jogo vinculada quando exigida.
- Estados de carregamento, erro e vazio em todos os blocos. Responsivo: no mobile, os cards viram carrossel ou lista compacta.

## 9. Ranking, torneios e perfil competitivo

### 9.1 Ranking

- Rankings: individual, de times, por jogo, por modalidade, por temporada, regional.
- Cada perfil mostra: Elo atual, nível, vitórias, derrotas, taxa de vitória, histórico e evolução de desempenho.

### 9.2 Torneios

Criação, inscrição e aprovação de times, chaves eliminatórias, grupos, MD1/MD3/MD5, agendamento, registro de resultados, classificação, premiações e histórico.

### 9.3 Perfil competitivo

**Formato:** o perfil é uma PÁGINA própria com rota dedicada (ex.: `/competitivo/perfil/[usuario]`), compartilhável por link, e NÃO um modal. Se já existir um perfil em modal, converta para página. Clicar em um jogador (ranking, time, party, partida) leva a essa página. Responsiva, com carregamento e estados vazios tratados.

**Layout inspirado no op.gg:** a página segue a organização e a densidade de informação do op.gg, com identidade visual própria do Bonten (preto e laranja, sem copiar logos, ícones, textos, assets ou código do op.gg). Estrutura:

- **Topo do perfil:** avatar, nome, status, times e botão de ação (convidar, adicionar amigo, ver time), com abas por jogo logo abaixo.
- **Coluna lateral (resumo do jogo selecionado):** Elo/rank atual com emblema, pontos, vitórias, derrotas, taxa de vitória e histórico de ranks por temporada.
- **Coluna principal, com sub-abas:**
  - **Resumo:** lista das partidas recentes com resultado (vitória/derrota, ou colocação no TFT) em destaque por cor, modo, duração, data, e desempenho resumido (KDA, personagem, arma ou composição usada). Cada partida expande para ver o detalhe completo e os jogadores dos dois lados.
  - **Personagens/Armas/Composições:** tabela ordenável dos mais jogados, com partidas, taxa de vitória, KDA ou colocação média, e barras de proporção.
  - **Partidas:** histórico completo, paginado, com filtros (modo, período, resultado, personagem).
  - **Estatísticas:** gráficos de evolução do Elo, distribuição de resultados e desempenho por período.
- **Bloco de resumo das últimas 20 partidas** (vitórias e derrotas, KDA médio, personagens mais usados) no topo da aba Resumo.
- **Aba/seção de times:** times atuais e passados, com período em cada um.
- Tudo calculado apenas com partidas do Bonten, sem dados fictícios. Estados de carregamento em skeleton e estados vazios claros.
- O perfil deve carregar rápido: pagine e use cache (Redis) para estatísticas agregadas, atualizadas ao fim de cada partida.

**Cabeçalho:** avatar, nome de usuário, status "procurando time", times atuais e anteriores, jogos vinculados e posição nos rankings.

**Abas ou seções por jogo** (LoL, Valorant, CS2, TFT, etc.), mostrando apenas os jogos vinculados:

- Elo ou rating atual, nível, vitórias, derrotas, taxa de vitória e evolução.
- **Histórico de partidas** do jogo, paginado e filtrável, com resultado, data, modo e desempenho.
- **LoL:** campeões mais jogados (partidas, taxa de vitória e KDA por campeão).
- **Valorant:** agentes mais jogados (partidas e taxa de vitória) e **arma mais utilizada** (abates, precisão e headshot).
- **CS2:** **arma mais utilizada** (abates, precisão e headshot). A Steam é usada para vincular a conta do jogador. Como só contam partidas do Bonten, verifique como obter os dados POR PARTIDA do CS2 antes de implementar: a Steam Web API entrega principalmente estatísticas acumuladas, que NÃO devem ser usadas. Proponha e documente a forma de coleta por partida (por exemplo, servidor dedicado do Bonten com plugin que envia os eventos da partida ao backend, ou análise de demos) e me apresente antes de implementar. Enquanto não houver coleta, marque como dependência externa e mostre estado vazio explicativo, sem inventar dados.
- **TFT:** **composição mais utilizada** (partidas, colocação média e top 4 por composição), além de colocação média e distribuição de colocações.

**Gráficos:**

- Evolução de Elo/rating ao longo do tempo (linha), por jogo e por período (7 dias, 30 dias, temporada).
- Gráficos de barras ou pizza para campeões, agentes, armas e composições mais usados.
- Para TFT, distribuição de colocações (1º ao 8º).
- Use uma biblioteca de gráficos leve que combine com o tema escuro e laranja, com tooltips e responsivo.

**Fonte dos dados:** SOMENTE partidas realizadas dentro do Bonten entram nas estatísticas, rankings, histórico e gráficos. NÃO importe o histórico geral nem estatísticas acumuladas do jogador de fora da plataforma. As APIs dos jogos (Riot para LoL, Valorant e TFT; Steam para CS2, com chaves guardadas apenas no backend) servem apenas para vincular a conta do jogador e para buscar os detalhes de cada partida criada pelo Bonten, identificada pelo ID da partida ou lobby registrado na plataforma. Cada estatística (campeão, agente, arma, composição) deve ser ligada a uma linha de `matches`/`match_players` do Bonten, para ser auditável. Nada de dados fictícios. Onde a API não fornecer o dado ou faltar credencial, crie a interface de integração, marque a dependência e mostre um estado vazio explicativo.

**Também no perfil:** medalhas e conquistas, e privacidade (o jogador escolhe o que fica público).

## 10. Integração com voz

- Usar o LiveKit já integrado ao app.
- Canal de voz da Party, do time e da partida, salas temporárias, controle de microfone, silenciar jogadores, permissões.
- Experiência integrada, sem exigir outro aplicativo.
- Valem as regras da Parte 1, seção 4.3.1: o usuário usa o app normalmente durante a chamada, e trocar de aba, página, lobby ou partida não derruba a voz.

## 11. Tecnologias e arquitetura

### 11.1 Stack (uma responsabilidade por serviço, sem duplicar funcionalidade entre linguagens)

- **Frontend:** Next.js, React, TypeScript.
- **Backend principal:** NestJS (APIs, autenticação, regras de negócio).
- **Rust:** matchmaking, filas e alta concorrência.
- **Python (FastAPI):** estatísticas e detecção de padrões suspeitos.
- **Go:** infraestrutura, apenas quando necessário.
- **PostgreSQL** (FKs, índices, constraints), **Redis** (filas, cache, presença), **WebSocket** (tempo real).
- **Docker** em desenvolvimento e produção.
- Se a base atual já usar algo diferente em algum ponto, siga a base e me avise.

### 11.2 Banco de dados

Tabelas necessárias (reaproveite as existentes): users, games, player_profiles, player_ratings, teams, team_members, team_invites, team_applications, team_rosters, parties, party_members, matchmaking_queues, matches, match_players, match_results, team_ratings, tournaments, tournament_teams, seasons, reports, notifications.

Times e parties são entidades independentes. Migrations versionadas, chaves estrangeiras, índices, validações e regras de integridade.

## 12. Segurança e integridade competitiva

### 12.1 Segurança

- Autenticação segura e permissões por cargo.
- Proteção contra manipulação de Elo e resultados falsos, validação de resultados.
- Proteção contra partidas abandonadas.
- Histórico de alterações e logs de auditoria.
- Limite de convites e transferências.
- Nenhuma chave secreta exposta no frontend (apenas chaves públicas).

### 12.2 Anti-cheat

Arquitetura em camadas, com responsabilidades separadas:

- **Servidor como fonte da verdade:** o cliente nunca define resultado, Elo ou estatística.
- **Validação de resultados:** confirmação entre as partes, tratamento de divergência e disputa com revisão.
- **Python:** análise estatística e detecção de padrões suspeitos (desempenho anômalo, variação brusca de Elo, perda proposital, combinação de resultados entre as mesmas contas).
- **Antifraude de contas:** múltiplas contas, smurfs, boosting e conluio, usando vínculo com contas dos jogos, dispositivo e padrões de uso.
- **APIs dos jogos:** dados oficiais da partida, quando disponível.
- **Cliente anti-cheat (kernel):** fora do escopo agora. Deixe uma interface de integração definida e marque o que depende de terceiros.
- **Pontuação de risco** por jogador, com ações graduais: alerta, revisão manual, restrição de fila, suspensão, banimento.
- **Denúncias** dentro das partidas, avaliadas por IA, com revisão humana nos casos graves.
- **Painel de moderação,** trilha de auditoria e processo de contestação.
- **Reversão** de Elo e de resultados quando a fraude for confirmada.
- Não banir automaticamente só pelo score da IA. O banimento exige confirmação.

### 12.3 Bonten Competitive Integrity — regras de integridade competitiva

Esta seção complementa a seção 12.2 (Anti-cheat). Consolide as duas sem duplicar funcionalidade; em caso de conflito, prevalece esta.

#### 12.3.1 Regras de tamanho das Parties

Para o matchmaking competitivo de jogos com formato 5v5, permitir exclusivamente Parties de **1, 2, 3 ou 5 jogadores**.

- Parties de **4 jogadores** são bloqueadas na fila competitiva, com mensagem clara explicando que o formato não permite grupos de quatro jogadores.
- Nunca dividir automaticamente uma Party entre equipes diferentes.
- O matchmaking combina grupos e jogadores individuais para completar duas equipes de cinco.
- Validação obrigatória no frontend (UX) e no backend (autoridade), e também na entrada da fila do serviço de matchmaking (Rust).
- Os tamanhos permitidos de Party são configuração por jogo e modalidade em `games`, não código fixo. A regra acima vale para os jogos 5v5. Outros jogos (LoL, TFT etc.) seguem a configuração própria que você definir e me mostrar.
- A Party de 4 continua permitida em Custom Match, onde não há Elo competitivo.

#### 12.3.2 Serviço independente: Bonten Competitive Integrity

Crie um serviço próprio, separado do backend principal, com estas responsabilidades:

- Monitoramento de partidas.
- Detecção de win trading, boosting, smurfs e farming de Elo.
- Monitoramento de contas suspeitas.
- Validação de resultados.
- Auditoria de alterações de rating.
Implementação em Python (FastAPI), consumindo eventos do backend e do matchmaking, conforme a divisão de responsabilidades da stack. Ele não altera rating diretamente: gera alertas e propostas que passam pelo fluxo de validação.

#### 12.3.3 Proteção do Elo

- Usar histórico de partidas e registrar toda variação de rating.
- Identificar padrões anormais.
- Evitar ganhos artificiais por adversários recorrentes (limite e desconto por confrontos repetidos entre as mesmas contas).
- Avaliar a incerteza do rating (preparar para Glicko-2: rating deviation).
- Aplicar reversões somente após validação.
- Manter logs imutáveis das alterações (append-only, sem update ou delete, com identificador da partida e da regra aplicada).
- Não usar K/D ou pontuação individual como único critério para alterar o rating de partidas por equipe.

#### 12.3.4 Proteção dos times

- Registrar o elenco oficial, titulares e reservas.
- Manter histórico de transferências e registrar alterações de propriedade e cargos.
- Controlar períodos de elegibilidade (ex.: bloqueio de troca de time durante torneio ou após transferência).
- Validar escalações antes das partidas.
- Impedir jogadores suspensos de participar.

#### 12.3.5 Sistema antifraude

- Indicadores de risco com níveis **baixo, moderado e alto**, por conta e por time, sempre explicáveis (quais sinais geraram o nível).
- Os indicadores geram alertas para revisão.
- **Não aplicar banimento permanente exclusivamente por decisão automatizada.**
- Fluxo completo: denúncia, investigação, revisão humana e recurso de punições.

#### 12.3.6 Penalidades progressivas

Advertência → perda de rating → anulação de resultados irregulares → restrição temporária de matchmaking → suspensão competitiva → banimento em casos graves comprovados. Cada penalidade tem motivo, duração, responsável e possibilidade de recurso.

#### 12.3.7 Modalidades de partida

- **SOLO/PARTY:** jogar sozinho ou com amigos, em Parties de 1, 2, 3 ou 5 integrantes (nos jogos 5v5).
- **TEAM QUEUE:** partidas oficiais entre times, escalações de cinco jogadores e ranking coletivo independente.
- **CUSTOM MATCH:** partidas privadas, sem alteração de Elo competitivo e com configurações personalizadas.
Garanta que Custom Match nunca gere rating, estatística de ranking ou conquistas competitivas.

#### 12.3.8 Auditoria e transparência

Crie histórico de partidas, alterações de rating, penalidades, transferências, denúncias, revisões e recursos. Toda alteração competitiva deve ter justificativa e registro de auditoria. Disponibilize ao jogador, no perfil, o histórico das próprias penalidades, recursos e variações de rating, com a justificativa.

## 13. Roadmap de desenvolvimento

O desenvolvimento segue as fases abaixo, em ordem. Cada fase termina com validação e confirmação minha antes de avançar (seção 16). O guia de fases (**BONTEN_PARTE_2_GUIA_DE_FASES.md**) traz o prompt e o checklist de validação de cada uma.

### Fase 0 — Planejamento e análise da base (sem código)

- Analisar a base atual, propor a topbar, o banco de dados, a configuração por jogo e a arquitetura dos serviços, e listar as decisões pendentes para eu aprovar.

### Fase 1 — Fundação do módulo

- Abas Competitivo e Times na topbar, banco de dados (migrations), configuração dos jogos e esqueleto dos serviços (Rust e Python) no Docker.

### Fase 2 — Times

- Criar e entrar em times, gerenciamento, cargos e permissões, e recrutamento.

### Fase 3 — Parties, lobbies e voz

- Parties, lobby aberto e fechado, convites internos, status dos amigos e voz.

### Fase 4 — Matchmaking

- Serviço em Rust com Redis, lobby de partidas, regras de tamanho de Party e modalidades.

### Fase 5 — Ranking e perfil competitivo

- Rankings independentes e perfil em página, no estilo op.gg, com dados apenas de partidas do Bonten.

### Fase 6 — Torneios

- Criação, inscrições, chaves, grupos, resultados, classificação e temporadas.

### Fase 7 — Segurança, integridade e denúncias

- Serviço Competitive Integrity, anti-cheat, penalidades, denúncias e auditoria.

### Fase 8 — Dashboard, notificações e polimento

- Dashboard competitivo, notificações, configurações, polimento visual e revisão final.

## 14. Entregáveis

Apresentar:

1. Relatório de análise da base existente e plano de integração.
2. Arquitetura técnica do módulo e dos serviços (Rust, Python, Go).
3. Modelo do banco de dados e migrations.
4. Telas e componentes reutilizáveis (topbar, times, lobby, perfil, rankings, torneios).
5. APIs documentadas.
6. Serviço de matchmaking.
7. Serviço Competitive Integrity.
8. Integração de voz com Parties, times e partidas.
9. Testes automatizados das funcionalidades críticas.
10. Instruções de execução local e documentação de implantação.
11. Lista do que depende de credenciais ou APIs externas.

## 15. Regras obrigatórias de desenvolvimento

Componentes reutilizáveis, rotas organizadas, APIs estruturadas, banco funcional, autenticação, estados de loading e erro, validações, dados persistentes e módulos integrados entre si e com o restante do app.

- Não criar outro app e não quebrar a Parte 1.
- Não usar várias linguagens para implementar a mesma funcionalidade: cada serviço tem uma responsabilidade definida.
- Não simular matchmaking funcional com dados fictícios: implementar a lógica real de filas e gerenciamento de estados.
- Não entregar apenas telas estáticas, nem botões decorativos.
- Quando uma integração externa ainda não estiver disponível, criar uma interface de integração bem definida e identificar claramente o que depende de credenciais ou APIs externas.
- Criar testes automatizados para as funcionalidades críticas (permissões, regras de Party, filas, rating, antifraude).

## 16. Regras de execução e confirmação por etapas

### 16.1 Princípio geral

Faça direito, não rápido. Nada de código placeholder, telas estáticas, dados fictícios apresentados como reais ou botões sem função. Antes de cada etapa, diga o que vai fazer; depois, mostre o que foi feito e como testar. Se algo do documento for ambíguo ou tecnicamente inviável, pergunte antes de decidir sozinho.

### 16.2 Confirmação por fase

- Trabalhe em fases (seção 13), uma por vez.
- Ao terminar uma fase e depois de concluir a verificação obrigatória (seção 16.5), **pare** e apresente: o que foi feito, como rodar e ver, o que ainda não está conectado e as decisões que quer tomar comigo.
- **Não avance** para a próxima fase até eu responder explicitamente "confirmado" (ou pedir ajustes).
- Dentro de uma fase com várias telas, entregue e confirme **uma tela por vez**, conforme o guia de fases.
- Nunca junte duas fases na mesma entrega sem minha autorização.

### 16.3 n8n (somente se necessário)

Valem as regras da Parte 1, seção 16.2. Na Parte 2, o n8n só pode ser usado fora do caminho crítico (por exemplo, alertas a moderadores sobre denúncias graves ou rotinas agendadas), com justificativa. Nunca para matchmaking, rating, filas, voz ou qualquer decisão competitiva.

### 16.4 Formato das respostas

Seja objetivo: resumo do que foi feito, lista de arquivos criados e alterados, comandos para executar, o que testar, riscos e dúvidas. Sem enrolação e sem afirmar que algo funciona sem ter verificado.

### 16.5 Verificação obrigatória antes de dizer que está pronto

Nenhuma fase ou funcionalidade pode ser declarada pronta sem este processo, nesta ordem:

1. **Executar:** build limpo e ambiente no Docker (`docker compose up`), sem erros nos logs.
2. **Testar tudo:** todas as funcionalidades da fase, de ponta a ponta: cada tela, botão, formulário, fluxo, permissão e estado de erro, vazio e carregamento. Para tudo que é social ou em tempo real (parties, lobbies, convites, status, filas), testar com várias contas ao mesmo tempo, incluindo condições de corrida. Testar também em mais de um idioma e tamanho de tela.
3. **Rodar a automação:** testes automatizados, verificação de tipos, linter e build de produção, sem erros nem avisos relevantes.
4. **Revisar o código:** reler como um revisor externo, procurando segredos expostos, falta de validação ou permissões no backend, duplicação, tipagem fraca, tratamento de erros ausente, código morto, botões sem função, dados fictícios, textos sem tradução e aparência genérica.
5. **Corrigir** tudo o que a revisão e os testes encontraram.
6. **Testar de novo**, incluindo a Parte 1 e as fases anteriores, para garantir que nada quebrou (regressão).
7. **Reavaliar contra este documento:** conferir os requisitos da fase um a um e listar o que está completo e o que não está.
8. **Só então** dizer que está pronto.

**Relatório de verificação (obrigatório em toda entrega):** o que foi testado e como, com o resultado de cada teste; problemas encontrados e corrigidos; o que **não** foi possível testar e como devo testar. Nunca afirmar que algo funciona sem ter executado: o que não foi verificado deve ser marcado como "não verificado". Se algo falhar, dizer claramente, sem esconder nem maquiar resultados.

---

**BONTEN — BUILD YOUR TEAM. COMPETE TOGETHER.**
