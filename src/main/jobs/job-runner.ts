export type JobState = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface JobStatus {
  id: string;
  state: JobState;
  startedAt?: number;
  finishedAt?: number;
  error?: unknown;
  logs: string[];
}

export interface JobContext {
  signal: AbortSignal;
  log: (message: string) => void;
}

export type JobWork<TResult> = (context: JobContext) => Promise<TResult> | TResult;

interface JobRecord extends JobStatus {
  controller?: AbortController;
}

export interface JobRunner {
  run: <TResult>(id: string, work: JobWork<TResult>) => Promise<TResult>;
  stop: (id: string) => void;
  getStatus: (id: string) => JobStatus | undefined;
  listStatuses: () => JobStatus[];
}

function publicStatus(record: JobRecord): JobStatus {
  const { controller: _controller, ...status } = record;
  return status;
}

export function createJobRunner(now: () => number = () => Date.now()): JobRunner {
  const records = new Map<string, JobRecord>();

  return {
    async run(id, work) {
      const current = records.get(id);
      if (current?.state === 'running') {
        throw new Error(`任务正在运行: ${id}`);
      }

      const controller = new AbortController();
      const record: JobRecord = {
        id,
        state: 'running',
        startedAt: now(),
        logs: [],
        controller,
      };
      records.set(id, record);

      try {
        const result = await work({
          signal: controller.signal,
          log: (message) => record.logs.push(message),
        });
        record.state = controller.signal.aborted ? 'cancelled' : 'completed';
        record.finishedAt = now();
        return result;
      } catch (error) {
        record.state = controller.signal.aborted ? 'cancelled' : 'failed';
        record.error = error;
        record.finishedAt = now();
        throw error;
      } finally {
        delete record.controller;
      }
    },

    stop(id) {
      const record = records.get(id);
      if (record?.state === 'running') {
        record.controller?.abort();
      }
    },

    getStatus(id) {
      const record = records.get(id);
      return record ? publicStatus(record) : undefined;
    },

    listStatuses() {
      return Array.from(records.values()).map(publicStatus);
    },
  };
}

export const jobRunner = createJobRunner();

