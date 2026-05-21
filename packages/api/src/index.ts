import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import rules from "./routes/rules";
import { startWatcher } from "./lib/watcher";

const app = new Hono();
app.use("*", cors());

app.get("/", (c) =>
  c.json({ ok: true, service: "kitealerts", version: "0.1.0" })
);

app.route("/rules", rules);

const port = Number(process.env.PORT ?? 8788);
serve({ fetch: app.fetch, port }, ({ port }) => {
  console.log(`KiteAlerts API listening on http://localhost:${port}`);
});

if (process.env.WATCHER_DISABLED !== "1") {
  startWatcher();
}
