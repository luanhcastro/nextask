import { randomUUID } from 'node:crypto';

import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { t } from './init';

const taskId = z.uuidv4();
const byId = z.strictObject({ id: taskId });
const taskFields = z.strictObject({
  title: z.string().trim().min(1),
  description: z.string().optional(),
});
const cursorParts = z.tuple([z.iso.datetime({ precision: 3 }), taskId]);
const listInput = z
  .strictObject({
    limit: z.int().positive().optional(),
    cursor: z
      .string()
      .refine((cursor) => cursorParts.safeParse(cursor.split('|')).success)
      .optional(),
  })
  .optional();

type Task = z.infer<typeof taskFields> & { id: string; createdAt: string };

const processState = globalThis as typeof globalThis & { nextaskTasks?: Map<string, Task> };

// Separately bundled routes share this process-local store, even when Next.js recompiles them.
const tasks = (processState.nextaskTasks ??= new Map());

function getTask(id: string) {
  const task = tasks.get(id);
  if (!task) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' });
  }
  return task;
}

// ISO timestamps sort chronologically, and IDs break ties within a millisecond.
// Both values are in the cursor so it still works if the boundary task is deleted.
function taskCursor({ createdAt, id }: Task) {
  return `${createdAt}|${id}`;
}

export const taskRouter = t.router({
  list: t.procedure.input(listInput).query(({ input }) => {
    const { limit = 10, cursor } = input ?? {};
    // Read one extra task to tell whether another page exists.
    const page = [...tasks.values()]
      .filter((task) => cursor === undefined || taskCursor(task).localeCompare(cursor) < 0)
      .sort((a, b) => taskCursor(b).localeCompare(taskCursor(a)))
      .slice(0, limit + 1);

    return page.length > limit
      ? { items: page.slice(0, limit), nextCursor: taskCursor(page[limit - 1]) }
      : { items: page };
  }),
  getById: t.procedure.input(byId).query(({ input }) => getTask(input.id)),
  create: t.procedure.input(taskFields).mutation(({ input }) => {
    const task: Task = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    tasks.set(task.id, task);
    return task;
  }),
  update: t.procedure
    .input(taskFields.partial().extend(byId.shape))
    .mutation(({ input: { id, title, description } }) => {
      const task = getTask(id);
      const updated: Task = {
        ...task,
        title: title ?? task.title,
        description: description ?? task.description,
      };
      tasks.set(id, updated);
      return updated;
    }),
  delete: t.procedure.input(byId).mutation(({ input }) => {
    const task = getTask(input.id);
    tasks.delete(task.id);
    return task;
  }),
});
