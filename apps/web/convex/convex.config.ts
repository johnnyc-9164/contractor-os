import cms from "@johnnyc2026/cms/convex.config";
import contractorOs from "@johnnyc2026/contractor-os-core/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(contractorOs, { env: { MODE: "development" } });
app.use(cms);
export default app;
