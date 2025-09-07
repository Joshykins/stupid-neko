import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexHttpClient } from "convex/browser";
import { HttpRouter } from "convex/server";

// Browser extension playback payload typing
type PlaybackSource = "youtube" | "spotify" | "anki" | "manual";
type PlaybackEvent = "start" | "progress" | "pause" | "end" | string;
type PlaybackPayload = {
    source: PlaybackSource;
    event: PlaybackEvent;
    url?: string;
    title?: string;
    videoId?: string;
    ts?: number;       // epoch ms
    position?: number; // seconds
    duration?: number; // seconds
    rate?: number;     // playback rate
};

function isPlaybackPayload(x: any): x is PlaybackPayload {
    return (
        x != null &&
        typeof x === "object" &&
        typeof x.source === "string" &&
        typeof x.event === "string" &&
        (x.url === undefined || typeof x.url === "string") &&
        (x.title === undefined || typeof x.title === "string") &&
        (x.videoId === undefined || typeof x.videoId === "string") &&
        (x.ts === undefined || typeof x.ts === "number") &&
        (x.position === undefined || typeof x.position === "number") &&
        (x.duration === undefined || typeof x.duration === "number") &&
        (x.rate === undefined || typeof x.rate === "number")
    );
}

export function addExtensionRoutes(http: HttpRouter) {
http.route({
    path: "/extension/youtube/label",
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

http.route({
    path: "/extension/youtube/label",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
        const origin = req.headers.get("origin") || "*";
        let payload: any = null;
        try {
            payload = await req.json();
        } catch {}

        function extractYouTubeId(input: string): string | null {
            try {
                // If it's a bare ID (11 chars typical), accept it
                if (/^[A-Za-z0-9_-]{6,}$/i.test(input) && !input.includes("http")) return input;
                const url = new URL(input);
                if (url.hostname.includes("youtube.com")) {
                    const v = url.searchParams.get("v");
                    if (v) return v;
                    const path = url.pathname;
                    // youtu.be short links or /shorts/
                    const shorts = path.match(/\/shorts\/([A-Za-z0-9_-]{6,})/i);
                    if (shorts) return shorts[1];
                }
                if (url.hostname === "youtu.be") {
                    const id = url.pathname.replace(/^\//, "");
                    if (id) return id;
                }
            } catch {}
            return null;
        }

        const videoId: string | null = payload?.videoId
            ?? (payload?.url ? extractYouTubeId(payload.url) : null);

        if (!videoId) {
            return new Response(JSON.stringify({ ok: false, error: "missing_video_id" }), {
                status: 400,
                headers: {
                    "content-type": "application/json",
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Credentials": "true",
                },
            });
        }

        const url = payload?.url ?? `https://www.youtube.com/watch?v=${videoId}`;

        try {
            const result = await ctx.runMutation(internal.contentYoutubeLabeling.getOrEnqueue, {
                videoId,
                url,
            });
            console.log("[extension] youtube/label", {
                videoId,
                url,
                result,
            });
            return new Response(
                JSON.stringify({ ok: true, ...result }),
                {
                    status: 200,
                    headers: {
                        "content-type": "application/json",
                        "Access-Control-Allow-Origin": origin,
                        "Access-Control-Allow-Credentials": "true",
                    },
                },
            );
        } catch (err: any) {
            return new Response(JSON.stringify({ ok: false, error: err?.message ?? "unknown_error" }), {
                status: 500,
                headers: {
                    "content-type": "application/json",
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Credentials": "true",
                },
            });
        }
    }),
});

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

        // Validate and process via internalConvex validators
        try {
            const body = isPlaybackPayload(payload) ? payload : {};
            const result = await ctx.runMutation((internal as any).extensionPlayback.handlePlayback, body as any);
            return new Response(JSON.stringify(result), {
                status: 200,
                headers: {
                    "content-type": "application/json",
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Credentials": "true",
                },
            });
        } catch (err) {
            console.log("[extension] playback error", err);
            return new Response(JSON.stringify({ ok: false }), {
                status: 400,
                headers: {
                    "content-type": "application/json",
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Credentials": "true",
                },
            });
        }
        /* return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: {
                "content-type": "application/json",
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
            },
        }); */
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
}


