import { tool } from "@opencode-ai/plugin";
import fs from "fs";
import path from "path";

export default tool({
  description:
    "Create a new ExecPlan for complex features or significant refactors. The plan will be saved to PLAN.md in the project root.",
  args: {
    plan: tool.schema
      .string()
      .describe("The ExecPlan content in Markdown format."),
  },
  async execute(args) {
    const { plan } = args;
    const planPath = path.join(process.cwd(), "PLAN.md");

    try {
      // Check if PLAN.md already exists
      if (fs.existsSync(planPath)) {
        return `Warning: PLAN.md already exists. Use update_plan to modify the existing plan, or delete PLAN.md first if you want to create a new plan.`;
      }

      fs.writeFileSync(planPath, plan, "utf-8");
      return `ExecPlan successfully created at PLAN.md`;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return `Failed to create ExecPlan: ${errorMessage}`;
    }
  },
});
