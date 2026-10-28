import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import { Bet } from '../../domain/entities/bet.entity';
import { GameRound } from '../../domain/entities/game-round.entity';
import { Wallet } from '../../domain/entities/wallet.entity';
import { IEventPublisher } from '../../infrastructure/messaging/event-publisher.interface';
import { PlaceBetInput, PlaceBetSchema } from '../../presentation/contracts/place-bet.contract';

@Injectable()
export class PlaceBetUseCase {
  public constructor(
    private readonly em: EntityManager,
    @Inject('IEventPublisher')
    private readonly eventPublisher: IEventPublisher,
  ) {}

  public async execute(rawInput: PlaceBetInput): Promise<Bet> {
    const input = PlaceBetSchema.parse(rawInput);

    return await this.em.transactional(async (forkedEm) => {
      const wallet = await forkedEm.findOneOrFail(
        Wallet,
        { userId: input.userId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );

      const gameRound = await forkedEm.findOneOrFail(GameRound, { id: input.gameRoundId });

      wallet.debit(input.amount);
      gameRound.registerBet(input.amount);

      const bet = new Bet(input.userId, input.gameRoundId, input.amount);
      forkedEm.persist(bet);

      await this.eventPublisher.sendToQueue(
        process.env.AWS_SQS_PAYOUT_QUEUE_URL || 'default-payout-queue',
        {
          eventType: 'BetPlacedEvent',
          aggregateId: bet.id,
          occurredOn: new Date(),
          payload: {
            userId: bet.userId,
            gameRoundId: bet.gameRoundId,
            amount: bet.amount,
          },
        },
      );

      return bet;
    });
  }
}
