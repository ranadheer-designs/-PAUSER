
import { z } from 'zod';
import { CapabilityTypeSchema, TeachingMomentSchema } from '../ai/schemas';
import { ActionableBlock, ActionableType } from './syntactic-detector';

export type CapabilityType = z.infer<typeof CapabilityTypeSchema>;
export type TeachingMoment = z.infer<typeof TeachingMomentSchema>;

/**
 * Capability Mapping System
 * "What is the learner now capable of doing?"
 * 
 * Maps a detected Teaching Moment + Syntactic Context to a specific Capability.
 * This determines the *kind* of checkpoint we generate.
 */
export class CapabilityMapper {

  /**
   * Determine the capability based on AI intent and regex signals.
   */
  public map(moment: TeachingMoment, actionableContext?: ActionableBlock): CapabilityType {
    
    // 1. Priority: Actionable Context (Syntactic Signals strong)
    if (actionableContext && actionableContext.confidence > 0.6) {
      if (moment.intent === 'demonstration' || moment.intent === 'procedure_step') {
        return this.mapActionableToCapability(actionableContext);
      }
    }

    // 2. Fallback: Semantic Intent
    switch (moment.intent) {
      case 'concept_explanation':
        return 'explain_in_own_words';
      
      case 'demonstration':
        // If we saw a demo but no code signals, maybe it's tracing a UI flow?
        return 'trace_process';

      case 'example':
        return 'predict_output';

      case 'procedure_step':
        return 'perform_step';

      case 'summary':
        return 'identify'; // Identify key points

      case 'aside':
        return 'identify'; // Low value, usually skipped
        
      default:
        return 'explain_in_own_words';
    }
  }

  private mapActionableToCapability(block: ActionableBlock): CapabilityType {
    const types = block.detectedTypes;
    
    // Code/SQL/CLI -> usually "perform_step" or "predict_output"
    if (types.includes(ActionableType.SQL) || types.includes(ActionableType.CODE)) {
      return 'perform_step';
    }

    if (types.includes(ActionableType.CLI)) {
      return 'configure_parameters';
    }

    if (types.includes(ActionableType.TOOL)) {
      return 'apply_to_context'; // Use tool in context
    }

    if (types.includes(ActionableType.FORMULA)) {
      return 'perform_step';
    }

    return 'perform_step'; // Default for hard actions
  }
}
