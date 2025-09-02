import React from "react";
import { View, Text, Button, FlatList } from "react-native";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery, Authenticated, Unauthenticated } from "convex/react";
import { api } from "../../../convex/_generated/api";

function HomeSignedIn() {
	const { signOut } = useAuthActions();
	const result = useQuery(api.myFunctions.listNumbers, { count: 25 });
	const addNumber = useMutation(api.myFunctions.addNumber);

	const onAddRandom = async () => {
		const value = Math.floor(Math.random() * 1000);
		await addNumber({ value });
	};
	return (
		<View
			style={{
				flex: 1,
				alignItems: "center",
				justifyContent: "center",
				gap: 16,
			}}
		>
			<Text style={{ fontSize: 20, fontWeight: "600" }}>
				Welcome to Stupid Neko
			</Text>
			<Text style={{ fontSize: 14, color: "#666" }}>
				Viewer: {result?.viewer ?? "anonymous"}
			</Text>
			<Button title="Add random number" onPress={onAddRandom} />
			<FlatList
				style={{ alignSelf: "stretch", paddingHorizontal: 24 }}
				data={result?.numbers ?? []}
				keyExtractor={(item, index) => `${item}-${index}`}
				renderItem={({ item }) => (
					<Text style={{ fontSize: 16, paddingVertical: 4 }}>{item}</Text>
				)}
				ListEmptyComponent={<Text>Loading…</Text>}
			/>
			<Button title="Sign out" onPress={() => { void signOut(); }} />
		</View>
	);
}

function HomeSignedOut() {
	const { signIn } = useAuthActions();
	const onSignIn = async () => {
		try {
			await signIn("discord");
		} catch (e) {
			console.warn("SSO error", e);
		}
	};
	return (
		<View
			style={{
				flex: 1,
				alignItems: "center",
				justifyContent: "center",
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
