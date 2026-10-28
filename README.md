# Aprendendo Stack Jungle Gaming 🎮⚡

> Prova de Conceito (POC) arquitetural de um motor de apostas em tempo real (*Crash Game*) desenvolvido com **NestJS**, **WebSockets**, **MikroORM**, **PostgreSQL**, **Domain-Driven Design (DDD)** e arquitetura orientada a eventos com **AWS SQS & SNS**.

---

## 🎯 Contexto de Negócio

No ecossistema de **iGaming**, dois requisitos não-funcionais são inegociáveis:
1. **Baixa Latência & Comunicação Bidirecional:** O multiplicador do jogo é transmitido em frações de segundo para milhares de clientes conectados. O protocolo HTTP tradicional (request/response com polling) geraria overhead inaceitável. Por isso, a comunicação em tempo real é operada via **WebSockets (Gateways)**.
2. **Consistência Estrita & Integridade Transacional (Zero Double-Spending):** Apostas e alterações de saldo jamais podem sofrer com condições de corrida (*race conditions*). A operação deve ser executada atomicamente no **PostgreSQL** com isolamento transacional e bloqueio pessimista (**ACID**).

---

## 🏛️ Diagrama Arquitetural

```mermaid
flowchart TD
    subgraph Clients["Camada de Apresentação"]
        Client[Frontend / Jogador]
    end

    subgraph NestJS["NestJS Backend Core (DDD & Clean Architecture)"]
        Gateway[GameGateway - WebSockets Namespace /game]
        Controller[WalletController - REST /wallets]
        
        subgraph Validation["Guard Clauses"]
            ZodSchema[Zod Validation Contracts]
        end

        subgraph Application["Casos de Uso (Application Layer)"]
            PlaceBetUC[PlaceBetUseCase]
            CashoutUC[ExecuteCashoutUseCase]
        end

        subgraph Domain["Domínio Puro (Domain Layer)"]
            WalletEntity[Wallet Entity]
            BetEntity[Bet Entity]
            RoundEntity[GameRound Entity]
        end

        subgraph Infra["Camada de Infraestrutura"]
            MikroORM[MikroORM - Unit of Work & Identity Map]
            EventPublisher[AwsEventPublisherService]
        end
    end

    subgraph Persistence["Persistência & Nuvem"]
        Postgres[(PostgreSQL 16 - Transações ACID / Lock)]
        SNS[AWS SNS - RoundFinished Topic]
        SQS[AWS SQS - Payout Queue]
    end

    Client <-->|WebSocket Events| Gateway
    Client -->|HTTP REST| Controller
    Gateway --> ZodSchema
    Controller --> ZodSchema
    ZodSchema --> PlaceBetUC
    ZodSchema --> CashoutUC
    PlaceBetUC --> WalletEntity
    PlaceBetUC --> BetEntity
    PlaceBetUC --> RoundEntity
    PlaceBetUC --> MikroORM
    CashoutUC --> MikroORM
    MikroORM <-->|Batch Flush / Pessimistic Write| Postgres
    PlaceBetUC -->|Enqueue BetPlacedEvent| SQS
    CashoutUC -->|Publish PlayerCashedOutEvent| SNS
    SNS -->|Fan-Out| SQS
```

---

## 🔬 Decisões de Engenharia & Tecnologias

### 1. WebSockets & Rooms no NestJS
- O backend atua como a **autoridade única da verdade** (*Single Source of Truth*). O cliente apenas renderiza o estado.
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
