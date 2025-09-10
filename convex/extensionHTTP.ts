import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { HonoWithConvex } from "convex-helpers/server/hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

export function addExtensionRoutes(app: HonoWithConvex<ActionCtx>) {
app.use("/extension/*", cors({
    origin: (origin) => origin ?? "*",
    credentials: true,
    allowHeaders: ["authorization", "content-type"],
    allowMethods: ["POST", "OPTIONS"],
}));

const ActivitySchema = z.object({
    source: z.enum(["youtube", "spotify", "anki", "manual"]),
    activityType: z.enum(["heartbeat", "start", "pause", "end"]),
    contentKey: z.string().min(1),
    url: z
        .string()
        .refine((s) => {
            try { new URL(s); return true; } catch { return false; }
        }, { message: "Invalid URL" })
        .optional(),
    occurredAt: z.number().int().optional(),
});

app.post(
    "/extension/record-content-activity",
    zValidator("json", ActivitySchema),
    async (c) => {
        const userId = await getAuthUserId(c.env);
        if (!userId) return c.json({ ok: false, error: "unauthorized" }, 401);
        const body = c.req.valid("json");
        console.log("[extensionHTTP] recordContentActivity", body);
        const result = await c.env.runMutation(internal.contentActivities.recordContentActivity, { userId, ...body });
        // Enrich response with contentLabel + user's target language for the extension to cache
        let contentLabel: any = null;
        try {
            if (result?.contentKey) {
                contentLabel = await c.env.runQuery(internal.contentLabels.getByContentKey, { contentKey: result.contentKey });
            }
        } catch {}
        let currentTargetLanguage: any = null;
        try {
            currentTargetLanguage = await c.env.runQuery(internal.users.getCurrentTargetLanguage, { userId });
        } catch {}
        return c.json({ ...result, contentLabel, currentTargetLanguage });
    },
);
}


