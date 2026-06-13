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

import {
  OpaqueCliModule,
  OpaqueCommandLeafNode,
  OpaqueCommandTreeNode,
  isCommandNodeHidden,
} from '@internal/cli';
import type { CommandNode } from '@internal/cli';
import { ForwardedError, isError, stringifyError } from '@backstage/errors';
import chalk from 'chalk';
import { Command } from 'commander';
import { CommandGraph } from './CommandGraph';
import type { CliModule } from './types';

function exit(message: string, code: number = 1): never {
  process.stderr.write(`\n${chalk.red(message)}\n\n`);
  process.exit(code);
}

function exitWithError(error: unknown): never {
  if (!isError(error)) {
    return exit(stringifyError(error));
  }

  switch (error.name) {
    case 'InputError':
      return exit(error.message, 74 /* input/output error */);
    case 'NotFoundError':
      return exit(error.message, 127 /* command not found */);
    case 'NotImplementedError':
      return exit(error.message, 64 /* command line usage error */);
    case 'AuthenticationError':
    case 'NotAllowedError':
      return exit(error.message, 77 /* permission denied */);
    case 'ExitCodeError':
      return exit(
        error.message,
        'code' in error && typeof error.code === 'number' ? error.code : 1,
      );
    default:
      return exit(
        stringifyError(error),
        'code' in error && typeof error.code === 'number' ? error.code : 1,
      );
  }
}

function registerCommands(
  graph: ReadonlyArray<CommandNode>,
  program: Command,
  programName: string,
): void {
  const queue = graph.map(node => ({ node, argParser: program }));

  while (queue.length) {
    const { node, argParser } = queue.shift()!;

    if (OpaqueCommandTreeNode.isType(node)) {
      const internal = OpaqueCommandTreeNode.toInternal(node);
      const treeParser = argParser
        .command(`${internal.name} [command]`, {
          hidden: isCommandNodeHidden(node),
        })
        .description(internal.name);

      queue.push(
        ...internal.children.map(child => ({
          node: child,
          argParser: treeParser,
        })),
      );
    } else {
      const internal = OpaqueCommandLeafNode.toInternal(node);
      argParser
        .command(internal.name, {
          hidden:
            !!internal.command.deprecated || !!internal.command.experimental,
        })
        .description(internal.command.description)
        .helpOption(false)
        .allowUnknownOption(true)
        .allowExcessArguments(true)
        .action(async () => {
          try {
            const args = program.parseOptions(process.argv);

            const nonProcessArgs = args.operands.slice(2);
            const positionalArgs = [];
            let index = 0;
            for (
              let argIndex = 0;
              argIndex < nonProcessArgs.length;
              argIndex++
            ) {
              if (
                argIndex === index &&
                internal.command.path[argIndex] === nonProcessArgs[argIndex]
              ) {
                index += 1;
                continue;
              }
              positionalArgs.push(nonProcessArgs[argIndex]);
            }
            const context = {
              args: [...positionalArgs, ...args.unknown],
              info: {
                usage: [programName, ...internal.command.path].join(' '),
                name: internal.command.path.join(' '),
              },
            };

            if (typeof internal.command.execute === 'function') {
              await internal.command.execute(context);
            } else {
              const mod = await internal.command.execute.loader();
              const fn =
                typeof mod.default === 'function'
                  ? mod.default
                  : (mod.default as any).default;
              await fn(context);
            }
            process.exit(0);
          } catch (error: unknown) {
            exitWithError(error);
          }
        });
    }
  }
}

/**
 * Runs a collection of CLI modules as an executable program.
 *
 * This is intended for creating custom CLI packages from a fixed set of
 * directly imported modules. Module discovery and override behavior are left
 * to the caller.
 *
 * @example
 * ```ts
 * import { runCli } from '@backstage/cli-node';
 * import buildModule from '@backstage/cli-module-build';
 * import testModule from '@backstage/cli-module-test-jest';
 * import packageJson from '../package.json';
 *
 * runCli({
 *   modules: [buildModule, testModule],
 *   name: packageJson.name,
 *   version: packageJson.version,
 * });
 * ```
 *
 * @public
 */
export async function runCli(options: {
  /** The CLI modules whose commands are included in the program. */
  modules: ReadonlyArray<CliModule>;
  /** The program name shown in help output and usage strings. */
  name: string;
  /** The version string shown when `--version` is passed. */
  version?: string;
}): Promise<void> {
  const { modules, name, version } = options;
  const graph = new CommandGraph();

  for (const module of modules) {
    if (!OpaqueCliModule.isType(module)) {
      throw new Error(
        `Invalid CLI module: expected a module created with createCliModule`,
      );
    }

    for (const command of await OpaqueCliModule.toInternal(module).commands) {
      graph.add(command, module);
    }
  }

  const program = new Command();
  program.name(name).allowUnknownOption(true).allowExcessArguments(true);

  if (version) {
    program.version(version);
  }

  registerCommands(graph.roots, program, name);

  program.on('command:*', () => {
    console.log();
    console.log(chalk.red(`Invalid command: ${program.args.join(' ')}`));
    console.log();
    program.outputHelp();
    process.exit(1);
  });

  process.on('unhandledRejection', rejection => {
    exitWithError(new ForwardedError('Unhandled rejection', rejection));
  });

  await program.parseAsync(process.argv);
}
