"use client";

import { api } from "@contractor-os/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useState } from "react";

export function CreateJobForm({ onCreated }: { onCreated?: () => void }) {
	const createJob = useMutation(api.backend.co_create_job);
	const [contract, setContract] = useState("");
	const [client, setClient] = useState("");
	const [jobNumber, setJobNumber] = useState("");
	const [jobType, setJobType] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (
			!contract.trim() ||
			!client.trim() ||
			!jobNumber.trim() ||
			!jobType.trim()
		) {
			setError("Contract, Client, Job Number, and Job Type are required.");
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			await createJob({
				requestKey: `job-${Date.now()}-${Math.random().toString(36).slice(2)}`,
				input: {
					contract: contract.trim(),
					client: client.trim(),
					job_number: jobNumber.trim(),
					job_type: jobType.trim(),
				},
			});
			setContract("");
			setClient("");
			setJobNumber("");
			setJobType("");
			onCreated?.();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create job.");
		} finally {
			setSubmitting(false);
		}
	};

	const inputStyle = {
		padding: "0.5rem",
		borderRadius: "4px",
		border: "1px solid #ccc",
	};

	return (
		<form
			onSubmit={handleSubmit}
			style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
		>
			<h3>Create Job</h3>
			<input
				type="text"
				placeholder="Contract (required)"
				value={contract}
				onChange={(e) => setContract(e.target.value)}
				disabled={submitting}
				style={inputStyle}
			/>
			<input
				type="text"
				placeholder="Client (required)"
				value={client}
				onChange={(e) => setClient(e.target.value)}
				disabled={submitting}
				style={inputStyle}
			/>
			<input
				type="text"
				placeholder="Job Number (required)"
				value={jobNumber}
				onChange={(e) => setJobNumber(e.target.value)}
				disabled={submitting}
				style={inputStyle}
			/>
			<input
				type="text"
				placeholder="Job Type (required)"
				value={jobType}
				onChange={(e) => setJobType(e.target.value)}
				disabled={submitting}
				style={inputStyle}
			/>
			{error && (
				<div style={{ color: "red", fontSize: "0.875rem" }}>{error}</div>
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
				{submitting ? "Creating..." : "Create Job"}
			</button>
		</form>
	);
}
