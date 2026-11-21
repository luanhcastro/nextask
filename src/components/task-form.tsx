'use client';

import type { inferRouterOutputs } from '@trpc/server';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type FormEvent, useRef, useState } from 'react';

import { trpc } from '@/trpc/client';
import type { AppRouter } from '@/trpc/router';

type Task = inferRouterOutputs<AppRouter>['task']['getById'];

export function TaskForm({ task }: { task?: Task }) {
  const router = useRouter();
  const titleInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [titleError, setTitleError] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const heading = task ? 'Edit Task' : 'New Task';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    setSubmitError(false);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError(true);
      titleInput.current?.focus();
      return;
    }

    setIsPending(true);
    try {
      if (task) {
        await trpc.task.update.mutate({ id: task.id, title: trimmedTitle, description });
      } else {
        await trpc.task.create.mutate({
          title: trimmedTitle,
          description: description || undefined,
        });
      }
    } catch {
      setSubmitError(true);
      setIsPending(false);
      return;
    }

    router.replace(task ? '/?task=updated' : '/?task=created');
    // The HTTP mutation happens outside Next.js, so refresh any cached list after navigating.
    router.refresh();
  }

  return (
    <main className="workspace form-workspace">
      <Image className="wordmark" src="/logo.png" alt="NexTask" width={288} height={96} />
      <div className="page-heading">
        <h1>{heading}</h1>
      </div>
      <form className="task-panel task-form" onSubmit={submit} noValidate aria-label={heading}>
        <div className="form-field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            ref={titleInput}
            required
            value={title}
            readOnly={isPending}
            aria-invalid={titleError}
            aria-describedby={titleError ? 'title-error' : undefined}
            onChange={(event) => {
              setTitle(event.target.value);
              if (event.target.value.trim()) setTitleError(false);
            }}
          />
          {titleError && (
            <p id="title-error" className="feedback feedback-error" role="alert">
              Enter a task title.
            </p>
          )}
        </div>
        <div className="form-field">
          <label htmlFor="description">
            Description <span>(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={description}
            readOnly={isPending}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        {submitError && (
          <p className="feedback feedback-error" role="alert">
            Could not save the task. Try again.
          </p>
        )}
        <div className="form-actions">
          <button
            className="button"
            type="button"
            disabled={isPending}
            onClick={() => router.push('/')}
          >
            Cancel
          </button>
          <button className="button button-primary" type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : task ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
        <p className="sr-only" role="status">
          {isPending ? 'Saving task…' : ''}
        </p>
      </form>
    </main>
  );
}
