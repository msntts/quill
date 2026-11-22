import type { CallLog } from '../log/call-log';

export const DEFAULT_INTERVAL_MS = 30 * 60_000;

export interface SchedulerOptions {
  runCycle: () => Promise<unknown>;
  intervalMs: number;
  log: CallLog;
  now: () => number;
}

export interface Scheduler {
  stop(): void;
}

/**
 * Runs a cycle at start and then every interval. A tick that arrives while the
 * previous cycle is still running is skipped (not queued) and logged.
 */
export function startScheduler(options: SchedulerOptions): Scheduler {
  let running = false;

  const tick = () => {
    if (running) {
      options.log.append({ type: 'skipped', at: options.now() });
      return;
    }
    running = true;
    options
      .runCycle()
      .catch(() => {
        // runFetchCycle records its own failures; keep the schedule alive regardless.
      })
      .finally(() => {
        running = false;
      });
  };

  tick();
  const timer = setInterval(tick, options.intervalMs);
  return { stop: () => clearInterval(timer) };
}
