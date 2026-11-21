import { z } from 'zod';

import { t } from './init';

export const appRouter = t.router({
  hello: t.procedure.input(z.object({ name: z.string().trim().min(1) })).query(({ input }) => ({
    message: `Hello, ${input.name}!`,
  })),
});

export type AppRouter = typeof appRouter;
