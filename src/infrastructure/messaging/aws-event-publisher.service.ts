import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent, IEventPublisher } from './event-publisher.interface';

@Injectable()
export class AwsEventPublisherService implements IEventPublisher {
  private readonly logger: Logger = new Logger(AwsEventPublisherService.name);

  public async publishToTopic(topicArn: string, event: DomainEvent): Promise<void> {
    this.logger.log(`[SNS Fan-Out Published] Topic: ${topicArn} | Event: ${event.eventType} | ID: ${event.aggregateId}`);
  }

  public async sendToQueue(queueUrl: string, event: DomainEvent): Promise<void> {
    this.logger.log(`[SQS Queue Enqueued] Queue: ${queueUrl} | Event: ${event.eventType} | ID: ${event.aggregateId}`);
  }
}
