import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ExecuteCashoutUseCase } from '../../application/use-cases/execute-cashout.use-case';
import { PlaceBetUseCase } from '../../application/use-cases/place-bet.use-case';
import { CashoutInput } from '../contracts/cashout.contract';
import { PlaceBetInput } from '../contracts/place-bet.contract';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/game',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger: Logger = new Logger(GameGateway.name);

  public constructor(
    private readonly placeBetUseCase: PlaceBetUseCase,
    private readonly executeCashoutUseCase: ExecuteCashoutUseCase,
  ) {}

  public handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  public handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRound')
  public handleJoinRound(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { gameRoundId: string },
  ): void {
    client.join(payload.gameRoundId);
    client.emit('joinedRound', { gameRoundId: payload.gameRoundId });
  }

  @SubscribeMessage('placeBet')
  public async handlePlaceBet(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PlaceBetInput,
  ): Promise<void> {
    const bet = await this.placeBetUseCase.execute(payload);

    this.server.to(payload.gameRoundId).emit('betAccepted', {
      betId: bet.id,
      userId: bet.userId,
      amount: bet.amount,
      gameRoundId: bet.gameRoundId,
    });
  }

  @SubscribeMessage('cashout')
  public async handleCashout(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CashoutInput,
  ): Promise<void> {
    const result = await this.executeCashoutUseCase.execute(payload);

    this.server.to(payload.gameRoundId).emit('playerCashedOut', {
      betId: result.bet.id,
      userId: result.bet.userId,
      winAmount: result.winAmount,
      multiplier: result.bet.cashedOutAtMultiplier,
    });
  }

  public broadcastMultiplierTick(gameRoundId: string, currentMultiplier: number): void {
    this.server.to(gameRoundId).emit('multiplierTick', {
      gameRoundId,
      multiplier: currentMultiplier,
    });
  }

  public broadcastRoundCrashed(gameRoundId: string, crashedAtMultiplier: number): void {
    this.server.to(gameRoundId).emit('roundCrashed', {
      gameRoundId,
      crashedAtMultiplier,
    });
  }
}
