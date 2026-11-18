// SPDX-License-Identifier: Hippocratic-3.0
// Unit-test stand-in for the `cloudflare:workers` runtime module (aliased in
// vitest.config.ts). worker.ts only needs WorkerEntrypoint as a base class.
export class WorkerEntrypoint<Env = unknown> {
  protected ctx: unknown;
  protected env: Env;
  constructor(ctx: unknown, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }
}
