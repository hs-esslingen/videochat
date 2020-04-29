import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { JoinMeetingPopupComponent } from './join-meeting-popup.component';

describe('JoinMeetingPopupComponent', () => {
  let component: JoinMeetingPopupComponent;
  let fixture: ComponentFixture<JoinMeetingPopupComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ JoinMeetingPopupComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(JoinMeetingPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
