import { StateGraph, END, START, addMessages, Annotation } from '@langchain/langgraph';
import { ToolMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { AgentState, AgentToolDefinition } from './agent-state';
import { z } from 'zod';
import { zodToJsonSchema } from "zod-to-json-schema";
import axios from 'axios'; 

import {
  ToolCallMessage,
  RenderHtmlMessage,
} from '../../../../libs/shared-types/src/lib/api-contract';

const UI_RENDERING_SERVICE_URL = 'http://localhost:4000/render';

const model = new ChatOpenAI({
  temperature: 0,
  modelName: 'gpt-4o',
  // apiKey: "YOUR_API_KEY"
});

/**
 * The core "thinking" node of the agent.
 * It takes the current conversation history and the available tools,
 * then calls the LLM to decide on the next action.
 */
const agentNode = async (state: AgentState): Promise<Partial<AgentState>> => {
  const { messages, tool_definitions } = state;

  // Convert our tool definitions into a format LangChain understands
  const tools = Object.values(tool_definitions).map(
    ({ name, description, schema }) => ({
      type: 'function' as const,
      function: { name, description, parameters: zodToJsonSchema(schema) },
    })
  );

  const modelWithTools = model.withConfig({ tools });
  const response = await modelWithTools.invoke(messages);

  return { messages: [response] };
};

/**
 * This node is responsible for orchestrating the frontend tool call.
 * It validates the LLM's requested tool and parameters, then formats
 * a `tool_call` message to be sent to the frontend.
 * It does NOT execute the tool itself.
 */
const toolExecutorNode = (state: AgentState): Partial<AgentState> => {
  const lastMessage = state.messages[state.messages.length - 1];
  if (!(lastMessage instanceof AIMessage) || !lastMessage.tool_calls) {
    throw new Error('Invalid state: Expected an AIMessage with tool_calls.');
  }

  // This node will simply format the tool_call message for the frontend.
  // The actual execution happens on the client.
  // In a real implementation, you would create a ToolCallMessage for each call.
  const toolCall = lastMessage.tool_calls[0];
  const toolCallMessage: ToolCallMessage = {
    type: 'tool_call',
    name: toolCall.name,
    params: toolCall.args,
    tool_call_id: toolCall.id!,
  };

  // We are creating a custom message type here to send to the UI
  const customToolCallMessage = new AIMessage({
    content: '',
    tool_calls: [
      {
        ...toolCall,
        type: 'tool_call',
      },
    ],
  });

  return { messages: [customToolCallMessage] };
};

/**
 * The key to the generative UI. This node is triggered when the agent
 * needs more information from the user. It renders the required
 * Angular component to HTML on the server.
 */
const humanInTheLoopNode = async (
  state: AgentState
): Promise<Partial<AgentState>> => {
  const { pending_tool_name, tool_definitions } = state;
  if (!pending_tool_name) {
    throw new Error('Invalid state: pending_tool_name is not set.');
  }

  const tool = tool_definitions[pending_tool_name];
  if (!tool) {
    throw new Error(`Tool ${pending_tool_name} not found.`);
  }

  let componentHtml = '';
  try {
    const response = await axios.post(UI_RENDERING_SERVICE_URL, {
      component: 'agentic-dynamic-form', // The component we want to render
      schema:  zodToJsonSchema(tool.schema), // Send the schema definition
      toolName: tool.name,
    });
    componentHtml = response.data.html;
  } catch (error) {
    console.error('Failed to render component via rendering service:', error);
    // Create an error message to send back to the user
    const errorMessage = new AIMessage({
      content:
        "Sorry, I'm having trouble generating the form right now. Please try again in a moment.",
    });
    return { messages: [errorMessage] };
  }

  // Create the special `render_html` message to send to the frontend.
  const renderMessage: RenderHtmlMessage = {
    type: 'render_html',
    html: componentHtml,
    component_id: 'dynamic-form',
    message: `I need some more information to ${tool.description.toLowerCase()}.`,
    schema: tool.schema, // Pass the Zod schema object to the client
    toolName: tool.name, // Pass the tool name to the client
  };

  // We wrap this special directive in a custom AIMessage
  const customRenderMessage = new AIMessage({
    content: JSON.stringify(renderMessage),
    // We add a special type to distinguish this from a standard AI message
    additional_kwargs: { type: 'agentic_ui_render_html' },
  });

  return { messages: [customRenderMessage] };
};

/**
 * This is a conditional edge. It routes the conversation based on the
 * agent's last message, deciding whether to call a tool, ask the user
 * for input, or end the conversation.
 */
const shouldContinue = (
  state: AgentState
): 'tool_executor' | 'human_in_the_loop' | '__end__' => {
  const lastMessage = state.messages[state.messages.length - 1];

  if (!(lastMessage instanceof AIMessage)) {
    return '__end__'; // Should not happen in a well-formed graph
  }

  // If the AI message has tool calls, check if we have the parameters
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    const toolCall = lastMessage.tool_calls[0];
    const toolSchema = state.tool_definitions[toolCall.name]?.schema;

    if (!toolSchema) {
      // LLM hallucinated a tool that doesn't exist.
      // We can add a node to handle this error gracefully. For now, end.
      return '__end__';
    }

    // Try to parse the arguments. If it fails, we need user input.
    const validation = toolSchema.safeParse(toolCall.args);
    if (!validation.success) {
      // Parameters are missing or invalid. Transition to the human_in_the_loop node.
      // We also update the state to remember which tool we were trying to call.
      state.requires_user_input = true;
      state.pending_tool_name = toolCall.name;
      return 'human_in_the_loop';
    } else {
      // All good, parameters are present and valid. Go to the tool executor.
      state.requires_user_input = false;
      state.pending_tool_name = undefined;
      return 'tool_executor';
    }
  }

  // If there are no tool calls, the agent has a final answer.
  return '__end__';
};

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    default: () => [],
    reducer: (x, y) => x.concat(y),
  }),
  tool_definitions: Annotation<Record<string, AgentToolDefinition>>({
    default: () => ({}),
    reducer: (x, y) => ({ ...x, ...y }),
  }),
  requires_user_input: Annotation<boolean>({
    default: () => false,
    reducer: (_, y) => y,
  }),
  pending_tool_name: Annotation<string | undefined>({
    default: () => undefined,
    reducer: (_, y) => y,
  }),
});

const workflow = new StateGraph(AgentState);

// Add the nodes
workflow
.addNode('agent', agentNode)
.addNode('tool_executor', toolExecutorNode)
.addNode('human_in_the_loop', humanInTheLoopNode)
.addEdge(START, 'agent')
.addConditionalEdges('agent', shouldContinue, {
  tool_executor: 'tool_executor',
  human_in_the_loop: 'human_in_the_loop',
  __end__: END,
})
.addEdge('tool_executor', END)
.addEdge('human_in_the_loop', END);

// Compile the graph into a runnable app
export const app = workflow.compile();
