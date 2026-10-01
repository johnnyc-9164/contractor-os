import { MembershipProvider } from "../../components/membership-provider";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <MembershipProvider>{children}</MembershipProvider>;
}
