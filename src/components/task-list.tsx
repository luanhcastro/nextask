'use client';

import type { inferRouterOutputs } from '@trpc/server';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { TaskNotice } from '@/components/task-notice';
import { trpc } from '@/trpc/client';
import type { AppRouter } from '@/trpc/router';

type TaskPage = inferRouterOutputs<AppRouter>['task']['list'];
type Task = TaskPage['items'][number];

const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

export function TaskList({ initialPage, notice }: { initialPage: TaskPage; notice?: string }) {
  const router = useRouter();
  const sentinel = useRef<HTMLDivElement>(null);
  const deletedIds = useRef(new Set<string>());
  const [loaded, setLoaded] = useState<TaskPage>();
  const [request, setRequest] = useState<{ cursor: string; status: 'loading' | 'error' }>();
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task>();
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string>();
  const [feedback, setFeedback] = useState<{ message: string; error?: boolean } | null>();
  const message = feedback === undefined ? notice : feedback?.message;
  // Once pagination starts, an exhausted cursor must not fall back to the first page's cursor.
  const cursor = loaded ? loaded.nextCursor : initialPage.nextCursor;
  const pageStatus = request?.cursor === cursor ? request?.status : undefined;
  const pageFailed = pageStatus === 'error';

  // A refresh can move a previously loaded task into the first page.
  const initialIds = new Set(initialPage.items.map((task) => task.id));
  const tasks = [
    ...initialPage.items,
    ...(loaded?.items.filter((task) => !initialIds.has(task.id)) ?? []),
  ];

  useEffect(() => {
    const target = sentinel.current;
    if (!target || !cursor || pageFailed) return;

    const controller = new AbortController();
    // Guard queued observer callbacks before React has rendered the loading state.
    let requested = false;
    const observer = new IntersectionObserver(
      async (entries) => {
        if (
          requested ||
          controller.signal.aborted ||
          !entries.some((entry) => entry.isIntersecting)
        ) {
          return;
        }
        requested = true;
        observer.disconnect();
        setRequest({ cursor, status: 'loading' });

        try {
          const page = await trpc.task.list.query(
            { limit: 10, cursor },
            { signal: controller.signal },
          );
          if (controller.signal.aborted) return;

          const items = page.items.filter((task) => !deletedIds.current.has(task.id));
          setLoaded((previous) => {
            const seen = new Set(previous?.items.map((task) => task.id));
            return {
              items: [...(previous?.items ?? []), ...items.filter((task) => !seen.has(task.id))],
              nextCursor: page.nextCursor,
            };
          });
          setRequest(undefined);
        } catch {
          if (!controller.signal.aborted) setRequest({ cursor, status: 'error' });
        }
      },
      { rootMargin: '0px 0px 160px' },
    );
    observer.observe(target);

    return () => {
      observer.disconnect();
      // A response from an old cursor or a page the user left must not append tasks.
      controller.abort();
    };
  }, [cursor, pageFailed]);

  function deleteTask(task: Task) {
    if (isPending) return;

    setDeletingId(task.id);
    setFeedback(null);
    startTransition(async () => {
      try {
        await trpc.task.delete.mutate({ id: task.id });
        // An in-flight page can still contain this task, but its cursor remains valid.
        deletedIds.current.add(task.id);
        setLoaded(
          (page) => page && { ...page, items: page.items.filter((item) => item.id !== task.id) },
        );
        router.refresh();
        setFeedback({ message: 'Task deleted successfully.' });
      } catch {
        setFeedback({ message: 'Could not delete the task. Please try again.', error: true });
      }
    });
  }

  return (
    <>
      <p className="sr-only" role="status">
        {isPending ? 'Deleting task…' : ''}
      </p>
      {!isPending && message && (
        <TaskNotice
          message={message}
          error={feedback?.error}
          onDismiss={() => {
            setFeedback(null);
            // Clear the save marker so a reload does not bring back the dismissed notice.
            if (notice) window.history.replaceState(null, '', '/');
          }}
        />
      )}
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
                    onClick={() => {
                      setTaskToDelete(task);
                      deleteDialog.current?.showModal();
                    }}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {cursor && (
        <div ref={sentinel} className="task-pagination">
          {pageFailed ? (
            <>
              <p className="feedback feedback-error" role="alert">
                Could not load more tasks.
              </p>
              <button className="button" type="button" onClick={() => setRequest(undefined)}>
                Retry
              </button>
            </>
          ) : (
            <p className="feedback" role="status">
              {pageStatus === 'loading' ? 'Loading more tasks…' : ''}
            </p>
          )}
        </div>
      )}
      <dialog
        ref={deleteDialog}
        className="task-dialog"
        aria-labelledby="delete-task-title"
        aria-describedby="delete-task-description"
      >
        <h2 id="delete-task-title">Delete task?</h2>
        <p id="delete-task-description">“{taskToDelete?.title}” will be permanently deleted.</p>
        <div className="form-actions">
          <button className="button" type="button" onClick={() => deleteDialog.current?.close()}>
            Cancel
          </button>
          <button
            className="button button-danger"
            type="button"
            onClick={() => {
              deleteDialog.current?.close();
              if (taskToDelete) deleteTask(taskToDelete);
            }}
          >
            Delete task
          </button>
        </div>
      </dialog>
    </>
  );
}
