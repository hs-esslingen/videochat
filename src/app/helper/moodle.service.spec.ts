import { TestBed } from '@angular/core/testing';

import { MoodleService } from './moodle.service';

describe('MoodleService', () => {
  let service: MoodleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MoodleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
