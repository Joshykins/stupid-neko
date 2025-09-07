import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
    path: "/extension/log-click",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
        let payload: unknown = null;
        try {
            payload = await req.json();
        } catch {}
        const userId = await getAuthUserId(ctx);
        console.log("[extension] log-click", {
            userId: userId ?? null,
            payload,
        });
        return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "content-type": "application/json" },
        });
    }),
});

http.route({
    path: "/extension/playback",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
        const origin = req.headers.get("origin") || "*";
        let payload: unknown = null;
        try {
            payload = await req.json();
        } catch {}
        const userId = await getAuthUserId(ctx);
        console.log("[extension] playback", {
            userId: userId ?? null,
            payload,
        });
        return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: {
                "content-type": "application/json",
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
            },
        });
    }),
});

http.route({
    path: "/extension/playback",
    method: "OPTIONS",
    handler: httpAction(async (ctx, req) => {
        const origin = req.headers.get("origin") || "*";
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Methods": "POST,OPTIONS",
                "Access-Control-Allow-Headers": "authorization, content-type",
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
            },
        });
    }),
});

export default http;


