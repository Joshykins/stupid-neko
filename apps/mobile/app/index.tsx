import { useAuthActions } from '@convex-dev/auth/react';
import {
	Authenticated,
	Unauthenticated,
	useMutation,
	useQuery,
} from 'convex/react';
import React from 'react';
import { Button, Text, View } from 'react-native';
import { api } from '../../../convex/_generated/api';

function HomeSignedIn() {
	const { signOut } = useAuthActions();
	const result = useQuery(api.userFunctions.me);
	const updateTimezone = useMutation(api.userFunctions.updateTimezone);
	// const addNumber = useMutation(api.myFunctions.addNumber);

	// Auto-detect and update timezone every time the user accesses the app
	React.useEffect(() => {
		if (result) {
			// For mobile, try to detect timezone using available APIs
			let currentTimezone = 'UTC'; // Default fallback

			// Check if Intl.DateTimeFormat is available (works on newer React Native versions)
			if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
				try {
					currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
				} catch {
					// Fallback to UTC if timezone detection fails
					currentTimezone = 'UTC';
				}
			}

			// Only update if the timezone has changed
			if (result.timezone !== currentTimezone) {
				updateTimezone({ timezone: currentTimezone });
			}
		}
	}, [result, updateTimezone]);

	const onAddRandom = async () => {
		const _value = Math.floor(Math.random() * 1000);
		// await addNumber({ value });
	};
	return (
		<View
			style={{
				flex: 1,
				alignItems: 'center',
				justifyContent: 'center',
				gap: 16,
			}}
		>
			<Text style={{ fontSize: 20, fontWeight: '600' }}>
				Welcome to Stupid Neko
			</Text>
			{/* <Text style={{ fontSize: 14, color: "#666" }}>
				Viewer: {result?.viewer ?? "anonymous"}
			</Text> */}
			<Button title="Add random number" onPress={onAddRandom} />
			{/* <FlatList
				style={{ alignSelf: "stretch", paddingHorizontal: 24 }}
				data={result?.numbers ?? []}
				keyExtractor={(item, index) => `${item}-${index}`}
				renderItem={({ item }) => (
					<Text style={{ fontSize: 16, paddingVertical: 4 }}>{item}</Text>
				)}
				ListEmptyComponent={<Text>Loading…</Text>}
			/> */}
			<Button
				title="Sign out"
				onPress={() => {
					void signOut();
				}}
			/>
		</View>
	);
}

function HomeSignedOut() {
	const { signIn } = useAuthActions();
	const onSignIn = async () => {
		try {
			await signIn('discord');
		} catch {
			// Handle SSO error silently for now
			// console.warn('SSO error', e);
		}
	};
	return (
		<View
			style={{
				flex: 1,
				alignItems: 'center',
				justifyContent: 'center',
				gap: 16,
			}}
		>
			<Text style={{ fontSize: 18 }}>You are signed out</Text>
			<Button title="Sign in with Discord" onPress={onSignIn} />
		</View>
	);
}

export default function Index() {
	return (
		<>
			<Authenticated>
				<HomeSignedIn />
			</Authenticated>
			<Unauthenticated>
				<HomeSignedOut />
			</Unauthenticated>
		</>
	);
}
