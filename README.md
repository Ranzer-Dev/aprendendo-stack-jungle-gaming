# Aprendendo Stack Jungle Gaming 🎮⚡

> Prova de Conceito (POC) arquitetural de um motor de apostas em tempo real (*Crash Game*) desenvolvido com **NestJS**, **WebSockets**, **MikroORM**, **PostgreSQL**, **Domain-Driven Design (DDD)** e arquitetura orientada a eventos com **AWS SQS & SNS**, documentado integralmente com o **Modelo C4**.

---

## 🎯 Contexto de Negócio

No ecossistema de **iGaming**, dois requisitos não-funcionais são inegociáveis:
1. **Baixa Latência & Comunicação Bidirecional:** O multiplicador do jogo é transmitido em frações de segundo para milhares de clientes conectados. O protocolo HTTP tradicional (com polling contínuo) geraria sobrecarga inaceitável. A comunicação é operada via **WebSockets (Gateways)** organizados em salas (*Rooms*).
2. **Consistência Estrita & Integridade Transacional (Zero Double-Spending):** Apostas e alterações de saldo jamais podem sofrer com condições de corrida (*race conditions*). A operação é executada atomicamente no **PostgreSQL** com isolamento transacional e bloqueio pessimista (**ACID** via `SELECT ... FOR UPDATE`).

---

## 🏛️ Arquitetura de Software — Modelo C4

O sistema foi modelado seguindo os 4 níveis do **Modelo C4** para fornecer rastreabilidade arquitetural completa da plataforma de jogos.

---

### Nível 1: Diagrama de Contexto do Sistema (System Context)

Mostra como o sistema de jogos se posiciona em relação aos seus usuários diretos e aos sistemas externos da organização.

```mermaid
C4Context
    title Nível 1: Diagrama de Contexto do Sistema (System Context)

    Person(player, "Apostador / Jogador", "Usuário que realiza apostas, acompanha multiplicadores em tempo real e faz cashout.")
    Person(operator, "Operador / Auditor", "Auditoria interna responsável por verificar relatórios de conformidade e integridade das rodadas.")

    System(jungleSystem, "Motor de Jogos & Apostas", "Backend responsável pelo ciclo de vida da partida, transações financeiras atômicas e streaming de multiplicadores.")

    System_Ext(awsServices, "AWS Cloud Services", "SNS (Pub/Sub Fan-Out) e SQS (Filas com retenção durável) para processamento assíncrono.")
    System_Ext(regulator, "Sistema Regulador de Apostas", "Órgão externo governamental de auditoria e compliance de iGaming.")

    Rel(player, jungleSystem, "Conecta, aposta e recebe ticks da rodada", "WSS / HTTPS")
    Rel(operator, jungleSystem, "Audita histórico e movimentações de carteira", "HTTPS / REST")
    Rel(jungleSystem, awsServices, "Publica eventos de apostas e rodadas finalizadas", "AWS SDK / TLS")
    Rel(awsServices, regulator, "Encaminha eventos de auditoria para compliance", "HTTPS / Webhooks")
```

---

### Nível 2: Diagrama de Contêineres (Containers)

Apresenta as aplicações, bancos de dados e serviços em nuvem implantáveis que compõem a solução.

```mermaid
C4Container
    title Nível 2: Diagrama de Contêineres (Containers)

    Person(player, "Apostador / Jogador", "Cliente final da plataforma")

    Container(spa, "Single Page Application (SPA)", "React / TypeScript", "Interface gráfica onde o jogador interage com a partida em tempo real.")

    Container_Boundary(backendBoundary, "Ambiente Backend (Container Docker)") {
        Container(apiApp, "Backend API & Game Engine", "NestJS, TypeScript, Node.js", "Expõe endpoints REST para carteira e Gateway WebSocket para partidas em tempo real.")
        ContainerDb(dbPostgres, "Banco de Dados Relacional", "PostgreSQL 16", "Armazena carteiras, histórico de rodadas e apostas com garantias ACID e transações atômicas.")
    }

    Container_Boundary(awsBoundary, "Infraestrutura de Mensageria (AWS)") {
        Container(snsTopic, "Tópico de Eventos (SNS)", "AWS SNS", "Tópico Pub/Sub que recebe eventos de rodadas e distribui em Fan-Out.")
        Container(sqsQueue, "Filas Assíncronas (SQS)", "AWS SQS", "Buffers duráveis de mensagens para processamento de pagamentos e auditoria.")
    }

    Rel(player, spa, "Interage visualmente", "GUI")
    Rel(spa, apiApp, "Dispara apostas e recebe multiplicadores", "WebSocket (WSS)")
    Rel(spa, apiApp, "Consulta saldo e realiza depósitos", "HTTPS / JSON")
    Rel(apiApp, dbPostgres, "Lê e grava dados com Unit of Work e Lock Pessimista", "TCP / PostgreSQL Protocol")
    Rel(apiApp, snsTopic, "Dispara PlayerCashedOutEvent", "AWS SDK / HTTPS")
    Rel(apiApp, sqsQueue, "Enfileira BetPlacedEvent", "AWS SDK / HTTPS")
    Rel(snsTopic, sqsQueue, "Replica eventos via padrão Fan-Out", "AWS Internal")
```

