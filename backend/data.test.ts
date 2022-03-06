import { expect } from "chai";
import { boolean } from "fp-ts";
import { setup, test } from "mocha";
import { JSONValue } from "replicache";
import { z } from "zod";
import { createDatabase, delEntry, getEntry, putEntry } from "./data";
import { withExecutor } from "./pg";

setup(async () => {
  await withExecutor(async () => {
    // TODO: This is a very expensive way to unit test :).
    // Is there an in-memory postgres or something?
    await createDatabase();
  });
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

/*
test("getEntry RoundTrip types", async () => {
  await withExecutor(async (executor) => {
    await putEntry(executor, "s1", "boolean", true);
    await putEntry(executor, "s1", "number", 42);
    await putEntry(executor, "s1", "string", "foo");
    await putEntry(executor, "s1", "array", [1, 2, 3]);
    await putEntry(executor, "s1", "object", { a: 1, b: 2 });

    expect(await getEntry(executor, "s1", "boolean", z.boolean())).eq(true);
    expect(await getEntry(executor, "s1", "number", z.number())).eq(42);
    expect(await getEntry(executor, "s1", "string", z.string())).eq("foo");
    expect(
      await getEntry(executor, "s1", "array", z.array(z.number()))
    ).deep.equal([1, 2, 3]);
    expect(
      await getEntry(
        executor,
        "s1",
        "object",
        z.object({ a: z.number(), b: z.number() })
      )
    ).deep.equal({ a: 1, b: 2 });
  });
});

test("putEntry", async () => {
  type Case = {
    name: string;
    duplicate: boolean;
  };

  const cases: Case[] = [
    {
      name: "not duplicate",
      duplicate: false,
    },
    {
      name: "duplicate",
      duplicate: true,
    },
  ];

  await withExecutor(async (executor) => {
    for (const c of cases) {
      await executor(`delete from entry where spaceid = 's1' and key = 'foo'`);

      let res: Promise<void>;
      if (c.duplicate) {
        await putEntry(executor, "s1", "foo", 41);
        res = putEntry(executor, "s1", "foo", 42);
      } else {
        res = putEntry(executor, "s1", "foo", 42);
      }

      await res.catch(() => ({}));

      const qr = await executor(
        `select spaceid, key, value from entry where spaceid = 's1' and key = 'foo'`
      );
      const [row] = qr.rows;

      expect(row, c.name).not.undefined;
      const { spaceid, key, value } = row;
      expect(spaceid, c.name).eq("s1");
      expect(key, c.name).eq("foo");
      expect(value, c.name).eq(42);
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
          `insert into entry (spaceid, key, value, lastmodified) values ('s1', 'foo', '42', now())`
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let error: any | undefined;
      await delEntry(executor, "s1", "foo").catch((e) => (error = String(e)));

      const qr = await executor(
        `select spaceid, key, value from entry where spaceid = 's1' and key = 'foo'`
      );
      const [row] = qr.rows;

      expect(row, c.name).undefined;
      expect(error, c.name).undefined;
    });
  }
});
*/
