import { createTRPCClient, httpLink } from '@trpc/client';

import type { AppRouter } from './router';

export const trpc = createTRPCClient<AppRouter>({
  links: [httpLink({ url: '/api/trpc' })],
});
