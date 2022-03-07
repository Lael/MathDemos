import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BilliardsDemoComponent } from './billiards-demo.component';

describe('BilliardsDemoComponent', () => {
  let component: BilliardsDemoComponent;
  let fixture: ComponentFixture<BilliardsDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BilliardsDemoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BilliardsDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
