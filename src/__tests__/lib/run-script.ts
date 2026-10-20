/**
 * Run a check script as a child process and collect its output.
 *
 * `Bun.spawnSync` rather than `node:child_process`: the project runs on Bun,
 * and `process.execPath` is the Bun binary, so the spawned script runs on Bun
 * too — which is the point of these tests, since they assert on the behaviour
 * of the check scripts as the rest of the toolchain invokes them.
 *
 * The output of stdout and stderr is concatenated, because the check scripts
 * report findings on stderr and the tests assert on the combined text.
 */
export type ScriptResult = {
  /** The exit code. 0 means the check passed. */
  code: number;
  /** stdout and stderr, concatenated. */
  out: string;
};

export function runScript(
  args: string[],
  options: {
    cwd: string;
    env: Record<string, string | undefined>;
    /** Milliseconds before the child is killed. */
    timeout?: number;
  },
): ScriptResult {
  const result = Bun.spawnSync([process.execPath, ...args], {
    cwd: options.cwd,
    env: options.env,
    stdout: "pipe",
    stderr: "pipe",
    ...(options.timeout === undefined ? {} : { timeout: options.timeout }),
  });

  return {
    // A killed child (the `timeout` fired) reports no exit code. That is a
    // failure, so it is reported as one rather than as `null`.
    code: result.exitCode ?? 1,
    out: `${result.stdout?.toString() ?? ""}${result.stderr?.toString() ?? ""}`,
  };
}
