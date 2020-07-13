import {Injectable} from '@angular/core';
import {Observable, Subject, Subscription} from 'rxjs';
import {User} from '../model/user';
import {Chat, Message} from '../model/chat';
import {ApiService} from './api.service';
import {WsService} from './ws.service';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private chats: {[id: string]: Chat} = {};
  private userId: string;
  private roomId: string;
  private chatSubject: Subject<{[id: string]: Chat}>;

  constructor(private api: ApiService, private ws: WsService) {
    this.chatSubject = new Subject();
    this.userId = '';
    this.roomId = '';
    ws.messageSubject.subscribe(e => {
      if (e.type === 'message') {
        const message = e.data as Message;
        this.addMessage(message);
        this.triggerSubject();
      }
    });
  }

  public async init(roomId: string, userId: string) {
    this.userId = userId;
    this.roomId = roomId;
    const messages = await this.api.getMessages(roomId);
    this.chats = {};
    this.chats['public_chat'] = new Chat(undefined);
    for (const message of messages) {
      this.addMessage(message);
    }
    this.triggerSubject();
  }

  public getChats(): {[id: string]: Chat} {
    return this.chats;
  }

  public subscribe(callback: (v: {[id: string]: Chat}) => void): Subscription {
    return this.chatSubject.subscribe({
      next: callback,
    });
  }

  private triggerSubject() {
    this.chatSubject.next(this.chats);
  }

  public addChat(user: User): Chat {
    let chat: Chat;
    if (this.chats[user.id] === undefined) {
      chat = new Chat(user.id);
      this.chats[user.id] = chat;
    } else {
      this.chats[user.id].hidden = false;
      chat = this.chats[user.id];
    }
    console.log(user);
    console.log(chat);

    this.triggerSubject();
    return chat;
  }

  public hideChat(chat: Chat): void {
    if (chat.id != null) this.chats[chat.id].hidden = true;
  }
  public removeNewMessageInfo(chat: Chat): void {
    if (chat.id == null) this.chats['public_chat'].newMessage = false;
    else this.chats[chat.id].newMessage = false;
  }
  public chatToggleOpen(chat: Chat): void {
    if (chat.id == null) this.chats['public_chat'].opened = !this.chats['public_chat'].opened;
    else this.chats[chat.id].opened = !this.chats['public_chat'].opened;
    console.log('Opened / Closed Chat with ' + chat.id);
  }

  private addMessage(message: Message) {
    let chat: Chat;
    if (message.to) {
      let partner = message.to;
      if (partner === this.userId) partner = message.from;
      // private chat
      if (this.chats[partner] == null) this.chats[partner] = new Chat(partner);
      chat = this.chats[partner];
    } else {
      chat = this.chats['public_chat'];
    }
    chat.messages.push(message);
    if (!chat.opened) chat.newMessage = true;
    chat.hidden = false;
  }

  public async sendMessage(message: string, to?: string) {
    await this.api.sendMessage(this.roomId, message, to);
  }
}

export type ChatObservable = Observable<{chats: Chat[]}>;
