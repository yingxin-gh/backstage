/*
 * Copyright 2024 The Backstage Authors
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

import { spawnSync } from 'node:child_process';
import {
  openSync,
  closeSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Preload script that stubs process.stdout._handle when stdout is backed by a
// file (SyncWriteStream). Some CLI code accesses _handle.setBlocking directly
// and would crash without this.
const preloadContent = `
if (process.stdout && !process.stdout._handle) {
  process.stdout._handle = { setBlocking() {} };
}
`;

let preloadPath: string | undefined;

function getPreloadPath() {
  if (!preloadPath) {
    preloadPath = join(tmpdir(), `backstage-stdout-preload-${process.pid}.cjs`);
    writeFileSync(preloadPath, preloadContent);
    process.on('exit', () => {
      try {
        unlinkSync(preloadPath!);
      } catch {
        /* ignore */
      }
    });
  }
  return preloadPath;
}

/**
 * Redirect stdout to a temp file so that Node.js creates a SyncWriteStream
 * (synchronous writes) in the child instead of an async pipe stream. This
 * prevents data loss when child processes call process.exit() before the
 * async stream buffer has been flushed.
 */
export function createBinRunner(cwd: string, path: string) {
  return async (...command: string[]) => {
    const args = path ? [path, ...command] : command;
    const outPath = join(
      tmpdir(),
      `backstage-cli-out-${process.pid}-${Date.now()}.txt`,
    );
    const outFd = openSync(outPath, 'w');

    try {
      const result = spawnSync(
        'node',
        ['--require', getPreloadPath(), ...args],
        {
          cwd,
          stdio: ['ignore', outFd, 'pipe'],
          maxBuffer: 10 * 1024 * 1024,
        },
      );

      closeSync(outFd);
      const stdout = readFileSync(outPath, 'utf8');

      if (result.error) {
        throw new Error(`Process error: ${result.error.message}`);
      }

      const stderr = result.stderr?.toString() ?? '';

      if (result.signal) {
        throw new Error(
          `Process was killed with signal ${result.signal}\n${stderr}`,
        );
      } else if (result.status !== 0) {
        throw new Error(`Process exited with code ${result.status}\n${stderr}`);
      } else if (stderr.trim()) {
        throw new Error(`Command printed error output: ${stderr}`);
      }

      return stdout;
    } finally {
      try {
        unlinkSync(outPath);
      } catch {
        /* ignore cleanup errors */
      }
    }
  };
}
