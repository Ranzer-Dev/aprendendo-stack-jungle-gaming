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
flowchart TB
    classDef person fill:#08427b,stroke:#052a4f,stroke-width:2px,color:#fff;
    classDef system fill:#1168bd,stroke:#0b4884,stroke-width:2px,color:#fff;
    classDef external fill:#757575,stroke:#424242,stroke-width:2px,color:#fff;

    subgraph Atores["Atores do Ecossistema"]
        Apostador["<b>Apostador / Jogador</b><br/><i>[Usuário Final]</i><br/>Realiza apostas, acompanha multiplicador em tempo real e faz cashout"]:::person
        Auditor["<b>Operador / Auditor de Jogo</b><br/><i>[Gestão e Compliance]</i><br/>Monitora integridade das rodadas e movimentações financeiras"]:::person
    end

    subgraph FronteiraSistema["Fronteira da Aplicação"]
        JungleCore["<b>Motor de Jogos & Apostas</b><br/><i>[Jungle Gaming Core - NestJS]</i><br/>Controla ciclo de vida das rodadas, autoridade única de estado e liquidação atômica"]:::system
    end

    subgraph EcossistemaExterno["Sistemas e Provedores Externos"]
        AWSCloud["<b>AWS Cloud Messaging</b><br/><i>[SNS + SQS]</i><br/>Tópicos e filas assíncronas para processamento desacoplado em Fan-Out"]:::external
        Regulador["<b>Órgão Regulador de Apostas</b><br/><i>[Sistema de Compliance]</i><br/>Audita transações e logs de apostas para homologação legal de iGaming"]:::external
    end

    Apostador -->|Conecta, aposta e recebe ticks da rodada via WSS / HTTPS| JungleCore
    Auditor -->|Audita histórico e movimentações via HTTPS / REST| JungleCore
    JungleCore -->|Publica eventos de apostas e rodadas finalizadas via AWS SDK| AWSCloud
    AWSCloud -->|Encaminha eventos de auditoria e conformidade via Webhooks| Regulador
```

---

### Nível 2: Diagrama de Contêineres (Containers)

Apresenta as aplicações, bancos de dados e serviços em nuvem implantáveis que compõem a solução.

```mermaid
flowchart TB
    classDef clientApp fill:#2e7d32,stroke:#1b5e20,stroke-width:2px,color:#fff;
    classDef backend fill:#0277bd,stroke:#01579b,stroke-width:2px,color:#fff;
    classDef database fill:#1b5e20,stroke:#0a3b13,stroke-width:2px,color:#fff;
    classDef messaging fill:#e65100,stroke:#bf360c,stroke-width:2px,color:#fff;

    subgraph Cliente["Ambiente do Cliente (Browser / Mobile)"]
        SPA["<b>Single Page Application (SPA)</b><br/>[React / TypeScript / HTML5]<br/>Interface de apostas com streaming de multiplicador"]:::clientApp
    end

    subgraph BackendDocker["Ambiente Backend (Container Docker)"]
        NestEngine["<b>Backend API & Game Engine</b><br/>[NestJS / TypeScript / Node.js]<br/>Endpoints REST de carteira e Gateway WebSocket /game"]:::backend
        PostgresDB[("<b>Banco de Dados Relacional</b><br/>[PostgreSQL 16]<br/>Carteiras, apostas e rodadas com transações ACID e Lock Pessimista")]:::database
    end

    subgraph NuvemAWS["Infraestrutura de Mensageria (AWS Cloud)"]
        SNSTopic["<b>Tópico SNS (Pub/Sub)</b><br/>[AWS SNS / RoundEvents]<br/>Distribui eventos de partidas finalizadas no padrão Fan-Out"]:::messaging
        SQSQueue[("<b>Fila SQS (Queue)</b><br/>[AWS SQS / PayoutQueue]<br/>Buffer durável com retenção de pagamentos e auditoria")]:::messaging
    end

    SPA -->|Apostas e recepção de ticks em tempo real via WSS| NestEngine
    SPA -->|Consultas de saldo e depósitos via HTTPS / REST| NestEngine
    NestEngine -->|Persistência transacional com Unit of Work e Lock Pessimista| PostgresDB
    NestEngine -->|Publica eventos de rodada via AWS SDK| SNSTopic
    NestEngine -->|Enfileira liquidações de apostas via AWS SDK| SQSQueue
    SNSTopic -->|Replica eventos para filas inscritas no padrão Fan-Out| SQSQueue
