import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {MoodleErrorPopupComponent} from './moodle-error-popup.component';

describe('MoodleErrorPopupComponent', () => {
  let component: MoodleErrorPopupComponent;
  let fixture: ComponentFixture<MoodleErrorPopupComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MoodleErrorPopupComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MoodleErrorPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
