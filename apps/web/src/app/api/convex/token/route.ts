import {
	convexAuthNextjsToken,
	isAuthenticatedNextjs,
} from '@convex-dev/auth/nextjs/server';
import { NextResponse } from 'next/server';

function corsHeaders(origin: string | null, allowCredentials = true) {
	const headers: Record<string, string> = {
		'Access-Control-Allow-Methods': 'GET,OPTIONS',
		'Access-Control-Allow-Headers': 'authorization, content-type',
		Vary: 'Origin',
	};
	if (origin) headers['Access-Control-Allow-Origin'] = origin;
	if (allowCredentials) headers['Access-Control-Allow-Credentials'] = 'true';
	return headers;
}

export async function OPTIONS(request: Request) {
	const origin = request.headers.get('origin');
	// Only allow chrome-extension:// or http(s) origins
	const allowOrigin =
		origin &&
		(origin.startsWith('chrome-extension://') ||
			origin.startsWith('http://') ||
			origin.startsWith('https://'))
			? origin
			: '*';
	return new NextResponse(null, {
		status: 204,
		headers: corsHeaders(allowOrigin),
	});
}

export async function GET(request: Request) {
	console.log('GET /api/convex/token');
	const origin = request.headers.get('origin');
	const allowOrigin =
		origin &&
		(origin.startsWith('chrome-extension://') ||
			origin.startsWith('http://') ||
			origin.startsWith('https://'))
			? origin
			: '*';
	const isAuthed = await isAuthenticatedNextjs();
	if (!isAuthed) {
		return new NextResponse('Unauthorized', {
			status: 401,
			headers: corsHeaders(allowOrigin),
		});
	}
	const token = await convexAuthNextjsToken();
	return NextResponse.json({ token }, { headers: corsHeaders(allowOrigin) });
}
