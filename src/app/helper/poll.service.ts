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
        new Question(QuestionType.SINGLE_CHOICE, 'Magst du Bratwurst?', [{text: 'Ja'}, {text: 'Nein'}], undefined),
        new Question(QuestionType.MULTIPLE_CHOICE, 'Wer ist Deutsch?', [{text: 'Merkel'}, {text: 'Tobi'}, {text: 'Trump'}], undefined),
        // {questionText: 'Worauf haste bock?', type: QuestionType.FREE_TEXT, answers: [], solution: undefined},
      ],
      false,
      false
    );
    return poll;
  }
}
