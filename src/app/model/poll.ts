export class Poll {
  constructor(
    public id?: string,
    public title?: string,
    public releaseStatus?: boolean,
    public owner?: string, // Maybe User ID
    public questions: Question[] = [],
    public newMessage: boolean = false,
    public opened: boolean = false
  ) {}
}

export class Question {
  constructor(
    // Nee ich will hier keinen Einzeiler
    public type: QuestionType,
    public questionText: string,
    public answers: Answer[],
    public solution: string | undefined
  ) {}

  addAnswer(): void {
    console.log('Add answer!');
    this.answers.push({});
  }
}

export interface Answer {
  text?: string;
}

export enum QuestionType {
  SINGLE_CHOICE = 'Single Choice',
  MULTIPLE_CHOICE = 'Multiple Choice',
  FREE_TEXT = 'Free Text',
}
