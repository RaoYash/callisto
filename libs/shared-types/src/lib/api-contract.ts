import { z } from 'zod';

// The fundamental message type for conversation.
export const TextMessageSchema = z.object({
  type: z.literal('text'),
  content: z.string(),
});

// Core of the SSR generative UI.
// A directive from the agent containing a server-rendered HTML string of a component.
export const RenderHtmlMessageSchema = z.object({
  type: z.literal('render_html'),
  html: z.string(),
  component_id: z.string(),
  message: z.string().optional(),
  schema: z.any(), // We use z.any() as this is a pass-through object.
  toolName: z.string(),
});

// The data submitted by the user from a dynamically rendered and hydrated UI component.
// This message resumes the agent's paused graph.
export const UserInputResultMessageSchema = z.object({
  type: z.literal('user_input_result'),
  tool_name: z.string(),
  data: z.record(z.any()), // The validated form data
});

// Core of the decoupled execution model.
// A directive from the agent for the frontend to execute a registered tool in its secure sandbox.
export const ToolCallMessageSchema = z.object({
  type: z.literal('tool_call'),
  name: z.string(),
  params: z.record(z.any()),
  tool_call_id: z.string(),
});

// The result (success or error) of a tool execution on the frontend.
// This message completes the tool execution loop.
export const ToolResultMessageSchema = z.object({
  type: z.literal('tool_result'),
  result: z.any(),
  tool_call_id: z.string(),
  is_error: z.boolean(),
});

// A union of all possible message types for end-to-end type safety.
export const UIMessageSchema = z.union([
  TextMessageSchema,
  RenderHtmlMessageSchema,
  UserInputResultMessageSchema,
  ToolCallMessageSchema,
  ToolResultMessageSchema,
]);

// We can infer the TypeScript types directly from the Zod schemas.
export type TextMessage = z.infer<typeof TextMessageSchema>;
export type RenderHtmlMessage = z.infer<typeof RenderHtmlMessageSchema>;
export type UserInputResultMessage = z.infer<typeof UserInputResultMessageSchema>;
export type ToolCallMessage = z.infer<typeof ToolCallMessageSchema>;
export type ToolResultMessage = z.infer<typeof ToolResultMessageSchema>;
export type UIMessage = z.infer<typeof UIMessageSchema>;
