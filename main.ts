import { App, staticFiles } from "fresh";
import { define, type State } from "./lib/utils.ts";

export const app = new App<State>();

app.use(staticFiles());

// Pass a shared value from a middleware
app.use(async (ctx) => {
  ctx.state.shared = "hello";

  // 1. Await the response from the server
  const resp = await ctx.next();

  return resp;
});

// this is the same as the /api/:name route defined via a file. feel free to delete this!
app.get("/api2/:name", (ctx) => {
  const name = ctx.params.name;
  return new Response(
    `Hello, ${name.charAt(0).toUpperCase() + name.slice(1)}!`,
  );
});

// this can also be defined via a file. feel free to delete this!
const exampleLoggerMiddleware = define.middleware((ctx) => {
  console.log(`${ctx.req.method} ${ctx.req.url}`);
  return ctx.next();
});
app.use(exampleLoggerMiddleware);

// Include file-system based routes here
app.fsRoutes();

// Provide a default export for Deno Deploy
// In Deno Deploy, the user should ideally configure the entrypoint to _fresh/server.js
// But if main.ts is used as the entrypoint, this will serve the compiled app.
export default {
  async fetch(req: Request, connInfo: any) {
    try {
      // Dynamically import the compiled server (bypassing static analysis)
      const serverFile = "./_fresh/server.js";
      const { default: server } = await import(serverFile);
      return server.fetch(req, connInfo);
    } catch {
      // Fallback to the uncompiled app handler
      return app.handler()(req, connInfo);
    }
  },
};
