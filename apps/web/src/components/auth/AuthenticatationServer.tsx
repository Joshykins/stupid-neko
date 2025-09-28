import { isAuthenticatedNextjs } from '@convex-dev/auth/nextjs/server';
import { headers } from 'next/headers';

export const AuthenticatedServer = async ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const isAuthenticated = await isAuthenticatedNextjs();

	return <>{isAuthenticated ? children : null}</>;
};

export const UnauthenticatedServer = async ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const isAuthenticated = await isAuthenticatedNextjs();

	return <>{!isAuthenticated ? children : null}</>;
};
