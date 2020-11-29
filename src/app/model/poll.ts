export class Poll {
  constructor(
    public id: string,
    public createdAt: string,
    public title?: string,
    public state: PollState = 0,
    public owner?: string, // User ID
    public questions: Question[] = [],
    public newMessage: boolean = false,
    public opened: boolean = false,
    public publishedAt?: string
  ) {}
}

export interface Question {
  id: string;
  type: QuestionType;
  questionText: string;
  answers: Answer[];
  solution: string | undefined;
}

export interface PollResults {
  pollId: string;
  questions: {[questionId: string]: string | string[]};
}

export interface Answer {
  text?: string;
  id: string;
}

export enum PollState {
  CREATED = 0,
  RELEASED = 1,
  CLOSED = 2,
}

export enum QuestionType {
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  FREE_TEXT = 'FREE_TEXT',
}
