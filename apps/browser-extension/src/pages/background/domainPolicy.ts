import { api } from '../../../../../convex/_generated/api';
import { convex, getIntegrationId } from './auth';
import { tryCatch } from '../../../../../lib/tryCatch';
import { createLogger } from '../../lib/logger';
const log = createLogger('service-worker', 'providers:determine');

type PolicyKind = 'allow' | 'block';

export function getDomainContentKey(domain: string): string {
	return `website:${domain.trim().toLowerCase()}`;
}

export async function checkDomainPolicyAllowed(domain: string): Promise<{
	allowed: boolean;
	policy: PolicyKind | null;
	contentKey: string;
} | null> {
	if (!convex) return null;

	const integrationId = await getIntegrationId();
	if (!integrationId) return null;

	const contentKey = getDomainContentKey(domain);

	const { data: res, error } = await tryCatch(
		convex.query(
			api.browserExtension.websiteProviderFunctions
				.checkIfWebsiteIsAlwaysToBeTracked,
			{
				integrationId,
				contentKey,
			}
		)
	);

	if (error) {
		log.warn('policy check failed', error);
		return null;
	}

	const allowed = !!res?.allowed;
	return { allowed, policy: allowed ? 'allow' : null, contentKey };
}
