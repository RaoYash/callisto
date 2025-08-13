import { TestBed } from '@angular/core/testing';

import { ZodFormBuilder } from './zod-form-builder';

describe('ZodFormBuilder', () => {
  let service: ZodFormBuilder;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ZodFormBuilder);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
