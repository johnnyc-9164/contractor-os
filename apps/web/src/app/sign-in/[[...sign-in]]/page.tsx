import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
	return (
		<main className="grid place-items-center p-8">
			<SignIn
				appearance={{
					variables: { borderRadius: "8px", fontFamily: "inherit" },
				}}
			/>
		</main>
	);
}
