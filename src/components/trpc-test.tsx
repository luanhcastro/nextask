'use client';

import { useEffect, useState } from 'react';

import { trpc } from '@/trpc/client';

export function TrpcTest() {
  const [message, setMessage] = useState('Loading greeting…');

  useEffect(() => {
    const controller = new AbortController();

    trpc.hello
      .query({ name: 'NexTask' }, { signal: controller.signal })
      .then(({ message }) => setMessage(message))
      .catch(() => {
        if (!controller.signal.aborted) {
          setMessage('Could not load the greeting.');
        }
      });

    return () => controller.abort();
  }, []);

  return <p role="status">{message}</p>;
}
