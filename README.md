# NexTask

NexTask is a lightweight task manager built with Next.js 15, React 19, TypeScript, tRPC v11, Zod, and plain CSS. You can create, edit, and delete tasks and browse older tasks through infinite scroll.

## Run locally

Use Node.js 22.13 or newer in the Node.js 22 release line, and npm. The full supported Node.js ranges are listed in [package.json](package.json).

```sh
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Local setup requires only Node.js and npm.

For a production-style run, stop the development server, then run:

```sh
npm run build
npm start
```

## Checks

```sh
npm test
npm run lint
npm run format:check
npm run build
npm run typecheck
```

`npm test` compiles the TypeScript test suite and its server imports to the ignored `build/test/` directory, then runs Node.js's built-in test runner. The tests use the real tRPC caller in their own process and cover CRUD, validation, ordering, and cursor boundaries. Use `npm run format` to apply Prettier formatting.

For a browser smoke test, create at least 12 tasks, edit one, confirm a deletion, and scroll past the first page. Check that the list updates after each change and that scrolling stops after the final page.

## How it works

- **Pages.** `src/app/` defines the task list, create and edit routes, and the tRPC HTTP endpoint. The list and edit routes read task data on the server through the tRPC caller.
- **Interactions.** `src/components/` contains the shared create/edit form, delete confirmation, and feedback. A native `IntersectionObserver` requests additional pages only as the user approaches the end of the loaded list.
- **Data.** `src/trpc/` defines the router and typed client. Zod validates inputs on the server. The list starts with up to 10 tasks and uses the creation timestamp and ID as its cursor so paging can continue after a boundary task is deleted.

Tasks are stored in one in-memory map per server process. Restarting the server clears all tasks, and separate server processes hold separate lists.
