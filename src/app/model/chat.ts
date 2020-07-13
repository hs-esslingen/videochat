export class Chat {
  constructor(
    public id?: string,
    public messages: Message[] = [],
    public newMessage: boolean = false,
    public partnerId?: string,
    public hidden: boolean = false
  ) {}
}

export interface Message {
  from: string;
  to?: string;
  time: number;
  message: string;
}
