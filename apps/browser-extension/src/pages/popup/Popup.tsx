import largeNekoOnTree from "@assets/img/cat-on-bigger-tree.png";
import background from "@assets/img/mountain-bg-11.svg";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useAuth } from "../../components/hooks/useAuth";
import { IntegrationSettings } from "../../components/popup/IntegrationSettings";
import { MainView } from "../../components/popup/MainView";
import { SettingsPanel } from "../../components/popup/SettingsPanel";
import { UserProfile } from "../../components/popup/UserProfile";
import { WidgetSettings } from "../../components/popup/WidgetSettings";
import { Card } from "../../components/ui/card";

type SettingsTab = "integration" | "widget";

export default function Popup() {
	const [showEdit, setShowEdit] = useState(false);
	const [settingsTab, setSettingsTab] = useState<SettingsTab>("integration");
	const auth = useAuth();

	return (
		<div className="p-14 pt-20 relative">
			<img
				src={background}
				className="h-full w-full absolute inset-0 pointer-events-none object-cover"
				alt="Stupid Neko"
			/>

			<div className="flex gap-4 relative z-10">
				<Card className="w-[360px] relative">
					<Card className="absolute left-0 py-2 px-3 -top-4 -translate-y-full">

						<AnimatePresence mode="wait">
							{auth.isAuthed && (<motion.div
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -8 }}
								transition={{ duration: 0.3 }}
								className=" absolute opacity-0 bottom-0 -right-4 translate-x-full">
								<Card className="!p-0 rounded-lg">
									<UserProfile />
								</Card>
							</motion.div>)}

						</AnimatePresence>

						<h1 className="font-semibold text-xl tracking-tight">
							StupidNeko
						</h1>
					</Card>
					<header className="flex flex-col items-center justify-center px-4 pb-4 pt-6">
						<SettingsPanel
							showEdit={showEdit}
							settingsTab={settingsTab}
							onToggleEdit={() => setShowEdit(!showEdit)}
							onTabChange={setSettingsTab}
						/>

						<img
							src={largeNekoOnTree}
							className="absolute -right-40 top-0 translate-y-[-50%] h-44"
							alt="Stupid Neko"
						/>

						<div className="relative w-full min-h-[160px]">
							<AnimatePresence mode="wait">
								{!showEdit ? (
									<MainView
										key="main-view"
										onOpenSettings={() => {
											setSettingsTab("integration");
											setShowEdit(true);
										}}
									/>
								) : (
									<div
										key="settings-view"
										className="mt-2 w-full px-4 py-2"
									>
										{settingsTab === "integration" ? (
											<IntegrationSettings
												onSaveSuccess={() => setShowEdit(false)}
											/>
										) : (
											<WidgetSettings />
										)}
									</div>
								)}
							</AnimatePresence>
						</div>
					</header>
				</Card>

			</div>
		</div>
	);
}
