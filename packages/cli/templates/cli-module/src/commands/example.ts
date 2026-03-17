import { cli } from 'cleye';
import type { CliCommandContext } from '@backstage/cli-node';

export default async ({ args, info }: CliCommandContext) => {
  const { flags } = cli(
    {
      help: info,
      booleanFlagNegation: true,
      flags: {},
    },
    undefined,
    args,
  );

  void flags;

  console.log('Hello from example command!');
};
