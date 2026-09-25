import { MembershipProvider } from "../../components/membership-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return <MembershipProvider>{children}</MembershipProvider>;
}
