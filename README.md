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

    Person(player, "Apostador", "Jogador em tempo real")
    Person(operator, "Operador / Auditor", "Auditoria de conformidade")

    System(jungleSystem, "Motor de Jogos & Apostas", "Backend NestJS + WebSockets")

    System_Ext(awsServices, "AWS Services", "SNS (Pub/Sub) e SQS (Filas)")
    System_Ext(regulator, "Regulador", "Auditoria governamental de iGaming")

    Rel_R(player, jungleSystem, "Aposta e Cashout", "WSS / HTTPS")
    Rel_D(operator, jungleSystem, "Audita histórico", "REST")
    Rel_R(jungleSystem, awsServices, "Dispara eventos", "AWS SDK")
    Rel_D(awsServices, regulator, "Encaminha relatórios", "Webhooks")
```

---

### Nível 2: Diagrama de Contêineres (Containers)

Apresenta as aplicações, bancos de dados e serviços em nuvem implantáveis que compõem a solução.

```mermaid
C4Container
    title Nível 2: Diagrama de Contêineres (Containers)

    Person(player, "Apostador", "Cliente final")
    Container(spa, "Frontend SPA", "React / TypeScript", "Interface do jogador em tempo real")

    Container_Boundary(backendBoundary, "Ambiente Backend (Container Docker)") {
        Container(apiApp, "API & Game Engine", "NestJS / TypeScript", "REST e WebSocket Gateway")
        ContainerDb(dbPostgres, "Banco de Dados", "PostgreSQL 16", "Persistência ACID com Lock Pessimista")
    }

    Container_Boundary(awsBoundary, "Infraestrutura de Mensageria (AWS)") {
        Container(snsTopic, "Tópico SNS", "AWS SNS", "Pub/Sub Fan-Out de rodadas")
        Container(sqsQueue, "Fila SQS", "AWS SQS", "Buffer durável de pagamentos")
    }

    Rel_D(player, spa, "Interage", "GUI")
    Rel_R(spa, apiApp, "Apostas e Ticks", "WSS / HTTPS")
    Rel_D(apiApp, dbPostgres, "Lê e grava dados", "TCP / PostgreSQL")
    Rel_R(apiApp, snsTopic, "Publica eventos", "AWS SDK")
    Rel_D(apiApp, sqsQueue, "Enfileira tarefas", "AWS SDK")
    Rel_D(snsTopic, sqsQueue, "Fan-Out", "AWS Internal")
```

---

### Nível 3: Diagrama de Componentes (Components — Backend NestJS)

Detalha a estrutura modular interna da aplicação NestJS, evidenciando as camadas de **Apresentação**, **Aplicação**, **Domínio** e **Infraestrutura**.

```mermaid
C4Component
    title Nível 3: Diagrama de Componentes (Backend NestJS)

    Container_Boundary(nestApp, "NestJS Application Core") {
        Component(gameGateway, "GameGateway", "WebSocket Gateway", "Salas e broadcast de multiplicador")
        Component(walletController, "WalletController", "REST Controller", "Consulta de saldo e depósitos")
        
        Component(validationGuards, "Guard Clauses", "Zod Schemas", "Validação estrita de contratos")

        Component(placeBetUC, "PlaceBetUseCase", "Application Service", "Orquestração de aposta atômica")
        Component(cashoutUC, "ExecuteCashoutUseCase", "Application Service", "Cálculo de ganho e crédito")

        Component(domainLayer, "Domínio Puro", "Entidades TypeScript", "Wallet, Bet e GameRound")

        Component(mikroOrm, "MikroORM", "Unit of Work", "Controle transacional no PostgreSQL")
        Component(eventPublisher, "EventPublisher", "Adapter SNS/SQS", "Despacho assíncrono de eventos")
    }

    ContainerDb(postgresDb, "PostgreSQL", "Database", "Persistência ACID")
    Container(awsCloud, "AWS Cloud", "SNS / SQS", "Infraestrutura de Mensageria")

    Rel_D(gameGateway, validationGuards, "Valida payload")
    Rel_D(walletController, validationGuards, "Valida payload")
    Rel_D(validationGuards, placeBetUC, "Executa caso de uso")
    Rel_D(validationGuards, cashoutUC, "Executa caso de uso")
    Rel_R(placeBetUC, domainLayer, "Aplica regras")
    Rel_R(cashoutUC, domainLayer, "Aplica regras")
    Rel_D(placeBetUC, mikroOrm, "Transação com Lock")
    Rel_D(cashoutUC, mikroOrm, "Crédito atômico")
    Rel_R(placeBetUC, eventPublisher, "Enfileira SQS")
    Rel_R(cashoutUC, eventPublisher, "Publica SNS")
    Rel_D(mikroOrm, postgresDb, "Batch commit", "SQL")
    Rel_D(eventPublisher, awsCloud, "Despacha", "AWS SDK")
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
