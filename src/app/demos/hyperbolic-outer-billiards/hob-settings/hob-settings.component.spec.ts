import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HobSettingsComponent } from './hob-settings.component';

describe('HobSettingsComponent', () => {
  let component: HobSettingsComponent;
  let fixture: ComponentFixture<HobSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HobSettingsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HobSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
