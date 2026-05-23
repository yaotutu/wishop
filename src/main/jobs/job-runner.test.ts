import { describe, expect, it } from 'vitest';
import { createJobRunner } from './job-runner';

describe('job runner', () => {
  it('runs a job and records completed status', async () => {
    const runner = createJobRunner();

    const result = await runner.run('job-1', async ({ log }) => {
      log('started');
      return { ok: true };
    });

    expect(result).toEqual({ ok: true });
    expect(runner.getStatus('job-1')).toMatchObject({
      state: 'completed',
      logs: ['started'],
    });
  });

  it('passes abort signal to running work when stopped', async () => {
    const runner = createJobRunner();
    let aborted = false;

    const running = runner.run('job-1', async ({ signal }) => {
      await new Promise<void>(resolve => {
        signal.addEventListener('abort', () => {
          aborted = true;
          resolve();
        });
      });
      return 'stopped';
    });

    runner.stop('job-1');

    await expect(running).resolves.toBe('stopped');
    expect(aborted).toBe(true);
    expect(runner.getStatus('job-1')?.state).toBe('cancelled');
  });

  it('rejects duplicate running job ids', async () => {
    const runner = createJobRunner();
    const running = runner.run('job-1', async () => new Promise(resolve => setTimeout(resolve, 20)));

    await expect(runner.run('job-1', async () => 'duplicate')).rejects.toThrow('任务正在运行');
    runner.stop('job-1');
    await running;
  });
});
