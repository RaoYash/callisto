import { TestBed } from '@angular/core/testing';

import { AgenticChat } from './agentic-chat';

describe('AgenticChat', () => {
  let service: AgenticChat;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AgenticChat);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
