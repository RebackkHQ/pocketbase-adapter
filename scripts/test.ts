import { spawn } from "node:child_process";

async function runTests(
  nodeOptions: string[] = [],
  program = "node",
  programOptions: string[] = [],
  env: Record<string, string> = {}
): Promise<void> {
  const time = Date.now();

  return new Promise<void>((resolve, reject) => {
    const pocketBaseBinary = `${process.cwd()}/pocketbase/pocketbase`;
    const pocketBaseProcess = spawn(
      "chmod",
      ["+x", pocketBaseBinary, `&& ${pocketBaseBinary} serve`],
      { stdio: "inherit", env: { ...process.env, ...env }, shell: true }
    );

    pocketBaseProcess.on("error", (err) => {
      reject(`🚨 PocketBase failed to start: ${err.message}`);
    });

    pocketBaseProcess.on("close", (code) => {
      if (code !== 0) {
        reject(
          `🚨 PocketBase failed with code ${code} in ${Date.now() - time}ms`
        );
      }
    });

    const nodeProcess = spawn(
      program,
      [
        ...programOptions,
        "--disable-warning=ExperimentalWarning",
        "--experimental-strip-types",
        "--test",
        ...nodeOptions,
        "src/**/*.test.ts",
      ],
      { stdio: "inherit", env: { ...process.env, ...env } }
    );

    nodeProcess.on("close", (code) => {
      // Ensure PocketBase is killed after tests are done
      pocketBaseProcess.kill();

      if (code === 0) {
        resolve();
      } else {
        reject(`🚨 Tests failed with code ${code} in ${Date.now() - time}ms`);
      }
    });

    nodeProcess.on("error", (err) => {
      // Kill PocketBase if the Node process fails
      pocketBaseProcess.kill();
      reject(`🚨 Node process failed to start: ${err.message}`);
    });
  }).finally(() => {
    // Explicitly exit the process
    process.exit(0);
  });
}

if (process.argv[1] === import.meta.filename) {
  (async () => {
    try {
      if (process.argv[2] === "test") {
        await runTests();
      } else if (process.argv[2] === "test:watch") {
        await runTests(["--watch"]);
      } else if (process.argv[2] === "test:coverage") {
        await runTests(
          ["--experimental-test-coverage"],
          "c8",
          ["-r", "html", "node"],
          {
            NODE_V8_COVERAGE: "./coverage",
          }
        );
      }
    } catch (err) {
      console.error(err);
      process.exit(1); // Exit with error code if something goes wrong
    }
  })();
}
