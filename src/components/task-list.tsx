'use client';

import type { inferRouterOutputs } from '@trpc/server';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { trpc } from '@/trpc/client';
import type { AppRouter } from '@/trpc/router';

type Task = inferRouterOutputs<AppRouter>['task']['list']['items'][number];

const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

export function TaskList({ tasks, notice }: { tasks: Task[]; notice?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string>();
  const [feedback, setFeedback] = useState<{ message: string; error?: boolean }>();

  function deleteTask(task: Task) {
    if (isPending) return;

    setDeletingId(task.id);
    setFeedback(undefined);
    startTransition(async () => {
      try {
        await trpc.task.delete.mutate({ id: task.id });
        // Re-read the first page on the server so the next task can fill the gap.
        router.refresh();
        setFeedback({ message: 'Task deleted.' });
      } catch {
        setFeedback({ message: 'Could not delete the task. Try again.', error: true });
      }
    });
  }

  return (
    <>
      <p className="feedback" role="status">
        {isPending ? 'Deleting task…' : feedback?.error ? '' : (feedback?.message ?? notice)}
      </p>
      <p className="feedback feedback-error" role="alert">
        {!isPending && feedback?.error ? feedback.message : ''}
      </p>
      {tasks.length === 0 ? (
        <div className="task-panel panel-message">
          <span className="empty-icon" aria-hidden="true" />
          <h2>No tasks yet</h2>
          <p>Your tasks will appear here.</p>
        </div>
      ) : (
        <ul className="task-panel task-list" aria-label="Tasks">
          {tasks.map((task) => {
            const deleting = isPending && task.id === deletingId;

            return (
              <li key={task.id} className="task-row">
                <div className="task-details">
                  <h2>{task.title}</h2>
                  {task.description && <p>{task.description}</p>}
                  <time dateTime={task.createdAt}>
                    {dateFormat.format(new Date(task.createdAt))}
                  </time>
                </div>
                <div className="task-actions">
                  <Link
                    className="button"
                    href={`/tasks/${task.id}/edit`}
                    aria-label={`Edit ${task.title}`}
                    prefetch={false}
                  >
                    Edit
                  </Link>
                  <button
                    className="button button-danger"
                    type="button"
                    aria-label={deleting ? `Deleting ${task.title}` : `Delete ${task.title}`}
                    disabled={isPending}
                    onClick={() => deleteTask(task)}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
