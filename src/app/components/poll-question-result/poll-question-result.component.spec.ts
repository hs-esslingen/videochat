import {ComponentFixture, TestBed} from '@angular/core/testing';

import {PollQuestionResultComponent} from './poll-question-result.component';

describe('PollQuestionResultComponent', () => {
  let component: PollQuestionResultComponent;
  let fixture: ComponentFixture<PollQuestionResultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PollQuestionResultComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PollQuestionResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
