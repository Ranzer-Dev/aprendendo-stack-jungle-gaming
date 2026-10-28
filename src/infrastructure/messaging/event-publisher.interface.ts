export interface DomainEvent<T = unknown> {
  eventType: string;
  aggregateId: string;
  occurredOn: Date;
  payload: T;
}

export interface IEventPublisher {
  publishToTopic(topicArn: string, event: DomainEvent): Promise<void>;
  sendToQueue(queueUrl: string, event: DomainEvent): Promise<void>;
}
