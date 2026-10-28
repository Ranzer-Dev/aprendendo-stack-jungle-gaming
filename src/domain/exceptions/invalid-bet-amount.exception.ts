export class InvalidBetAmountException extends Error {
  public constructor(amount: number) {
    super(`Bet amount must be greater than zero. Received: ${amount}`);
    this.name = 'InvalidBetAmountException';
  }
}
