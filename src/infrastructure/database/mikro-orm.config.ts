import { defineConfig } from '@mikro-orm/postgresql';
import * as dotenv from 'dotenv';
import { Bet } from '../../domain/entities/bet.entity';
import { GameRound } from '../../domain/entities/game-round.entity';
import { Wallet } from '../../domain/entities/wallet.entity';

dotenv.config();

export default defineConfig({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'jungle_user',
  password: process.env.DB_PASSWORD || 'jungle_secret',
  dbName: process.env.DB_NAME || 'jungle_gaming_db',
  entities: [Wallet, Bet, GameRound],
  debug: process.env.NODE_ENV === 'development',
});
