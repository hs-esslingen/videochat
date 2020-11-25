import {Injectable} from '@angular/core';
import {Poll, QuestionType} from '../model/poll';

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
        {questionText: 'Magst du Bratwurst?', type: QuestionType.SINGLE_CHOICE, answers: [{text: 'Ja'}, {text: 'Nein'}], solution: undefined},
        {
          questionText: 'Wer ist Deutsch?',
          type: QuestionType.MULTIPLE_CHOICE,
          answers: [{text: 'Merkel'}, {text: 'Tobi'}, {text: 'Trump'}],
          solution: undefined,
        },
        // {questionText: 'Worauf haste bock?', type: QuestionType.FREE_TEXT, answers: [], solution: undefined},
      ],
      false,
      false
    );
    return poll;
  }
}
