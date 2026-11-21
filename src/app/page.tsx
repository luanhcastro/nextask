import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';

import { TaskList } from '@/components/task-list';
import { appRouter } from '@/trpc/router';

// Read the in-memory store on each request so the list stays fresh after mutations.
export const dynamic = 'force-dynamic';

// Load the first page for the initial HTML and leave delete interactions to TaskList.
async function Tasks({ notice }: { notice?: string }) {
  const { items } = await appRouter.createCaller({}).task.list({ limit: 10 });
  return <TaskList tasks={items} notice={notice} />;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ task?: string | string[] }>;
}) {
  const { task } = await searchParams;
  const notice =
    task === 'created' ? 'Task created.' : task === 'updated' ? 'Task updated.' : undefined;

  return (
    <main className="workspace">
      <Image className="wordmark" src="/logo.png" alt="NexTask" width={468} height={156} />
      <div className="page-heading">
        <h1>Tasks</h1>
        <Link className="button button-primary" href="/tasks/new">
          <span aria-hidden="true">+</span> New Task
        </Link>
      </div>
      <Suspense
        fallback={
          <p className="task-panel panel-message" role="status">
            Loading tasks…
          </p>
        }
      >
        <Tasks notice={notice} />
      </Suspense>
    </main>
  );
}
