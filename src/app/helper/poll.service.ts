import {Injectable} from '@angular/core';
import {Poll, PollState, Question, QuestionType} from '../model/poll';
import {WsService} from './ws.service';

@Injectable({
  providedIn: 'root',
})
export class PollService {
  private polls: {[id: string]: Poll} = {};

  constructor(ws: WsService) {
    ws.messageSubject.subscribe(message => {
      switch (message.type) {
        case 'poll-update':
          break;
        case 'poll-publish':
          break;
        case 'poll-close':
          break;
      }
    });
  }

  public addPoll(): Poll {
    const poll = new Poll(
      '2',
      new Date(Date.now()).toISOString(),
      undefined,
      PollState.CREATED,
      undefined,
      [
        {
          type: QuestionType.SINGLE_CHOICE,
          questionText: 'Magst du Bratwurst?',
          answers: [
            {text: 'Ja', id: Math.random().toString(36).substr(2, 8)},
            {text: 'Nein', id: Math.random().toString(36).substr(2, 8)},
          ],
          solution: undefined,
          id: Math.random().toString(36).substr(2, 8),
        },
        {
          type: QuestionType.MULTIPLE_CHOICE,
          questionText: 'Wer ist Deutsch?',
          answers: [
            {text: 'Merkel', id: Math.random().toString(36).substr(2, 8)},
            {text: 'Tobi', id: Math.random().toString(36).substr(2, 8)},
            {text: 'Trump', id: Math.random().toString(36).substr(2, 8)},
          ],
          solution: undefined,
          id: Math.random().toString(36).substr(2, 8),
        },
        // {questionText: 'Worauf haste bock?', type: QuestionType.FREE_TEXT, answers: [], solution: undefined},
      ],
      false,
      false
    );
    this.polls[poll.id] = poll;
    return poll;
  }

  public getPoll(id: string): Poll {
    return this.polls[id];
  }

  public addElement(id: string): Question {
    const newQuestion = {type: QuestionType.SINGLE_CHOICE, questionText: '', answers: [], solution: undefined, id: Math.random().toString(36).substr(2, 8)};
    this.polls[id].questions.push(newQuestion);
    return newQuestion;
  }

  public deleteElement(pollId: string, questionId: string) {
    this.polls[pollId].questions = this.polls[pollId].questions.filter(item => item.id !== questionId);
  }
}
