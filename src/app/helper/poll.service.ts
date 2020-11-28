import {Injectable} from '@angular/core';
import {Poll, Question, QuestionType} from '../model/poll';

@Injectable({
  providedIn: 'root',
})
export class PollService {
  private polls: {[id: string]: Poll} = {};

  constructor() {}

  public addPoll(): Poll {
    const poll = new Poll(
      '2',
      undefined,
      false,
      undefined,
      [
        {
          type: QuestionType.SINGLE_CHOICE,
          questionText: 'Magst du Bratwurst?',
          answers: [{text: 'Ja'}, {text: 'Nein'}],
          solution: undefined,
          id: Math.random().toString(36).substr(2, 8),
        },
        {
          type: QuestionType.MULTIPLE_CHOICE,
          questionText: 'Wer ist Deutsch?',
          answers: [{text: 'Merkel'}, {text: 'Tobi'}, {text: 'Trump'}],
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
