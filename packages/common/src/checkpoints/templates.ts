
import { CapabilityType } from './capability-mapper';
import { CheckpointTypeSchema, CheckpointRunnerSchema } from '../ai/schemas';
import { z } from 'zod';

export const CheckpointTemplateSchema = z.object({
  id: z.string(),
  capability: z.enum(['identify', 'explain_in_own_words', 'predict_output', 'perform_step', 'configure_parameters', 'trace_process', 'spot_mistake', 'apply_to_context']),
  type: CheckpointTypeSchema,
  runner: CheckpointRunnerSchema,
  titleTemplate: z.string(),
  taskTemplate: z.string(),
  requiredFields: z.array(z.string()), // Fields AI must extract e.g. ["variable_name", "expected_output"]
});

export type CheckpointTemplate = z.infer<typeof CheckpointTemplateSchema>;

export const CHECKPOINT_TEMPLATES: CheckpointTemplate[] = [
  // 1. PERFORM STEP (SQL)
  {
    id: 'sql_basic_query',
    capability: 'perform_step',
    type: 'sql',
    runner: 'sqljs',
    titleTemplate: 'Write a SQL Query',
    taskTemplate: 'Write a query to select {columns} from the {table_name} table.',
    requiredFields: ['columns', 'table_name']
  },
  // 2. PREDICT OUTPUT (CODE)
  {
    id: 'code_predict_output',
    capability: 'predict_output',
    type: 'code',
    runner: 'monaco_judge0', // Visual only? Or simple runner
    titleTemplate: 'Predict the Output',
    taskTemplate: 'What will be printed to the console when specific inputs are passed to {function_name}?',
    requiredFields: ['function_name']
  },
  // 3. EXPLAIN (THEORY)
  {
    id: 'explain_concept',
    capability: 'explain_in_own_words',
    type: 'theory',
    runner: 'external', // Just text input
    titleTemplate: 'Explain {concept}',
    taskTemplate: 'In your own words, explain how {concept} works based on the video.',
    requiredFields: ['concept']
  },
  // 4. IDENTIFY (QUIZ)
  {
    id: 'identify_component',
    capability: 'identify',
    type: 'theory',
    runner: 'external',
    titleTemplate: 'Identify the Component',
    taskTemplate: 'Which component is responsible for {functionality}?',
    requiredFields: ['functionality']
  }
];

export class TemplateService {
  getTemplateForCapability(capability: CapabilityType): CheckpointTemplate | null {
    // Simple strategy: return first match. V2: Randomize or smart select.
    return CHECKPOINT_TEMPLATES.find(t => t.capability === capability) || null;
  }
  
  fillTemplate(template: CheckpointTemplate, variables: Record<string, string>): { title: string, task: string } {
    let title = template.titleTemplate;
    let task = template.taskTemplate;
    
    Object.entries(variables).forEach(([key, value]) => {
      title = title.replace(`{${key}}`, value);
      task = task.replace(`{${key}}`, value);
    });
    
    return { title, task };
  }
}
