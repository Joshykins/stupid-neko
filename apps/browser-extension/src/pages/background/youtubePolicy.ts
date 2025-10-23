// YouTube policy management for background script

import { createLogger } from '../../lib/logger';
import { convex, getIntegrationId } from './auth';
import { api } from '../../../../../convex/_generated/api';
import { tryCatch } from '../../../../../lib/tryCatch';

const log = createLogger('service-worker', 'youtube-policy');

export function getYoutubeContentKey(url: string): string | null {
    try {
        const u = new URL(url);
        const host = u.hostname.toLowerCase();
        
        // Check if it's a YouTube URL
        if (!(/(^|\.)youtube\.com$/.test(host) || /(^|\.)youtu\.be$/.test(host))) {
            return null;
        }
        
        // Extract video ID from different YouTube URL formats
        const v = u.searchParams.get('v');
        if (v) {
            return `youtube:${v}`;
        }
        
        if (host.includes('youtu.be')) {
            const seg = u.pathname.replace(/^\//, '');
            if (seg) return `youtube:${seg}`;
        }
        
        if (u.pathname.startsWith('/shorts/')) {
            const segs = u.pathname.split('/').filter(Boolean);
            if (segs[1]) return `youtube:${segs[1]}`;
        }
        
        return null;
    } catch {
        return null;
    }
}

export async function checkYoutubePolicyAllowed(url: string): Promise<{ allowed: boolean; policy: 'allow' | null; contentKey: string; } | null> {
    if (!convex) return null;

    const integrationId = await getIntegrationId();
    if (!integrationId) return null;

    const contentKey = getYoutubeContentKey(url);
    if (!contentKey) return null;

    const { data: res, error } = await tryCatch(
        convex.query(api.browserExtension.youtubeProviderFunctions.checkIfYoutubeVideoIsAlwaysTracked, {
            integrationId,
            contentKey,
        })
    );

    if (error) {
        log.warn('YouTube policy check failed', error);
        return null;
    }

    const allowed = !!res?.allowed;
    return { allowed, policy: allowed ? 'allow' : null, contentKey };
}
