import {User} from './user';

export class Chat {
  constructor(public id?: string, public messages: Message[] = [], public newMessage: boolean = false, public partnerId?: string) {}
}

export interface Message {
  from: string;
  to?: string;
  time: number;
  message: string;
  // time:   Date;
}

type ChatJson = {
  id: string;
  partner?: User;
  messages: Message[];
  newMessage: boolean;
};
