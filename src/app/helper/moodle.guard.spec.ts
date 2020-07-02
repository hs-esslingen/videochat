import {TestBed} from '@angular/core/testing';

import {MoodleGuard} from './moodle.guard';

describe('MoodleGuard', () => {
  let guard: MoodleGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(MoodleGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
