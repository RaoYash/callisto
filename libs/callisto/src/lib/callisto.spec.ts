import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Callisto } from './callisto';

describe('Callisto', () => {
  let component: Callisto;
  let fixture: ComponentFixture<Callisto>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Callisto]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Callisto);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
