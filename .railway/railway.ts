import { defineRailway, github, project, service } from "railway/iac";

// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "escalation-frontier";

export default defineRailway(() => {
  const escalation_frontier = service("escalation-frontier", {
    source: github("ankitkapooor/escalation-frontier"),
    healthcheck: "/api/health",
    healthcheckTimeout: 30,
  });
  return project("escalation-frontier", {
    resources: [escalation_frontier],
  });
});