---

### Nível 3: Diagrama de Componentes (Components — Backend NestJS)

Detalha a estrutura modular interna da aplicação NestJS, evidenciando as camadas de **Apresentação**, **Aplicação**, **Domínio** e **Infraestrutura**.

```mermaid
C4Component
    title Nível 3: Diagrama de Componentes (Backend NestJS)

    Container_Boundary(nestApp, "NestJS Backend Application") {
        Component(gameGateway, "GameGateway", "NestJS WebSocketGateway", "Gerencia conexões Socket.IO, ingressa clientes em Rooms e emite ticks de multiplicador.")
        Component(walletController, "WalletController", "NestJS Controller", "Expõe endpoints REST /wallets para consultas de saldo e depósitos.")
        
        Component(validationGuards, "Guard Clauses (Zod)", "Zod Contracts", "Valida estritamente os contratos de entrada antes de invocar a lógica de negócio.")

        Component(placeBetUC, "PlaceBetUseCase", "Application Service", "Orquestra débito de carteira, registro de aposta e emissão de evento em transação atômica.")
        Component(cashoutUC, "ExecuteCashoutUseCase", "Application Service", "Calcula ganhos pelo multiplicador atual, credita carteira e publica evento de cashout.")

        Component(domainLayer, "Entidades de Domínio", "Classes TypeScript Puras", "Wallet, Bet e GameRound com regras de negócio encapsuladas e invariantes estritas.")

        Component(mikroOrm, "MikroORM Entity Manager", "MikroORM / Data Mapper", "Implementa Unit of Work e Identity Map, realizando batch flush no PostgreSQL.")
        Component(eventPublisher, "AwsEventPublisherService", "IEventPublisher Adapter", "Despacha eventos de domínio para tópicos SNS e filas SQS.")
    }

    ContainerDb(postgresDb, "PostgreSQL Database", "PostgreSQL", "Persistência transacional")
    Container(awsCloud, "AWS Cloud", "SNS / SQS", "Infraestrutura de Mensageria")

    Rel(gameGateway, validationGuards, "Valida payload da aposta")
    Rel(walletController, validationGuards, "Valida payload de depósito")
    Rel(validationGuards, placeBetUC, "Encaminha entrada validada")
    Rel(validationGuards, cashoutUC, "Encaminha entrada validada")
    Rel(placeBetUC, domainLayer, "Executa regras de negócio")
    Rel(cashoutUC, domainLayer, "Executa regras de negócio")
    Rel(placeBetUC, mikroOrm, "Executa em transação com Lock Pessimista")
    Rel(cashoutUC, mikroOrm, "Persiste crédito em transação atômica")
    Rel(placeBetUC, eventPublisher, "Publica BetPlacedEvent")
    Rel(cashoutUC, eventPublisher, "Publica PlayerCashedOutEvent")
    Rel(mikroOrm, postgresDb, "Commit atômico em lote", "SQL")
    Rel(eventPublisher, awsCloud, "Envia mensagens assíncronas", "AWS Protocol")
```

---

### Nível 4: Diagrama de Código (Code — Modelo de Domínio e Classes)

Apresenta as entidades ricas do domínio, métodos de negócio encapsulados, tipos e invariantes que garantem a segurança do sistema sem dependências acopladas.

```mermaid
classDiagram
    class Wallet {
        +UUID id
        +string userId
        +number balance
        +string currency
        +Date createdAt
        +Date updatedAt
        +debit(amount: number) void
        +credit(amount: number) void
    }

    class Bet {
        +UUID id
        +string userId
        +UUID gameRoundId
        +number amount
        +BetStatus status
        +number cashedOutAtMultiplier
        +number winAmount
        +Date createdAt
        +Date updatedAt
        +cashOut(multiplier: number) number
        +markAsLost() void
    }

    class GameRound {
        +UUID id
        +GameStatus status
        +number currentMultiplier
        +number crashedAtMultiplier
        +number totalPot
        +Date createdAt
        +Date finishedAt
        +registerBet(amount: number) void
        +startRound() void
        +updateMultiplier(nextMultiplier: number) void
        +crash(crashMultiplier: number) void
    }

    class BetStatus {
        <<enumeration>>
        PENDING
        ACTIVE
        WON
        LOST
        CASHED_OUT
    }

    class GameStatus {
        <<enumeration>>
        WAITING_BETS
        RUNNING
        CRASHED
        FINISHED
    }

    class InsufficientFundsException {
        +string name
        +string message
    }

    class InvalidBetAmountException {
        +string name
        +string message
    }

    class GameRoundClosedException {
        +string name
        +string message
    }

    Wallet --> InsufficientFundsException : lança quando balance < amount
    Wallet --> InvalidBetAmountException : lança quando amount <= 0
    Bet --> BetStatus : possui estado
    Bet --> InvalidBetAmountException : lança quando amount <= 0
    GameRound --> GameStatus : possui ciclo de vida
    GameRound --> GameRoundClosedException : lança quando status != WAITING_BETS
    GameRound --> InvalidBetAmountException : lança quando amount <= 0
    Bet ..> GameRound : vinculado por gameRoundId
```

