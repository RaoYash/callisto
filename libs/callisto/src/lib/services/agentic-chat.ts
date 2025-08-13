import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { z } from 'zod';

import { AgentToolDefinition, ToolRegistryService } from './tool-registry';
import { UIMessage } from '../../../../shared-types/src/lib/api-contract';


// Define a structure for our chat messages that includes UI-specific state
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  uiMessage?: UIMessage; // To hold the structured message from the agent
}

const AGENT_API_URL = 'http://localhost:3333/api/chat'; // URL to your agent-service

@Injectable({
  providedIn: 'root',
})
export class AgenticChatService {
  // Use a BehaviorSubject to hold the stream of messages
  public messages$ = new BehaviorSubject<ChatMessage[]>([]);
  public isLoading$ = new BehaviorSubject<boolean>(false);

  constructor(private toolRegistry: ToolRegistryService) {}

  /**
   * Sends a user message to the agent and handles the streaming response.
   * @param prompt The user's message.
   * @param toolDefinitions The tools available for this session.
   */
  public async sendMessage(
    prompt: string,
    toolDefinitions: AgentToolDefinition[]
  ) {
    this.isLoading$.next(true);

    // Add the user's message to the chat
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
    };
    this.messages$.next([...this.messages$.getValue(), userMessage]);

    try {
      const response = await fetch(AGENT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: this.messages$.getValue(), // Send the current history
          tool_definitions: toolDefinitions,
        }),
      });

      if (!response.body) {
        throw new Error('Response body is empty.');
      }

      // Handle the streaming response from the agent
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value, { stream: true });
      }

      this.processAgentResponse(fullResponse);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      this.messages$.next([...this.messages$.getValue(), errorMessage]);
    } finally {
      this.isLoading$.next(false);
    }
  }

  /**
   * Processes the final, complete response from the agent.
   * @param responseJson The full JSON string from the agent.
   */
  private processAgentResponse(responseJson: string) {
    try {
      // The agent sends back the full final state, we take the last message
      const response = JSON.parse(responseJson);
      const lastMessage = response.messages[response.messages.length - 1];

      let agentChatMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
      };

      // Check for our special generative UI messages
      if (lastMessage.additional_kwargs?.type === 'agentic_ui_render_html') {
        const uiMessage = JSON.parse(lastMessage.content);
        agentChatMessage.content = uiMessage.message;
        agentChatMessage.uiMessage = uiMessage;
      } else if (
        lastMessage.tool_calls?.[0]?.type === 'agentic_ui_tool_call'
      ) {
        const toolCall = lastMessage.tool_calls[0];
        agentChatMessage.content = `Calling tool: ${toolCall.name}`;
        // This is where we execute the tool
        this.handleToolCall(toolCall.name, toolCall.args, toolCall.id);
      } else {
        agentChatMessage.content = lastMessage.content;
      }

      this.messages$.next([...this.messages$.getValue(), agentChatMessage]);
    } catch (error) {
      console.error('Error processing agent response:', error);
    }
  }

  /**
   * Executes a tool and sends the result back to the agent.
   * @param name The name of the tool to execute.
   * @param params The parameters for the tool.
   * @param toolCallId The ID of the tool call.
   */
  private async handleToolCall(name: string, params: any, toolCallId: string) {
    try {
      const result = await this.toolRegistry.executeTool(name, params);
      const toolMessage: ChatMessage = {
        id: toolCallId,
        role: 'tool',
        content: JSON.stringify(result),
      };
      // Add tool result to history and call agent again to process it
      this.messages$.next([...this.messages$.getValue(), toolMessage]);
      this.sendMessage(
        'Tool execution complete.',
        [] /* Pass tools again */
      );
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
    }
  }
}
