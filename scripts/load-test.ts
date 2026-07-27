import { runReliabilityLoadTest } from "../packages/db/src/services/load-test.js";

if (process.env.RUN_LOAD_TEST === "true") {
  runReliabilityLoadTest(5, 40)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Load test failed:", err);
      process.exit(1);
    });
}

export { runReliabilityLoadTest };
