import {Injectable} from '@angular/core';
import {FormControl, FormGroup, Validators, ValidationErrors, AbstractControl} from '@angular/forms';
import {Subject, Subscription} from 'rxjs';
import {Poll, PollState, Question, QuestionType} from '../model/poll';
import {UserRole} from '../model/user';
import {ApiService} from './api.service';
import {WsService} from './ws.service';

@Injectable({
  providedIn: 'root',
})
export class PollService {
  private pollSubject: PollSubject;
  private polls: {[id: string]: Poll} = {};
  private roomId!: string;
  private uid!: string;
  private forms: {[id: string]: FormGroup} = {};
  protected userRole!: UserRole;

  constructor(private ws: WsService, private api: ApiService) {
    this.pollSubject = new Subject();
    ws.subscribeMessage(message => {
      switch (message.type) {
        case 'poll-update':
        case 'poll-publish':
          {
            const poll = message.data as Poll;
            if (this.polls[poll.id]) {
              this.polls[poll.id] = Object.assign(this.polls[poll.id], poll);
            } else {
              this.polls[poll.id] = Poll.fromJson(poll);
            }
            this.pollSubject.next(Object.values(this.polls));
          }
          break;
        case 'poll-close':
          if (this.polls[message.data]) {
            this.polls[message.data].state = PollState.CLOSED;
            this.pollSubject.next(Object.values(this.polls));
          }
          break;
      }
    });
  }

  public subscribe(callback: (v: Poll[]) => void): Subscription {
    return this.pollSubject.subscribe({
      next: callback,
    });
  }

  public async init(roomId: string, uid: string, role: UserRole) {
    this.roomId = roomId;
    this.uid = uid;
    this.userRole = role;
    this.polls = {};
    //TODO: fill FormGroup to show questions
    this.polls = await (await this.api.getPolls(roomId)).reduce((obj: {[id: string]: Poll}, poll) => {
      obj[poll.id] = poll;
      return obj;
    }, {});
    this.pollSubject.next(Object.values(this.polls));
  }

  public addPoll(): Poll {
    const poll: Poll = Poll.fromJson({
      id: Math.random().toString(36).substr(2, 8),
      createdAt: new Date(Date.now()).toISOString(),
      title: '',
      state: PollState.CREATED,
      owner: this.uid,
      questions: [
        {
          type: QuestionType.SINGLE_CHOICE,
          questionText: '',
          answers: [],
          solution: undefined,
          id: Math.random().toString(36).substr(2, 8),
        },
      ],
      responded: false,
      responders: [],
    });
    this.polls[poll.id] = poll;
    this.pollSubject.next(Object.values(this.polls));
    return poll;
  }

  public beforePublishPoll(poll: Poll): boolean {
    if (!poll.title || poll.title === '') return false;
    for (const question of poll.questions) {
      if (question.questionText === '') return false;
      if (question.type !== QuestionType.FREE_TEXT && question.answers.length === 0) return false;
    }
    return true;
  }

  public async publishPoll(poll: Poll) {
    await this.api.publishPoll(this.roomId, poll);
    this.polls[poll.id].state = PollState.RELEASED;
    this.pollSubject.next(Object.values(this.polls));
  }

  public async submitPoll(pollId: string, data: {[key: string]: string | string[] | {[key: string]: boolean}}) {
    // transform data
    for (const key in data) {
      const obj = data[key];
      if (typeof obj === 'object' && !Array.isArray(obj)) {
        const items = Object.keys(obj).filter(item => obj[item]);
        data[key] = items;
      }
    }
    await this.api.submitPollResponse(this.roomId, {
      pollId: pollId,
      questions: data as {[questionId: string]: string | string[]},
    });
    this.forms[pollId].disable();
    this.polls[pollId].responded = true;
  }

  public getPoll(id: string): Poll {
    return this.polls[id];
  }

  public getForm(id: string): FormGroup {
    const poll = this.polls[id];
    if (poll && poll.state >= PollState.RELEASED) {
      if (this.forms[id]) return this.forms[id];

      this.forms[id] = new FormGroup(
        poll.questions.reduce((prev, question) => {
          if (question.type === QuestionType.MULTIPLE_CHOICE) {
            prev[question.id] = new FormGroup(
              question.answers.reduce((prev, answer) => {
                prev[answer.id] = new FormControl('');
                return prev;
              }, {} as {[key: string]: FormControl}),
              (control: AbstractControl): ValidationErrors | null => {
                if (control instanceof FormGroup) {
                  for (const key of Object.keys(control.controls)) {
                    if (control.controls[key].value === true) return null;
                  }
                  return {
                    requireCheckboxesToBeChecked: true,
                  };
                }
                return null;
              }
            );
          } else {
            prev[question.id] = new FormControl('', Validators.required);
          }
          return prev;
        }, {} as {[key: string]: FormControl | FormGroup})
      );
      return this.forms[id];
    }
    throw new Error('poll is not released');
  }

  public addElement(pollId: string): Question {
    const newQuestion = {type: QuestionType.SINGLE_CHOICE, questionText: '', answers: [], solution: undefined, id: Math.random().toString(36).substr(2, 8)};
    this.polls[pollId].questions.push(newQuestion);
    return newQuestion;
  }

  public deleteElement(pollId: string, questionId: string) {
    this.polls[pollId].questions = this.polls[pollId].questions.filter(item => item.id !== questionId);
  }
}

export type PollSubject = Subject<Poll[]>;
