// SPDX-License-Identifier: Hippocratic-3.0
// Types for the one piece of the Workers runtime module worker.ts uses. The
// project does not depend on @cloudflare/workers-types; this keeps editors and
// any type check of worker.ts honest without adding it.
declare module 'cloudflare:workers' {
  export class WorkerEntrypoint<Env = unknown> {
    protected ctx: unknown;
    protected env: Env;
    constructor(ctx: unknown, env: Env);
  }
}
