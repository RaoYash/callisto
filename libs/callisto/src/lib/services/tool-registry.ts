import { Injectable } from '@angular/core';
import { z } from 'zod';

/**
 * Defines the structure for a registered tool.
 * This interface is used internally by the service to store
 * all the necessary information about a tool.
 */
export interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  // The actual function to execute on the client-side.
  toolFn: (params: any) => Promise<any>;
  // Placeholder for role-based access control.
  permissions: string[];
}

/**
 * Defines the structure of the tool definitions that will be
 * sent to the backend agent. We only send the name, description,
 * and the schema, not the function itself.
 */
export interface AgentToolDefinition {
    name: string;
    description: string;
    schema: z.ZodObject<any>;
}


@Injectable({
  providedIn: 'root',
})
export class ToolRegistryService {
  /**
   * A private Map to store all registered tools.
   * Using a Map allows for efficient lookup by tool name.
   */
  private readonly tools = new Map<string, ToolDefinition>();

  constructor() {}

  /**
   * Allows the host application to register a client-side function as a tool.
   *
   * @param name - A unique name for the tool.
   * @param toolFn - The actual async function to be executed.
   * @param schema - The Zod schema defining the tool's input parameters.
   * The schema's `.describe()` method is used as the tool's description.
   * @param permissions - An array of strings representing required permissions (e.g., ['admin']).
   */
  registerTool(
    name: string,
    toolFn: (params: any) => Promise<any>,
    schema: z.ZodObject<any>,
    permissions: string[] = []
  ): void {
    if (this.tools.has(name)) {
      console.warn(`Tool with name "${name}" is already registered. Overwriting.`);
    }

    const description = schema.description || 'No description provided.';

    this.tools.set(name, {
      name,
      description,
      schema,
      toolFn,
      permissions,
    });
  }

  /**
   * Retrieves the definitions of all tools that the current user has permission to access.
   * This is called at the start of a chat session to inform the agent of its capabilities.
   *
   * @param currentUserPermissions - The permissions of the user currently interacting with the agent.
   * @returns An array of tool definitions (name, description, schema) to be sent to the backend.
   */
  getToolDefinitionsForAgent(currentUserPermissions: string[]): AgentToolDefinition[] {
    const authorizedTools: AgentToolDefinition[] = [];
    for (const tool of Array.from(this.tools.values())) {
      // If the tool has no required permissions, it's public.
      // Otherwise, check if the user has at least one of the required permissions.
      const isAuthorized =
        tool.permissions.length === 0 ||
        tool.permissions.some((p) => currentUserPermissions.includes(p));

      if (isAuthorized) {
        authorizedTools.push({
          name: tool.name,
          description: tool.description,
          schema: tool.schema,
        });
      }
    }
    return authorizedTools;
  }

  /**
   * Securely executes a registered tool by its name.
   * This will be called by the chat component when it receives a `tool_call` directive.
   *
   * @param name - The name of the tool to execute.
   * @param params - The parameters to pass to the tool's function.
   * @returns A promise that resolves with the tool's result.
   */
  async executeTool(name: string, params: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found.`);
    }

    // Here, we would add the security sandboxing logic (e.g., using an iframe).
    // For now, we'll execute it directly for simplicity.
    console.log(`Executing tool: ${name} with params:`, params);

    try {
        // Validate parameters against the schema before execution
        tool.schema.parse(params);
        return await tool.toolFn(params);
    } catch (error) {
        console.error(`Error executing tool "${name}":`, error);
        if (error instanceof z.ZodError) {
            throw new Error(`Invalid parameters for tool ${name}: ${error.message}`);
        }
        throw error; // Re-throw other errors
    }
  }
}
