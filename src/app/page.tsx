import Image from 'next/image';
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
    <main className="workspace">
      <Image className="wordmark" src="/logo.png" alt="NexTask" width={468} height={156} />
      <div className="page-heading">
        <h1>Tasks</h1>
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
  );
}
