import { CommandPalette } from "../../components/command-palette";
import { MembershipProvider } from "../../components/membership-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<MembershipProvider>
			<CommandPalette />
			{children}
		</MembershipProvider>
	);
}
