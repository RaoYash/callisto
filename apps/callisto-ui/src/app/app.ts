import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { z } from 'zod';


import { ChatPanelComponent } from '../../../../libs/callisto/src/lib/components/chat-panel/chat-panel';
import { ToolRegistryService } from '../../../../libs/callisto/src/lib/services/tool-registry';

@Component({
  standalone: true,
  imports: [RouterModule, ChatPanelComponent], // Import the chat panel
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  title = 'my-agentic-workspace';

  toolRegistry = inject(ToolRegistryService);

  constructor() {}

  ngOnInit(): void {
    this.registerTools();
  }

  /**
   * This is where the host application defines its tools and registers them
   * with the ng-agentic-ui library.
   */
  private registerTools(): void {
    // 1. Define the schema for the tool using Zod
    const flightSearchSchema = z
      .object({
        departureCity: z.string().nonempty(),
        arrivalCity: z.string().nonempty(),
        departureDate: z.string(),
      })
      .describe('Search for available flights');

    // 2. Define the actual function to execute
    const searchFlights = async (params: z.infer<typeof flightSearchSchema>) => {
      console.log('Searching for flights with params:', params);
      // In a real app, this would make an API call
      return {
        status: 'success',
        flights: [
          { flight: 'UA123', departs: '08:00', arrives: '10:30' },
          { flight: 'AA456', departs: '09:15', arrives: '11:45' },
        ],
      };
    };

    // 3. Register the tool with the service
    this.toolRegistry.registerTool(
      'searchFlights',
      searchFlights,
      flightSearchSchema
    );
  }
}
