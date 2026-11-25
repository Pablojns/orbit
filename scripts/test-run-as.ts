import assert from "node:assert/strict";
import { runAs, runAsUser } from "../src/lib/run-as";
assert.equal(runAsUser(), null);
(async () => {
  const seen = await Promise.all(
    ["a", "b", "c"].map((id) =>
      runAs(id, async () => {
        await new Promise((r) => setTimeout(r, Math.random() * 20));
        return runAsUser();
      }),
    ),
  );
  assert.deepEqual(seen, ["a", "b", "c"]); // cada tarefa vê só a própria pessoa, mesmo em paralelo
  assert.equal(runAsUser(), null);
  console.log("test-run-as (avisos por pessoa): ok");
})();
