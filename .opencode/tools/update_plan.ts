import { tool } from "@opencode-ai/plugin";
import fs from "fs";
import path from "path";

export default tool({
  description:
    "Update the existing ExecPlan in PLAN.md. Use this to update progress, add discoveries, or record decisions.",
  args: {
    plan_before: tool.schema
      .string()
      .describe("The previous ExecPlan content to be replaced."),
    plan_after: tool.schema.string().describe("The updated ExecPlan content."),
  },
  async execute(args) {
    const { plan_after, plan_before } = args;
    const existingPlanPath = path.join(process.cwd(), "PLAN.md");

    if (!fs.existsSync(existingPlanPath)) {
      return `PLAN.md does not exist. Use create_plan to create a new plan first.`;
    }

    const existingPlan = fs.readFileSync(existingPlanPath, "utf-8");

    if (existingPlan.trim() !== plan_before.trim()) {
      return `The existing plan in PLAN.md does not match the provided previous plan. Please read the current plan first and try again.`;
    }

    if (!existingPlan.includes(plan_before)) {
      return `The provided previous plan content was not found in PLAN.md. No changes made.`;
    }

    const updatedPlan = existingPlan.replace(plan_before, plan_after);
    fs.writeFileSync(existingPlanPath, updatedPlan);
    return `ExecPlan updated in PLAN.md`;
  },
});
