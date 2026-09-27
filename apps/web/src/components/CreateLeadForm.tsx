"use client";

import { api } from "@contractor-os/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useState } from "react";

type DispatchResult = {
	ok: boolean;
	blockers?: Array<{ message?: string }>;
};

export function CreateLeadForm({ onCreated }: { onCreated?: () => void }) {
	const dispatch = useMutation(api.catalog.dispatch);
	const [title, setTitle] = useState("");
	const [client, setClient] = useState("");
	const [description, setDescription] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim() || !client.trim()) {
			setError("Title and Client are required.");
			return;
		}
		setSubmitting(true);
		setError(null);
		setSuccess(null);
		try {
			const result: DispatchResult = await dispatch({
				contract: "lead.capture",
				schema_version: 1,
				idempotency_key: crypto.randomUUID(),
				payload: {
					title: title.trim(),
					source: "other",
					contact_name: client.trim(),
					notes: description.trim() || undefined,
				},
			});
			if (!result.ok) {
				setError(
					result.blockers?.[0]?.message ?? "The server refused the lead.",
				);
				return;
			}
			setTitle("");
			setClient("");
			setDescription("");
			setSuccess(
				"Lead added to the pipeline. Start outreach from the leads board.",
			);
			onCreated?.();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create lead.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
		>
			<h3>Create Lead</h3>
			<input
				type="text"
				placeholder="Lead title (required)"
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				disabled={submitting}
				style={{
					padding: "0.5rem",
					borderRadius: "4px",
					border: "1px solid #ccc",
				}}
			/>
			<input
				type="text"
				placeholder="Client (required)"
				value={client}
				onChange={(e) => setClient(e.target.value)}
				disabled={submitting}
				style={{
					padding: "0.5rem",
					borderRadius: "4px",
					border: "1px solid #ccc",
				}}
			/>
			<textarea
				placeholder="Description (optional)"
				value={description}
				onChange={(e) => setDescription(e.target.value)}
				disabled={submitting}
				rows={3}
				style={{
					padding: "0.5rem",
					borderRadius: "4px",
					border: "1px solid #ccc",
				}}
			/>
			{error && (
				<div style={{ color: "red", fontSize: "0.875rem" }}>{error}</div>
			)}
			{success && (
				<div style={{ color: "green", fontSize: "0.875rem" }}>{success}</div>
			)}
			<button
				type="submit"
				disabled={submitting}
				style={{
					padding: "0.5rem 1rem",
					borderRadius: "4px",
					border: "none",
					backgroundColor: submitting ? "#ccc" : "#0070f3",
					color: "white",
					cursor: submitting ? "not-allowed" : "pointer",
				}}
			>
				{submitting ? "Creating..." : "Create Lead"}
			</button>
		</form>
	);
}
