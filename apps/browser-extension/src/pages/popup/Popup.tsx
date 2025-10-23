import largeNekoOnTree from '@assets/img/cat-on-bigger-tree.png';
import background from '@assets/img/mountain-bg-11.svg';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useAuth } from '../../components/hooks/useAuth';
import { IntegrationSettings } from '../../components/popup/IntegrationSettings';
import { MainView } from '../../components/popup/MainView';
import { SettingsPanel } from '../../components/popup/SettingsPanel';
import { UserProfile } from '../../components/popup/UserProfile';
import { WidgetSettings } from '../../components/popup/WidgetSettings';
import { Card } from '../../components/ui/card';

type SettingsTab = 'integration' | 'widget';

export default function Popup() {
	const [showEdit, setShowEdit] = useState(false);
	const [settingsTab, setSettingsTab] = useState<SettingsTab>('integration');
	const auth = useAuth();

	return (
		<div className="snbex:p-14 snbex:pt-20 snbex:relative">
			<img
				src={background}
				className="snbex:h-full snbex:w-full snbex:absolute snbex:inset-0 snbex:pointer-events-none snbex:object-cover"
				alt="Stupid Neko"
			/>

			<div className="snbex:flex snbex:gap-4 snbex:relative snbex:z-10">
				<Card className="snbex:w-[360px] snbex:relative">
					<Card className="snbex:absolute snbex:left-0 snbex:py-2 snbex:px-3 snbex:-top-4 snbex:-translate-y-full">
						<AnimatePresence mode="wait">
							{auth.isAuthed && (
								<motion.div
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -8 }}
									transition={{ duration: 0.3 }}
									className="snbex:absolute snbex:opacity-0 snbex:bottom-0 snbex:-right-4 snbex:translate-x-full"
								>
									<Card className="snbex:!p-0 snbex:rounded-lg">
										<UserProfile />
									</Card>
								</motion.div>
							)}
						</AnimatePresence>

						<h1 className="snbex:font-semibold snbex:text-xl snbex:tracking-tight">
							StupidNeko
						</h1>
					</Card>
					<header className="snbex:flex snbex:flex-col snbex:items-center snbex:justify-center snbex:px-4 snbex:pb-4 snbex:pt-6">
						<SettingsPanel
							showEdit={showEdit}
							settingsTab={settingsTab}
							onToggleEdit={() => setShowEdit(!showEdit)}
							onTabChange={(tab: SettingsTab) => setSettingsTab(tab)}
						/>

						<img
							src={largeNekoOnTree}
							className="snbex:absolute snbex:-right-40 snbex:top-0 snbex:translate-y-[-50%] snbex:h-44"
							alt="Stupid Neko"
						/>

						<div className="snbex:relative snbex:w-full snbex:min-h-[160px]">
							<AnimatePresence mode="wait">
								{!showEdit ? (
									<MainView
										key="main-view"
										onOpenSettings={() => {
											setSettingsTab('integration');
											setShowEdit(true);
										}}
									/>
								) : (
									<div
										key="settings-view"
										className="snbex:mt-2 snbex:w-full snbex:px-4 snbex:py-2"
									>
										{settingsTab === 'integration' ? (
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
