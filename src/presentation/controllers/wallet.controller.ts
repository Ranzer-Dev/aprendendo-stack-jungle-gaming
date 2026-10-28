import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { Wallet } from '../../domain/entities/wallet.entity';

const DepositSchema = z.object({
  amount: z.number().positive('Deposit amount must be greater than zero'),
});

@Controller('wallets')
export class WalletController {
  public constructor(private readonly em: EntityManager) {}

  @Get(':userId')
  public async getBalance(@Param('userId') userId: string): Promise<{ userId: string; balance: number; currency: string }> {
    const wallet = await this.em.findOneOrFail(Wallet, { userId });
    return {
      userId: wallet.userId,
      balance: wallet.balance,
      currency: wallet.currency,
    };
  }

  @Post(':userId/deposit')
  public async deposit(
    @Param('userId') userId: string,
    @Body() body: { amount: number },
  ): Promise<{ userId: string; balance: number }> {
    const validated = DepositSchema.parse(body);

    return await this.em.transactional(async (forkedEm) => {
      let wallet = await forkedEm.findOne(
        Wallet,
        { userId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );

      if (!wallet) {
        wallet = new Wallet(userId, 0);
        forkedEm.persist(wallet);
      }

      wallet.credit(validated.amount);
      return {
        userId: wallet.userId,
        balance: wallet.balance,
      };
    });
  }
}
