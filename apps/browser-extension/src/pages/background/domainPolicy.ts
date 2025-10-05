import { api } from '../../../../../convex/_generated/api';
import { convex, getIntegrationId } from './auth';
import { tryCatch } from '../../../../../lib/tryCatch';
import { createLogger } from '../../lib/logger';
const log = createLogger('service-worker', 'providers:determine');

const DEBUG_LOG_PREFIX = '[bg:domain-policy]';

type PolicyKind = 'allow' | 'block';

function toHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
}

export async function hashDomain(domain: string): Promise<string> {
    const normalized = domain.trim().toLowerCase();
    const data = new TextEncoder().encode(normalized);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return toHex(digest);
}

function buildDomainContentKey(domainHashHex: string): string {
    return `website-domain:${domainHashHex}`;
}

export async function checkDomainPolicyAllowed(domain: string): Promise<{ allowed: boolean; policy: PolicyKind | null; contentKey: string; } | null> {
    if (!convex) return null;

    const integrationId = await getIntegrationId();
    if (!integrationId) return null;

    const hash = await hashDomain(domain);
    const contentKey = buildDomainContentKey(hash);

    const { data: res, error } = await tryCatch(
        convex.query(api.browserExtensionFunctions.getUserContentLabelPolicyForKeyFromIntegration, {
            integrationId,
            contentKey,
        })
    );

    if (error) {
        log.warn('policy check failed', error);
        return null;
    }

    const policy = res?.policyKind as PolicyKind | undefined;
    return { allowed: policy === 'allow', policy: policy ?? null, contentKey };
}

export async function getHashedDomainContentKey(domain: string): Promise<string> {
    const hash = await hashDomain(domain);
    return buildDomainContentKey(hash);
}

// no cache – rely on DB for authoritative policy state


