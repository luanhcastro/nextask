import { TRPCError } from '@trpc/server';
import { notFound } from 'next/navigation';

import { TaskForm } from '@/components/task-form';
import { appRouter } from '@/trpc/router';

export const dynamic = 'force-dynamic';

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // Load the task on the server so the form starts filled in and missing tasks can return a 404.
    const task = await appRouter.createCaller({}).task.getById({ id });
    return <TaskForm key={task.id} task={task} />;
  } catch (error) {
    if (
      error instanceof TRPCError &&
      (error.code === 'NOT_FOUND' || error.code === 'BAD_REQUEST')
    ) {
      notFound();
    }
    throw error;
  }
}
