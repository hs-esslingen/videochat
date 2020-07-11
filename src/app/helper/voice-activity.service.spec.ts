import {TestBed} from '@angular/core/testing';

import {VoiceActivityService} from './voice-activity.service';

describe('VoiceActivityService', () => {
  let service: VoiceActivityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VoiceActivityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
