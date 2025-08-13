import { BaseMessage } from '@langchain/core/messages';
import { z } from 'zod';

/**
 * Defines the structure of a tool's definition that the agent will know about.
 * This is a simplified version of the full ToolDefinition from the frontend,
 * containing only what the agent needs to make decisions.
 */
export interface AgentToolDefinition {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
}

/**
 * This is the core state for our LangGraph agent.
 * It's a "living" object that gets passed around and updated
 * as the agent works through a problem.
 */
export interface AgentState {
  // A list of all messages in the conversation so far.
  messages: BaseMessage[];

  // A record of the tools the agent is allowed to use for the current session.
  tool_definitions: Record<string, AgentToolDefinition>;

  // A flag indicating that the agent has paused and requires user input
  // via a dynamically rendered form.
  requires_user_input: boolean;

  // If the agent needs user input, this holds the name of the tool
  // it was trying to call.
  pending_tool_name?: string;
}
