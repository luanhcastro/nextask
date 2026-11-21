import { z } from 'zod';

import { t } from './init';
import { taskRouter } from './task-router';

export const appRouter = t.router({
  task: taskRouter,
  hello: t.procedure.input(z.object({ name: z.string().trim().min(1) })).query(({ input }) => ({
    message: `Hello, ${input.name}!`,
  })),
});

export type AppRouter = typeof appRouter;
