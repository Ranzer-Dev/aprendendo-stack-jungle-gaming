import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import { Bet } from '../../domain/entities/bet.entity';
import { GameRound } from '../../domain/entities/game-round.entity';
import { Wallet } from '../../domain/entities/wallet.entity';
import { GameStatus } from '../../domain/enums/game-status.enum';
import { IEventPublisher } from '../../infrastructure/messaging/event-publisher.interface';
import { CashoutInput, CashoutSchema } from '../../presentation/contracts/cashout.contract';

@Injectable()
export class ExecuteCashoutUseCase {
  public constructor(
    private readonly em: EntityManager,
    @Inject('IEventPublisher')
    private readonly eventPublisher: IEventPublisher,
  ) {}

  public async execute(rawInput: CashoutInput): Promise<{ bet: Bet; winAmount: number }> {
    const input = CashoutSchema.parse(rawInput);

    return await this.em.transactional(async (forkedEm) => {
      const bet = await forkedEm.findOneOrFail(
        Bet,
        { id: input.betId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );

      const gameRound = await forkedEm.findOneOrFail(GameRound, { id: input.gameRoundId });

      if (gameRound.status !== GameStatus.RUNNING) {
        throw new Error(`Cannot cash out. Game round is not currently running.`);
      }

      const winAmount = bet.cashOut(gameRound.currentMultiplier);

      const wallet = await forkedEm.findOneOrFail(
        Wallet,
        { userId: bet.userId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );

      wallet.credit(winAmount);

      await this.eventPublisher.publishToTopic(
        process.env.AWS_SNS_ROUND_TOPIC_ARN || 'default-round-topic',
        {
          eventType: 'PlayerCashedOutEvent',
          aggregateId: bet.id,
          occurredOn: new Date(),
          payload: {
            userId: bet.userId,
            gameRoundId: bet.gameRoundId,
            multiplier: gameRound.currentMultiplier,
            winAmount,
          },
        },
      );

      return { bet, winAmount };
    });
  }
}
