/*
 * Copyright 2026 The Backstage Authors
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

import { Knex } from 'knex';
import { retryOnDeadlock } from './util';

function mockKnex(client: string): Knex {
  return { client: { config: { client } } } as unknown as Knex;
}

function pgDeadlockError(): Error & { code: string } {
  const err = new Error('deadlock detected') as Error & { code: string };
  err.code = '40P01';
  return err;
}

describe('retryOnDeadlock', () => {
  it('returns the result on success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await retryOnDeadlock(fn, mockKnex('pg'), 3, 1);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on PostgreSQL deadlock errors', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(pgDeadlockError())
      .mockRejectedValueOnce(pgDeadlockError())
      .mockResolvedValue('recovered');

    const result = await retryOnDeadlock(fn, mockKnex('pg'), 3, 1);
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting all retries', async () => {
    const fn = jest.fn().mockRejectedValue(pgDeadlockError());

    await expect(retryOnDeadlock(fn, mockKnex('pg'), 3, 1)).rejects.toThrow(
      'deadlock detected',
    );
    // 1 initial + 3 retries = 4 calls
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('does not retry non-deadlock errors on PostgreSQL', async () => {
    const err = new Error('something else');
    const fn = jest.fn().mockRejectedValue(err);

    await expect(retryOnDeadlock(fn, mockKnex('pg'), 3, 1)).rejects.toThrow(
      'something else',
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry deadlock-like errors on non-PostgreSQL engines', async () => {
    const fn = jest.fn().mockRejectedValue(pgDeadlockError());

    await expect(
      retryOnDeadlock(fn, mockKnex('better-sqlite3'), 3, 1),
    ).rejects.toThrow('deadlock detected');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('applies exponential backoff between retries', async () => {
    const timestamps: number[] = [];
    const fn = jest.fn().mockImplementation(async () => {
      timestamps.push(Date.now());
      if (timestamps.length <= 3) {
        throw pgDeadlockError();
      }
      return 'done';
    });

    const baseMs = 50;
    await retryOnDeadlock(fn, mockKnex('pg'), 3, baseMs);

    expect(fn).toHaveBeenCalledTimes(4);
    // Verify delays increase (with some tolerance for timing)
    const delay1 = timestamps[1] - timestamps[0];
    const delay2 = timestamps[2] - timestamps[1];
    const delay3 = timestamps[3] - timestamps[2];
    expect(delay1).toBeGreaterThanOrEqual(baseMs * 0.8);
    expect(delay2).toBeGreaterThanOrEqual(baseMs * 2 * 0.8);
    expect(delay3).toBeGreaterThanOrEqual(baseMs * 4 * 0.8);
  });

  it('defaults to 3 retries when not specified', async () => {
    const fn = jest.fn().mockRejectedValue(pgDeadlockError());

    await expect(retryOnDeadlock(fn, mockKnex('pg'))).rejects.toThrow(
      'deadlock detected',
    );
    expect(fn).toHaveBeenCalledTimes(4);
  });
});