---

## 🔬 Decisões de Engenharia & Tecnologias

### 1. WebSockets & Rooms no NestJS
- O backend atua como a **autoridade única da verdade** (*Single Source of Truth*). O cliente apenas renderiza o estado recebido.
- Uso de **Rooms** (`server.to(gameRoundId).emit(...)`) para isolar o tráfego de cada partida ativa, eliminando broadcasting global desnecessário e otimizando a latência de rede.

### 2. MikroORM vs Prisma / TypeORM
- **Data Mapper & Entidades Ricas:** Diferente de tipos anêmicos, as entidades (`Wallet`, `Bet`, `GameRound`) encapsulam regras e invariantes de negócio, alinhando-se com os princípios do DDD.
- **Unit of Work & Identity Map:** Acumula alterações em memória durante o ciclo da requisição, detecta mudanças por *Dirty Checking* e dispara operações em **lote (batch)** no PostgreSQL via `em.transactional()`, reduzindo o tempo de bloqueio de conexões.
- **Proteção contra Gasto Duplo:** Uso de `LockMode.PESSIMISTIC_WRITE` (`SELECT ... FOR UPDATE`) na carteira durante a validação da aposta.

### 3. Padrão Fan-Out com AWS SNS + SQS
- **Desacoplamento Temporal & Amortecimento de Carga:** Quando o jogador aposta ou realiza cashout, tarefas secundárias (auditoria, métricas de leaderboard e liquidações de saldo) são despachadas assincronamente via **SQS** e **SNS**.
- Se um serviço consumidor sofrer lentidão ou indisponibilidade, a fila SQS retém as mensagens sem travar o motor da partida em tempo real.

---

## 📁 Estrutura do Projeto

```
src/
├── domain/                    # Regras de negócio puras (sem dependências de framework)
│   ├── entities/              # Wallet, Bet, GameRound
│   ├── enums/                 # BetStatus, GameStatus, TransactionType
│   └── exceptions/            # InsufficientFunds, InvalidBetAmount, GameRoundClosed
├── application/               # Casos de uso da aplicação
│   └── use-cases/             # PlaceBetUseCase, ExecuteCashoutUseCase
├── infrastructure/            # Implementações externas, banco e mensageria
│   ├── database/              # Configuração do MikroORM para PostgreSQL
│   └── messaging/             # AwsEventPublisherService (SNS + SQS)
└── presentation/              # Portas de entrada (WebSockets e REST)
    ├── contracts/             # Schemas e validação de borda com Zod
    ├── controllers/           # WalletController
    └── gateways/              # GameGateway (Socket.io)
tests/                         # Suíte de testes automatizados com cobertura rigorosa
```

---

## 🚀 Como Executar

### Pré-requisitos
- **Node.js** >= 20.x
- **Docker** & **Docker Compose**

### 1. Clonar e Instalar Dependências
```bash
git clone <url-do-repositorio>
cd aprendendo-stack-jungle-gaming
npm install
```

### 2. Iniciar o Banco de Dados com Docker
```bash
npm run docker:up
```

### 3. Executar a Suíte de Testes com Cobertura
```bash
npm run test
```
*Cobertura esperada: 100% de statements, branches e linhas em domínio, aplicação e apresentação.*

### 4. Executar em Modo de Desenvolvimento
```bash
npm run start:dev
```
- API REST: `http://localhost:3000`
- WebSocket Gateway: `ws://localhost:3000/game`

---

## 🧪 Cobertura de Testes Automatizados

Suíte construída com **Vitest** seguindo separação estrita de camadas e sem mocks espúrios no domínio:
- Testes unitários com validação de limites numéricos e cenários de borda.
- Testes de concorrência com simulação de bloqueio pessimista e controle transacional.
- Testes de validação de schemas Zod atuando como *Guard Clauses* na borda do sistema.
