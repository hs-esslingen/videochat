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

export interface Question {
  type: QuestionType;
  questionText: string;
  answers: Answer[];
  solution: string | undefined;
}

export interface Answer {
  text: string;
}

export enum QuestionType {
  SINGLE_CHOICE = 'Single Choice',
  MULTIPLE_CHOICE = 'Multiple Choice',
  FREE_TEXT = 'Free Text',
}
