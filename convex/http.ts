import { httpRouter, ROUTABLE_HTTP_METHODS } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { addExtensionRoutes } from "./extensionHTTP";
import { Hono } from "hono";
import { HonoWithConvex } from "convex-helpers/server/hono";
import type { ActionCtx } from "./_generated/server";

const app: HonoWithConvex<ActionCtx> = new Hono();

// Register Hono-based extension routes
addExtensionRoutes(app);

// Classic Convex router for built-in routes
const http = httpRouter();
auth.addHttpRoutes(http);

// Bridge all methods to Hono (acts as a fallback router)
for (const method of ROUTABLE_HTTP_METHODS) {
    (http as any).route({
        pathPrefix: "/",
        method,
        handler: httpAction(async (ctx, request: Request) => {
            return await (app as any).fetch(request, ctx);
        }),
    });
}

export default http;
