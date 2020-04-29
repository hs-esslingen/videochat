import { TestBed } from '@angular/core/testing';

import { LocalMediaService } from './local-media.service';

describe('LocalMediaService', () => {
  let service: LocalMediaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalMediaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
