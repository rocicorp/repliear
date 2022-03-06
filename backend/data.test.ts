import { expect } from "chai";
import { boolean } from "fp-ts";
import { setup, test } from "mocha";
import { JSONValue } from "replicache";
import { z } from "zod";
import { createDatabase, delEntry, getEntry, putEntry } from "./data";
import { withExecutor } from "./pg";

setup(async () => {
  // TODO: This is a very expensive way to unit test :).
  // Is there an in-memory postgres or something?
  await createDatabase();
});

test("getEntry", async () => {
  type Case = {
    name: string;
    exists: boolean;
    deleted: boolean;
    validJSON: boolean;
  };
  const cases: Case[] = [
    {
      name: "does not exist",
      exists: false,
      deleted: false,
      validJSON: false,
    },
    {
      name: "exists, deleted",
      exists: true,
      deleted: true,
      validJSON: true,
    },
    {
      name: "exists, not deleted, invalid JSON",
      exists: true,
      deleted: false,
      validJSON: false,
    },
    {
      name: "exists, not deleted, valid JSON",
      exists: true,
      deleted: false,
      validJSON: true,
    },
  ];

  await withExecutor(async (executor) => {
    for (const c of cases) {
      await executor(`delete from entry where spaceid = 's1' and key = 'foo'`);
      if (c.exists) {
        await executor(
          `insert into entry (spaceid, key, value, deleted, version, lastmodified) values ('s1', 'foo', $1, $2, 1, now())`,
          [c.validJSON ? JSON.stringify(42) : "not json", c.deleted]
        );
      }

      const promise = getEntry(executor, "s1", "foo");
      let result: JSONValue | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let error: any | undefined;
      await promise.then(
        (r) => (result = r),
        (e) => (error = String(e))
      );
      if (!c.exists) {
        expect(result, c.name).undefined;
        expect(error, c.name).undefined;
      } else if (c.deleted) {
        expect(result, c.name).undefined;
        expect(error, c.name).undefined;
      } else if (!c.validJSON) {
        expect(result, c.name).undefined;
        expect(error, c.name).contains("SyntaxError");
      } else {
        expect(result, c.name).eq(42);
        expect(error, c.name).undefined;
      }
    }
  });
});

test("getEntry RoundTrip types", async () => {
  await withExecutor(async (executor) => {
    await putEntry(executor, "s1", "boolean", true, 1);
    await putEntry(executor, "s1", "number", 42, 1);
    await putEntry(executor, "s1", "string", "foo", 1);
    await putEntry(executor, "s1", "array", [1, 2, 3], 1);
    await putEntry(executor, "s1", "object", { a: 1, b: 2 }, 1);

    expect(await getEntry(executor, "s1", "boolean")).eq(true);
    expect(await getEntry(executor, "s1", "number")).eq(42);
    expect(await getEntry(executor, "s1", "string")).eq("foo");
    expect(await getEntry(executor, "s1", "array")).deep.equal([1, 2, 3]);
    expect(await getEntry(executor, "s1", "object")).deep.equal({ a: 1, b: 2 });
  });
});

test("putEntry", async () => {
  type Case = {
    name: string;
    duplicate: boolean;
    deleted: boolean;
  };

  const cases: Case[] = [
    {
      name: "not duplicate",
      duplicate: false,
      deleted: false,
    },
    {
      name: "duplicate",
      duplicate: true,
      deleted: false,
    },
    {
      name: "deleted",
      duplicate: true,
      deleted: true,
    },
  ];

  await withExecutor(async (executor) => {
    for (const c of cases) {
      await executor(`delete from entry where spaceid = 's1' and key = 'foo'`);

      let res: Promise<void>;
      if (c.duplicate) {
        await putEntry(executor, "s1", "foo", 41, 1);
        if (c.deleted) {
          await delEntry(executor, "s1", "foo", 1);
        }
      }
      res = putEntry(executor, "s1", "foo", 42, 2);

      await res.catch(() => ({}));

      const qr = await executor(
        `select spaceid, key, value, deleted, version
        from entry where spaceid = 's1' and key = 'foo'`
      );
      const [row] = qr.rows;

      expect(row, c.name).not.undefined;
      const { spaceid, key, value, deleted, version } = row;
      expect(spaceid, c.name).eq("s1");
      expect(key, c.name).eq("foo");
      expect(value, c.name).eq("42");
      expect(deleted, c.name).false;
      expect(version, c.name).eq(2);
    }
  });
});

test("delEntry", async () => {
  type Case = {
    name: string;
    exists: boolean;
  };
  const cases: Case[] = [
    {
      name: "does not exist",
      exists: false,
    },
    {
      name: "exists",
      exists: true,
    },
  ];
  for (const c of cases) {
    await withExecutor(async (executor) => {
      await executor(`delete from entry where spaceid = 's1' and key = 'foo'`);
      if (c.exists) {
        await executor(
          `insert into entry (spaceid, key, value, deleted, version, lastmodified) values ('s1', 'foo', '42', false, 1, now())`
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let error: any | undefined;
      await delEntry(executor, "s1", "foo", 2).catch(
        (e) => (error = String(e))
      );

      const qr = await executor(
        `select spaceid, key, value, deleted, version from entry where spaceid = 's1' and key = 'foo'`
      );
      const [row] = qr.rows;

      if (c.exists) {
        expect(row, c.name).not.undefined;
        const { spaceid, key, value, deleted, version } = row;
        expect(spaceid, c.name).eq("s1");
        expect(key, c.name).eq("foo");
        expect(value, c.name).eq("42");
        expect(deleted, c.name).true;
        expect(version, c.name).eq(2);
      } else {
        expect(row, c.name).undefined;
        expect(error, c.name).undefined;
      }
    });
  }
});
