import { ReplicacheTransaction } from "./replicache-transaction";
import { expect } from "chai";
import { test, setup } from "mocha";
import { transact, withExecutor } from "./pg";
import { createDatabase, getEntry } from "./data";

setup(async () => {
  await transact((executor) => createDatabase(executor));
});

test("ReplicacheTransaction", async () => {
  await withExecutor(async (executor) => {
    const t1 = new ReplicacheTransaction(executor, "s1", "c1", 1);

    expect(t1.clientID).equal("c1");
    expect(await t1.has("foo")).false;
    expect(await t1.get("foo")).undefined;

    await t1.put("foo", "bar");
    expect(await t1.has("foo")).true;
    expect(await t1.get("foo")).equal("bar");

    await t1.flush();

    expect(await getEntry(executor, "s1", "foo")).equal("bar");

    const t2 = new ReplicacheTransaction(executor, "s1", "c1", 2);
    await t2.del("foo");
    await t2.flush();

    expect(await getEntry(executor, "s1", "foo")).equal(undefined);
    const qr = await executor(
      `select value, deleted, version
      from entry where spaceid = 's1' and key = 'foo'`
    );
    const [row] = qr.rows;
    expect(row).deep.equal({
      value: `"bar"`,
      deleted: true,
      version: 2,
    });
  });
});

test("ReplicacheTransaction overlap", async () => {
  await withExecutor(async (executor) => {
    const t1 = new ReplicacheTransaction(executor, "s1", "c1", 1);
    await t1.put("foo", "bar");

    const t2 = new ReplicacheTransaction(executor, "s1", "c1", 1);
    expect(await t2.has("foo")).false;

    await t1.flush();
    expect(await t2.has("foo")).false;

    const t3 = new ReplicacheTransaction(executor, "s1", "c1", 1);
    expect(await t3.has("foo")).true;
  });
});
