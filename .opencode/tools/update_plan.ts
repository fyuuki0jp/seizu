import { tool } from '@opencode-ai/plugin';
import fs from 'fs';
import path from 'path';

export default tool({
  description:
    'Update the existing ExecPlan in PLAN.md. Use this to update progress, add discoveries, or record decisions. Provide the exact section to replace (plan_before) and the new content (plan_after).',
  args: {
    plan_before: tool.schema
      .string()
      .describe(
        'The exact section of the ExecPlan to be replaced. Must match exactly including whitespace.'
      ),
    plan_after: tool.schema
      .string()
      .describe('The updated content to replace plan_before.'),
  },
  async execute(args) {
    const { plan_after, plan_before } = args;
    const existingPlanPath = path.join(process.cwd(), 'PLAN.md');

    if (!fs.existsSync(existingPlanPath)) {
      return `PLAN.md does not exist. Use create_plan to create a new plan first.`;
    }

    const existingPlan = fs.readFileSync(existingPlanPath, 'utf-8');

    // Check if the section to replace exists in the file
    if (!existingPlan.includes(plan_before)) {
      // Provide helpful debug info
      const previewLength = 100;
      const existingPreview = existingPlan
        .substring(0, previewLength)
        .replace(/\n/g, '\\n');
      const beforePreview = plan_before
        .substring(0, previewLength)
        .replace(/\n/g, '\\n');
      return `The provided plan_before content was not found in PLAN.md. 
      
This usually happens when whitespace or newlines don't match exactly.

Existing plan starts with: "${existingPreview}..."
plan_before starts with: "${beforePreview}..."

Please use read_plan first to get the exact content, then provide an exact match of the section you want to update.`;
    }

    const updatedPlan = existingPlan.replace(plan_before, plan_after);
    fs.writeFileSync(existingPlanPath, updatedPlan, 'utf-8');
    return `ExecPlan successfully updated in PLAN.md`;
  },
});
