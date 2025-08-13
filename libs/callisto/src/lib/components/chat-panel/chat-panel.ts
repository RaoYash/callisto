import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AgenticChatService,
  ChatMessage,
} from '../../services/agentic-chat';
import { ToolRegistryService } from '../../services/tool-registry';
import { Observable } from 'rxjs';
import { DynamicFormComponent } from '../dynamic-form/dynamic-form';

@Component({
  selector: 'agentic-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, DynamicFormComponent],
  templateUrl: './chat-panel.html',
  styleUrls: ['./chat-panel.scss'],
})
export class ChatPanelComponent {
  messages$: Observable<ChatMessage[]>;
  isLoading$: Observable<boolean>;
  userInput = '';

  constructor(
    private chatService: AgenticChatService,
    private toolRegistry: ToolRegistryService
  ) {
    this.messages$ = this.chatService.messages$;
    this.isLoading$ = this.chatService.isLoading$;
  }

  async sendMessage() {
    if (!this.userInput.trim()) return;

    // Get the definitions of all registered tools to send to the agent
    const toolDefinitions = this.toolRegistry.getToolDefinitionsForAgent([]); // Pass user permissions here
    await this.chatService.sendMessage(this.userInput, toolDefinitions);
    this.userInput = '';
  }

  // This will handle the submission from our dynamically rendered form
  onFormSubmit(event: { tool_name: string; data: any }) {
    console.log('Form submitted in chat panel:', event);
    // Here you would create a ToolMessage and send it back to the agent
    // This part of the flow requires further implementation in the chat service
  }
}
