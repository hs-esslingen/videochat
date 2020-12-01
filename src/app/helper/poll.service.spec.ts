import {TestBed} from '@angular/core/testing';
import {Poll, PollState} from '../model/poll';
import {UserRole} from '../model/user';
import {ApiService} from './api.service';

import {PollService} from './poll.service';
import {WsService} from './ws.service';

describe('PollService', () => {
  let service: PollService;

  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj('ApiService', {getPolls: [], publishPoll: '', submitPollResponse: ''});
    const wsSpy = jasmine.createSpyObj('WsService', ['subscribeMessage']);
    TestBed.configureTestingModule({
      providers: [
        {provide: ApiService, useValue: apiSpy},
        {provide: WsService, useValue: wsSpy},
      ],
    });
    service = TestBed.inject(PollService);
    apiServiceSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('publishPoll should call api', () => {
    const poll = service.addPoll();
    poll.title = 'test';
    poll.questions[0].questionText = 'test question';
    poll.questions[0].answers = [{text: 'test answer', id: '#####'}];
    service.publishPoll(poll);
    expect(apiServiceSpy.publishPoll.calls.count()).toBe(1);
  });

  it('beforePublishPoll should be false', () => {
    const poll = service.addPoll();
    expect(service.beforePublishPoll(poll)).toBe(false);
  });

  it('beforePublishPoll should be true', () => {
    const poll = service.addPoll();
    poll.title = 'test';
    poll.questions[0].questionText = 'test question';
    poll.questions[0].answers = [{text: 'test answer', id: '#####'}];
    expect(service.beforePublishPoll(poll)).toBe(true);
  });

  it('should return the poll', () => {
    const poll = service.addPoll();
    expect(service.getPoll(poll.id)).toBe(poll);
  });

  it('should submit the poll', () => {
    const poll = service.addPoll();
    poll.title = 'test';
    poll.state = PollState.RELEASED;
    poll.questions[0].questionText = 'test question';
    poll.questions[0].answers = [{text: 'test answer', id: '#####'}];
    service.getForm(poll.id);
    service.submitPoll(poll.id, {[poll.questions[0].id]: poll.questions[0].answers[0].id});
    expect(apiServiceSpy.submitPollResponse.calls.count()).toBe(1);
  });

  it('should add an element', () => {
    const poll = service.addPoll();
    const initialElements = poll.questions.length;
    service.addElement(poll.id);
    expect(poll.questions.length).toBe(initialElements + 1);
  });

  it('should delete an element', () => {
    const poll = service.addPoll();
    service.deleteElement(poll.id, poll.questions[0].id);
    expect(poll.questions.length).toBe(0);
  });

  it('init should getPolls', () => {
    service.init('testId', '#########', UserRole.USER);
    expect(apiServiceSpy.getPolls.calls.count()).toBe(1);
  });
});
