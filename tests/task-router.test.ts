import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { afterEach, test } from 'node:test';

import { appRouter } from '../src/trpc/router';

const { task } = appRouter.createCaller({});

afterEach(async () => {
  const { items } = await task.list({ limit: Number.MAX_SAFE_INTEGER });
  await Promise.all(items.map(({ id }) => task.delete({ id })));
});

test('creates, reads, updates, and deletes a task', async () => {
  const created = await task.create({ title: '  Draft README  ', description: 'First draft' });
  assert.equal(created.title, 'Draft README');
  assert.ok(Number.isFinite(Date.parse(created.createdAt)));
  assert.deepEqual(await task.getById({ id: created.id }), created);

  const updated = await task.update({
    id: created.id,
    title: 'Publish README',
    description: 'Final draft',
  });
  assert.deepEqual(updated, { ...created, title: 'Publish README', description: 'Final draft' });
  assert.deepEqual(await task.getById({ id: created.id }), updated);
  assert.deepEqual(await task.delete({ id: created.id }), updated);
  await assert.rejects(task.getById({ id: created.id }), { code: 'NOT_FOUND' });
});

test('returns NOT_FOUND when reading, updating, or deleting a missing task', async () => {
  const id = randomUUID();

  await assert.rejects(task.getById({ id }), { code: 'NOT_FOUND' });
  await assert.rejects(task.update({ id, title: 'Missing' }), { code: 'NOT_FOUND' });
  await assert.rejects(task.delete({ id }), { code: 'NOT_FOUND' });
});

test('supports missing descriptions and preserves omitted fields on partial updates', async () => {
  const created = await task.create({ title: 'Draft' });
  assert.equal(created.description, undefined);

  const described = await task.update({ id: created.id, description: 'Notes' });
  assert.deepEqual(described, { ...created, description: 'Notes' });

  const renamed = await task.update({ id: created.id, title: '  Edited  ' });
  assert.deepEqual(renamed, { ...described, title: 'Edited' });
  assert.deepEqual(await task.update({ id: created.id, description: '' }), {
    ...renamed,
    description: '',
  });
});

test('rejects blank titles and malformed task input', async () => {
  const { id } = await task.create({ title: 'Keep this task' });

  for (const title of ['', ' \t ']) {
    await assert.rejects(task.create({ title }), { code: 'BAD_REQUEST' });
    await assert.rejects(task.update({ id, title }), { code: 'BAD_REQUEST' });
  }

  for (const input of [
    null,
    {},
    { title: 1 },
    { title: 'Valid', description: null },
    { title: 'Valid', extra: true },
  ]) {
    // @ts-expect-error Send malformed input to exercise runtime validation.
    await assert.rejects(task.create(input), { code: 'BAD_REQUEST' });
  }

  await assert.rejects(task.getById({ id: 'invalid' }), { code: 'BAD_REQUEST' });
  await assert.rejects(task.update({ id: 'invalid', title: 'Valid' }), { code: 'BAD_REQUEST' });
  await assert.rejects(task.delete({ id: 'invalid' }), { code: 'BAD_REQUEST' });
  assert.equal((await task.getById({ id })).title, 'Keep this task');
});

test('validates page inputs and omits the cursor for an empty store', async () => {
  assert.deepEqual(await task.list(), { items: [] });

  for (const limit of [0, -1, 1.5]) {
    await assert.rejects(task.list({ limit }), { code: 'BAD_REQUEST' });
  }
  await assert.rejects(task.list({ cursor: 'invalid' }), { code: 'BAD_REQUEST' });
});

test('walks the default pages newest first and breaks timestamp ties by ID', async (context) => {
  let createdAt = '2026-01-01T00:00:00.000Z';
  context.mock.method(Date.prototype, 'toISOString', () => createdAt);
  const older = await task.create({ title: 'Oldest' });
  createdAt = '2026-01-02T00:00:00.000Z';
  const newer = await Promise.all(
    Array.from({ length: 22 }, (_, index) => task.create({ title: `Task ${index + 1}` })),
  );
  newer.sort((a, b) => b.id.localeCompare(a.id));
  const expected = [...newer, older];

  const first = await task.list();
  assert.deepEqual(first.items, expected.slice(0, 10));
  assert.ok(first.nextCursor);

  const second = await task.list({ cursor: first.nextCursor });
  assert.deepEqual(second.items, expected.slice(10, 20));
  assert.ok(second.nextCursor);

  assert.deepEqual(await task.list({ cursor: second.nextCursor }), {
    items: expected.slice(20),
  });
});

test('resumes after deleting a boundary task and ends on an exact-size page', async () => {
  await Promise.all(
    Array.from({ length: 4 }, (_, index) => task.create({ title: `Task ${index}` })),
  );
  const { items } = await task.list();
  const first = await task.list({ limit: 2 });
  assert.deepEqual(first.items, items.slice(0, 2));
  assert.ok(first.nextCursor);
  await task.delete({ id: first.items[1].id });

  assert.deepEqual(await task.list({ limit: 2, cursor: first.nextCursor }), {
    items: items.slice(2),
  });
});
