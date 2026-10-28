import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ExecuteCashoutUseCase } from './application/use-cases/execute-cashout.use-case';
import { PlaceBetUseCase } from './application/use-cases/place-bet.use-case';
import { Bet } from './domain/entities/bet.entity';
import { GameRound } from './domain/entities/game-round.entity';
import { Wallet } from './domain/entities/wallet.entity';
import mikroOrmConfig from './infrastructure/database/mikro-orm.config';
import { AwsEventPublisherService } from './infrastructure/messaging/aws-event-publisher.service';
import { WalletController } from './presentation/controllers/wallet.controller';
import { GameGateway } from './presentation/gateways/game.gateway';

@Module({
  imports: [
    MikroOrmModule.forRoot(mikroOrmConfig),
    MikroOrmModule.forFeature([Wallet, Bet, GameRound]),
  ],
  controllers: [WalletController],
  providers: [
    GameGateway,
    PlaceBetUseCase,
    ExecuteCashoutUseCase,
    {
      provide: 'IEventPublisher',
      useClass: AwsEventPublisherService,
    },
  ],
})
export class AppModule {}
