import { defineRailway, github, preserve, project, service } from "railway/iac";

// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "escalation-frontier";

export default defineRailway(() => {
  const escalation_frontier = service("escalation-frontier", {
    source: github("ankitkapooor/escalation-frontier"),
    env: {
      JEV_API_KEY: preserve(),
      JEV_MODEL: preserve(),
      LIVE_ACCESS_TOKEN: preserve(),
    },
    healthcheck: "/api/health",
    healthcheckTimeout: 30,
  });
  return project("escalation-frontier", {
    resources: [escalation_frontier],
  });
});
