import { Suspense } from 'react';

import { TaskList } from '@/components/task-list';
import { appRouter } from '@/trpc/router';

export const dynamic = 'force-dynamic';

async function Tasks() {
  const { items } = await appRouter.createCaller({}).task.list({ limit: 10 });
  return <TaskList tasks={items} />;
}

export default function Home() {
  return (
    <>
      <header className="masthead">
        <div className="shell wordmark">
          Nex<span>Task</span>
        </div>
      </header>
      <main className="shell workspace">
        <div className="page-heading">
          <div>
            <h1>Tasks</h1>
            <p>Up to 10 tasks, newest first</p>
          </div>
          <button className="button button-primary" type="button" disabled>
            <span aria-hidden="true">+</span> New Task
          </button>
        </div>
        <Suspense
          fallback={
            <p className="task-panel panel-message" role="status">
              Loading tasks…
            </p>
          }
        >
          <Tasks />
        </Suspense>
      </main>
    </>
  );
}
