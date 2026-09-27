export default function NotAuthorizedPage() {
	return (
		<main className="grid place-items-center p-8 text-center">
			<div className="space-y-4">
				<h1 className="font-semibold text-2xl">Not authorized</h1>
				<p>
					This panel is restricted to admin users. If you need access, contact
					the owner.
				</p>
			</div>
		</main>
	);
}