```

#### Matriz de Tecnologias e Protocolos

| Contêiner | Tecnologia | Papel e Responsabilidade | Protocolo de Integração |
|---|---|---|---|
| **Frontend Web (SPA)** | React, TypeScript, HTML5 | Interface de usuário para exibição em tempo real do gráfico e controles de aposta. | WSS (WebSocket) / HTTPS (REST) |
| **Backend API & Engine** | NestJS, TypeScript, Node.js | Autoridade absoluta da partida, ciclo de vida das rodadas, controle de transações e eventos. | Execução em container Docker / Node.js 22 |
| **Banco de Dados** | PostgreSQL 16 | Persistência relacional com conformidade ACID, isolamento e bloqueio pessimista (`SELECT ... FOR UPDATE`). | Conexão TCP / Driver `pg` com pool |
| **Tópico de Eventos** | AWS SNS (`RoundEventsTopic`) | Distribuição de eventos de jogo em larga escala para múltiplos ouvintes (Fan-Out). | AWS SDK via TLS/HTTPS |
| **Fila de Mensagens** | AWS SQS (`PayoutQueue`) | Amortecedor de carga e retenção durável para auditoria e liquidações secundárias de saldo. | AWS SDK via TLS/HTTPS |

---

### Nível 3: Diagrama de Componentes (Components — Backend NestJS)

Detalha a estrutura modular interna da aplicação NestJS, evidenciando as camadas de **Apresentação**, **Aplicação**, **Domínio** e **Infraestrutura**.

```mermaid
flowchart TB
    classDef gate fill:#0288d1,stroke:#01579b,stroke-width:2px,color:#fff;
    classDef guard fill:#e65100,stroke:#bf360c,stroke-width:2px,color:#fff;
    classDef usecase fill:#2e7d32,stroke:#1b5e20,stroke-width:2px,color:#fff;
    classDef domain fill:#6a1b9a,stroke:#4a148c,stroke-width:2px,color:#fff;
    classDef infra fill:#455a64,stroke:#263238,stroke-width:2px,color:#fff;

    subgraph Apresentacao["Camada de Apresentação (Presentation Layer)"]
        GameGateway["<b>GameGateway</b><br/>[WebSocketGateway /game]<br/>Salas Socket.io, broadcast de multiplicador e listeners"]:::gate
        WalletController["<b>WalletController</b><br/>[REST Controller /wallets]<br/>Endpoints de consulta de saldo e depósito"]:::gate
    end

    subgraph BordaValidacao["Validação de Borda (Guard Clauses)"]
        ZodContracts["<b>Zod Contracts</b><br/>• PlaceBetSchema<br/>• CashoutSchema<br/>• DepositSchema"]:::guard
    end

    subgraph Aplicacao["Camada de Aplicação (Use Cases)"]
        PlaceBetUC["<b>PlaceBetUseCase</b><br/>Valida saldo, adquire Lock Pessimista, debita carteira e cria aposta"]:::usecase
        CashoutUC["<b>ExecuteCashoutUseCase</b><br/>Valida multiplicador da rodada, credita carteira e publica cashout"]:::usecase
    end

    subgraph Dominio["Camada de Domínio Puro (Domain Layer)"]
        WalletModel["<b>Wallet Entity</b><br/>Regras de saldo, debit() e credit()"]:::domain
        GameRoundModel["<b>GameRound Entity</b><br/>Ciclo de vida da partida, start(), tick() e crash()"]:::domain
        BetModel["<b>Bet Entity</b><br/>Ciclo da aposta, cashOut() e markAsLost()"]:::domain
    end

    subgraph Infraestrutura["Camada de Infraestrutura (Infrastructure Layer)"]
        MikroORMEngine["<b>MikroORM Entity Manager</b><br/>Unit of Work, Identity Map e transações atômicas"]:::infra
        EventPublisherAdapter["<b>AwsEventPublisherService</b><br/>Implementa IEventPublisher para tópicos SNS e filas SQS"]:::infra
    end

    GameGateway -->|Submete payload| ZodContracts
    WalletController -->|Submete payload| ZodContracts
    ZodContracts -->|Payload validado| PlaceBetUC
    ZodContracts -->|Payload validado| CashoutUC

    PlaceBetUC -->|Executa invariantes| WalletModel
    PlaceBetUC -->|Registra entrada| GameRoundModel
    PlaceBetUC -->|Cria entidade| BetModel

    CashoutUC -->|Calcula premiação| BetModel
    CashoutUC -->|Credita saldo| WalletModel

    PlaceBetUC -->|Gerencia transação e lock| MikroORMEngine
    CashoutUC -->|Gerencia transação atômica| MikroORMEngine

    PlaceBetUC -->|Despacha BetPlacedEvent| EventPublisherAdapter
    CashoutUC -->|Publica PlayerCashedOutEvent| EventPublisherAdapter
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
