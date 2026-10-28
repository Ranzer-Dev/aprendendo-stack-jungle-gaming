export class InsufficientFundsException extends Error {
  public constructor(currentBalance: number, attemptedAmount: number) {
    super(`Insufficient balance. Current: ${currentBalance}, Attempted: ${attemptedAmount}`);
    this.name = 'InsufficientFundsException';
  }
}
