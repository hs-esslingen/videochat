import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {MoodlePopupComponent} from './moodle-popup.component';

describe('MoodlePopupComponent', () => {
  let component: MoodlePopupComponent;
  let fixture: ComponentFixture<MoodlePopupComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MoodlePopupComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MoodlePopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
