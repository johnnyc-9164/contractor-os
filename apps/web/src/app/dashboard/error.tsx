"use client";

import { WorkspaceError } from "../../components/workspace-feedback";

export default function WorkspaceRouteError({
	retry,
}: {
	error: Error;
	retry: () => void;
}) {
	return <WorkspaceError retry={retry} />;
}
