/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import os from 'node:os';
import { ErrorLike } from '@backstage/errors';
import { Worker } from 'node:worker_threads';

const defaultConcurrency = Math.max(Math.ceil(os.cpus().length / 2), 1);

const CONCURRENCY_ENV_VAR = 'BACKSTAGE_CLI_CONCURRENCY';
const DEPRECATED_CONCURRENCY_ENV_VAR = 'BACKSTAGE_CLI_BUILD_PARALLEL';

type ConcurrencyOption = boolean | string | number | null | undefined;

function parseConcurrencyOption(value: ConcurrencyOption): number {
  if (value === undefined || value === null) {
    return defaultConcurrency;
  } else if (typeof value === 'boolean') {
    return value ? defaultConcurrency : 1;
  } else if (typeof value === 'number' && Number.isInteger(value)) {
    if (value < 1) {
      return 1;
    }
    return value;
  } else if (typeof value === 'string') {
    if (value === 'true') {
      return parseConcurrencyOption(true);
    } else if (value === 'false') {
      return parseConcurrencyOption(false);
    }
    const parsed = Number(value);
    if (Number.isInteger(parsed)) {
      return parseConcurrencyOption(parsed);
    }
  }

  throw Error(
    `Concurrency option value '${value}' is not a boolean or integer`,
  );
}

let hasWarnedDeprecation = false;

function getEnvironmentConcurrency() {
  if (process.env[CONCURRENCY_ENV_VAR] !== undefined) {
    return parseConcurrencyOption(process.env[CONCURRENCY_ENV_VAR]);
  }
  if (process.env[DEPRECATED_CONCURRENCY_ENV_VAR] !== undefined) {
    if (!hasWarnedDeprecation) {
      hasWarnedDeprecation = true;
      console.warn(
        `The ${DEPRECATED_CONCURRENCY_ENV_VAR} environment variable is deprecated, use ${CONCURRENCY_ENV_VAR} instead`,
      );
    }
    return parseConcurrencyOption(
      process.env[DEPRECATED_CONCURRENCY_ENV_VAR],
    );
  }
  return defaultConcurrency;
}

/**
 * Options for {@link runConcurrentTasks}.
 *
 * @public
 */
export type ConcurrentTasksOptions<TItem> = {
  /**
   * Decides the number of concurrent workers by multiplying
   * this with the configured concurrency.
   *
   * Defaults to 1.
   */
  concurrencyFactor?: number;
  items: Iterable<TItem>;
  worker: (item: TItem) => Promise<void>;
};

/**
 * Runs items through a worker function concurrently across multiple async workers.
 *
 * @public
 */
export async function runConcurrentTasks<TItem>(
  options: ConcurrentTasksOptions<TItem>,
): Promise<void> {
  const { concurrencyFactor = 1, items, worker } = options;
  const concurrency = getEnvironmentConcurrency();

  const sharedIterator = items[Symbol.iterator]();
  const sharedIterable = {
    [Symbol.iterator]: () => sharedIterator,
  };

  const workerCount = Math.max(
    Math.floor(concurrencyFactor * concurrency),
    1,
  );
  await Promise.all(
    Array(workerCount)
      .fill(0)
      .map(async () => {
        for (const value of sharedIterable) {
          await worker(value);
        }
      }),
  );
}

type WorkerThreadMessage =
  | {
      type: 'done';
    }
  | {
      type: 'item';
      index: number;
      item: unknown;
    }
  | {
      type: 'start';
    }
  | {
      type: 'result';
      index: number;
      result: unknown;
    }
  | {
      type: 'error';
      error: ErrorLike;
    }
  | {
      type: 'message';
      message: unknown;
    };

/**
 * Options for {@link runWorkerQueueThreads}.
 *
 * @public
 */
export type WorkerQueueThreadsOptions<TItem, TResult, TContext> = {
  /** The items to process */
  items: Iterable<TItem>;
  /**
   * A function that will be called within each worker thread at startup,
   * which should return the worker function that will be called for each item.
   *
   * This function must be defined as an arrow function or using the
   * function keyword, and must be entirely self contained, not referencing
   * any variables outside of its scope. This is because the function source
   * is stringified and evaluated in the worker thread.
   *
   * To pass data to the worker, use the `context` option and `items`, but
   * note that they are both copied by value into the worker thread, except for
   * types that are explicitly shareable across threads, such as `SharedArrayBuffer`.
   */
  workerFactory: (
    context: TContext,
  ) =>
    | ((item: TItem) => Promise<TResult>)
    | Promise<(item: TItem) => Promise<TResult>>;
  /** Context data supplied to each worker factory */
  context?: TContext;
};

/**
 * Spawns one or more worker threads using the `worker_threads` module.
 * Each thread processes one item at a time from the provided `options.items`.
 *
 * @public
 */
export async function runWorkerQueueThreads<TItem, TResult, TContext>(
  options: WorkerQueueThreadsOptions<TItem, TResult, TContext>,
): Promise<TResult[]> {
  const items = Array.from(options.items);
  const workerFactory = options.workerFactory;
  const workerData = options.context;
  const threadCount = Math.min(getEnvironmentConcurrency(), items.length);

  const iterator = items[Symbol.iterator]();
  const results = new Array<TResult>();
  let itemIndex = 0;

  await Promise.all(
    Array(threadCount)
      .fill(0)
      .map(async () => {
        const thread = new Worker(`(${workerQueueThread})(${workerFactory})`, {
          eval: true,
          workerData,
        });

        return new Promise<void>((resolve, reject) => {
          thread.on('message', (message: WorkerThreadMessage) => {
            if (message.type === 'start' || message.type === 'result') {
              if (message.type === 'result') {
                results[message.index] = message.result as TResult;
              }
              const { value, done } = iterator.next();
              if (done) {
                thread.postMessage({ type: 'done' });
              } else {
                thread.postMessage({
                  type: 'item',
                  index: itemIndex,
                  item: value,
                });
                itemIndex += 1;
              }
            } else if (message.type === 'error') {
              const error = new Error(message.error.message);
              error.name = message.error.name;
              error.stack = message.error.stack;
              reject(error);
            }
          });

          thread.on('error', reject);
          thread.on('exit', (code: number) => {
            if (code !== 0) {
              reject(new Error(`Worker thread exited with code ${code}`));
            } else {
              resolve();
            }
          });
        });
      }),
  );

  return results;
}

/* istanbul ignore next */
function workerQueueThread(
  workerFuncFactory: (
    data: unknown,
  ) => Promise<(item: unknown) => Promise<unknown>>,
) {
  const { parentPort, workerData } = require('node:worker_threads');

  Promise.resolve()
    .then(() => workerFuncFactory(workerData))
    .then(
      workerFunc => {
        parentPort.on('message', async (message: WorkerThreadMessage) => {
          if (message.type === 'done') {
            parentPort.close();
            return;
          }
          if (message.type === 'item') {
            try {
              const result = await workerFunc(message.item);
              parentPort.postMessage({
                type: 'result',
                index: message.index,
                result,
              });
            } catch (error) {
              parentPort.postMessage({ type: 'error', error });
            }
          }
        });

        parentPort.postMessage({ type: 'start' });
      },
      error => parentPort.postMessage({ type: 'error', error }),
    );
}
