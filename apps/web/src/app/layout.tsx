import './globals.css';
import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server';
import type { Metadata, Viewport } from 'next';
import { Baloo_2, Geist_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import ConvexClientProvider from '../../../../components/ConvexClientProvider';
import { Background } from '../components/Background/Background';
import TopNav from '../components/TopNav';
import { TestingComponent } from '../components/testing/TestingComponent';
import { Toaster } from '../components/ui/sonner';
import Footer from '../components/Footer';

const plusJakarta = Plus_Jakarta_Sans({
	variable: '--font-geist-sans',
	subsets: ['latin'],
	display: 'swap',
	fallback: [
		'Zen Kaku Gothic New',
		'Hiragino Kaku Gothic ProN',
		'Yu Gothic',
		'Meiryo',
		'system-ui',
		'sans-serif',
	],
});

const baloo = Baloo_2({
	variable: '--font-display',
	subsets: ['latin'],
	weight: '500',
	display: 'swap',
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'Stupid Neko',
	description: 'Stupid Neko is a language learning companion in your browser',
	keywords:
		'language learning, japanese, japanese learning, japanese language, japanese language learning, japanese language learning companion, japanese language learning companion in your browser',
	authors: [{ name: 'StupidNeko', url: 'https://stupidneko.com' }],
};

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`${plusJakarta.variable} ${geistMono.variable} ${baloo.variable}`}
		>
			<head>
				<link
					rel="stylesheet"
					href="https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.3.2/css/flag-icons.min.css"
				/>
				<title>Stupid Neko</title>
				<meta
					name="description"
					content="Stupid Neko is a language learning companion in your browser"
				/>
				<meta
					name="keywords"
					content="language learning, japanese, japanese learning, japanese language, japanese language learning, japanese language learning companion, japanese language learning companion in your browser"
				/>
				<meta name="author" content="Stupid Neko" />
				<meta name="theme-color" content="#000000" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
			</head>
			<body suppressHydrationWarning className="antialiased relative">
				<ConvexAuthNextjsServerProvider>
					<ConvexClientProvider>
						<TestingComponent />
						<div className="min-h-screen px-4 max-w-7xl mx-auto">
							<Background />
							<TopNav />
							<div className="min-h-[80vh] pb-20">
								{children}
							</div>
							<Footer />
						</div>
						<Toaster />
					</ConvexClientProvider>
				</ConvexAuthNextjsServerProvider>
			</body>
		</html>
	);
}
