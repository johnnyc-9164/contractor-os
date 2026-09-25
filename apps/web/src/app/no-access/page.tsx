import { UserButton } from "@clerk/nextjs";

export default function NoAccessPage() {
	return (
		<main className="grid place-items-center p-8 text-center">
			<div className="space-y-4">
				<h1 className="font-semibold text-2xl">No access</h1>
				<p>Your account does not have an enabled Contractor OS membership.</p>
				<UserButton />
			</div>
		</main>
	);
}
