import { TestBed } from '@angular/core/testing';

import { ToolRegistry } from './tool-registry';

describe('ToolRegistry', () => {
  let service: ToolRegistry;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToolRegistry);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
