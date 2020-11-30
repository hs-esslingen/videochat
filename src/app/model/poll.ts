export class Poll {
  constructor(
    public id: string,
    public createdAt: string,
    public title?: string,
    public state: PollState = 0,
    public owner?: string, // User ID
    public questions: Question[] = [],
    public responders: string[] = [],
    public responded: boolean = false,
    public publishedAt?: string
  ) {}
  static fromJson({id, createdAt, title, state, owner, questions, responders, responded, publishedAt}: Poll) {
    return new Poll(id, createdAt, title, state, owner, questions, responders, responded, publishedAt);
  }
  // update(poll: Poll): void {
  //   this.id = poll.id;
  //   this.createdAt = poll.createdAt;
  //   this.title = poll.title;
  //   this.state = poll.state;
  //   this.owner = poll.owner;
  //   this.responders = poll.responders;
  //   this.responded = poll.responded;
  //   this.publishedAt = poll.publishedAt;
  //   this.questions.forEach(existingQuestion => {
  //     const newQuestion = poll.questions.find(q => existingQuestion.id === q.id);
  //     existingQuestion.results;
  //   });
  // }
}

export interface Question {
  id: string;
  type: QuestionType;
  questionText: string;
  answers: Answer[];
  solution: string | undefined;
  results?: {[uid: string]: string | string[]};
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
