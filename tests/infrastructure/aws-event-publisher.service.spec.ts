import { describe, expect, it, vi } from 'vitest';
import { AwsEventPublisherService } from '../../src/infrastructure/messaging/aws-event-publisher.service';

describe('AwsEventPublisherService', () => {
  it('should publish event to SNS topic', async () => {
    const service = new AwsEventPublisherService();
    const spy = vi.spyOn((service as unknown as { logger: { log: (msg: string) => void } }).logger, 'log');

    await service.publishToTopic('arn:aws:sns:us-east-1:123:topic', {
      eventType: 'TestEvent',
      aggregateId: 'agg-1',
      occurredOn: new Date(),
      payload: { foo: 'bar' },
    });

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[SNS Fan-Out Published]'));
  });

  it('should send event to SQS queue', async () => {
    const service = new AwsEventPublisherService();
    const spy = vi.spyOn((service as unknown as { logger: { log: (msg: string) => void } }).logger, 'log');

    await service.sendToQueue('https://sqs.us-east-1.amazonaws.com/123/queue', {
      eventType: 'TestQueueEvent',
      aggregateId: 'agg-2',
      occurredOn: new Date(),
      payload: { baz: 123 },
    });

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[SQS Queue Enqueued]'));
  });
});
