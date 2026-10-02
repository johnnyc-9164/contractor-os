export type JobSummary = {
	id: string;
	identifier: string;
	title: string | null;
	state: string;
	updatedAt: number;
};

export function uniqueJobs(jobs: readonly JobSummary[]): JobSummary[] {
	const positions = new Map<string, number>();
	const unique: JobSummary[] = [];

	for (const job of jobs) {
		const position = positions.get(job.id);
		if (position === undefined) {
			positions.set(job.id, unique.length);
			unique.push(job);
		} else if (
			job.updatedAt >= (unique[position]?.updatedAt ?? Number.NEGATIVE_INFINITY)
		) {
			unique[position] = job;
		}
	}

	return unique;
}

export function jobTitle(
	job: Pick<JobSummary, "identifier" | "title">,
): string {
	return job.title?.trim() || job.identifier;
}

export function formatJobState(state: string): string {
	const normalized = state.trim().replace(/[_-]+/g, " ").toLowerCase();
	if (!normalized) return "Unknown";
	return normalized[0].toUpperCase() + normalized.slice(1);
}

export function formatJobUpdatedAt(timestamp: number): string {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(timestamp);
}
