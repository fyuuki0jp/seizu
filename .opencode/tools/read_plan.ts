import { tool } from "@opencode-ai/plugin";
import fs from "fs";
import path from "path";

export default tool({
  description: "Read the existing ExecPlan from PLAN.md file.",
  args: {},
  async execute() {
    const existingPlanPath = path.join(process.cwd(), "PLAN.md");

    if (!fs.existsSync(existingPlanPath)) {
      return `No PLAN.md file found. Use create_plan to create a new execution plan.`;
    }

    const plan = fs.readFileSync(existingPlanPath, "utf-8");

    if (!plan.trim()) {
      return `PLAN.md exists but is empty. Use create_plan to create a new execution plan.`;
    }

    return `Here is the existing ExecPlan from PLAN.md:\n\n${plan}`;
  },
});
