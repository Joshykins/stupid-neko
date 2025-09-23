import { useEffect, useState } from "react";
import type { LanguageCode } from "../../../../convex/schema";
import { callBackground } from "../../messaging/messagesContentRouter";

type UserInfo = {
	userName: string;
	languageCode: LanguageCode;
};

type UseUserInfoProps = {
	userName?: string;
	languageCode?: LanguageCode;
};

export function useUserInfo(props: UseUserInfoProps = {}) {
	const [userInfo, setUserInfo] = useState<UserInfo>({
		userName: "User",
		languageCode: "ja",
	});

	useEffect(() => {
		const loadUserInfo = async () => {
			try {
				// Use props if provided, otherwise try to get from localStorage
				let userName = props.userName;
				let languageCode = props.languageCode;

				if (!userName) {
					const cachedName = localStorage.getItem("userName");
					if (cachedName) userName = cachedName;
				}

				if (!languageCode) {
					const cachedLang = localStorage.getItem("currentTargetLanguage");
					if (cachedLang) languageCode = cachedLang as LanguageCode;
				}

				// Try to get fresh data from background script
				const response = await callBackground("GET_AUTH_STATE", {});
				if (response.isAuthed && response.me) {
					if (response.me.name) userName = response.me.name;
					if (response.me.languageCode)
						languageCode = response.me.languageCode as LanguageCode;
				}

				setUserInfo({
					userName: userName || "User",
					languageCode: languageCode || "ja",
				});
			} catch (error) {
				console.warn("[useUserInfo] Failed to load user info:", error);
			}
		};

		loadUserInfo();
	}, [props.userName, props.languageCode]);

	return userInfo;
}
