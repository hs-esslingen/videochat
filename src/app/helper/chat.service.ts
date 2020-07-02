import {Injectable} from '@angular/core';
import {Subscriber, Observable, Subject, Subscription} from 'rxjs';
import {User, CurrentUser} from '../model/user';
import {Chat, Message} from '../model/chat';
import {ApiService} from './api.service';
import {WsReadyState, WsService} from './ws.service';

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

    // const testData = [
    //   {
    //     id: 'public_chat',
    //     messages: [
    //       {sender: 'Hr. Rößler', text: 'Guten Morgen!'},
    //       {sender: 'Claus', text: 'Morgen!'},
    //       {sender: 'Rolf', text: 'Guten Morgen'},
    //       {sender: 'Emilia', text: 'Guten Morgen :)'},
    //       {sender: 'Lukas', text: 'Moin'},
    //       {sender: 'Christina', text: 'Hallo'},
    //       {sender: 'Ali', text: 'Tach'},
    //       {sender: 'Kevin', text: 'Verstehe ich nicht'},
    //       {sender: 'Der King', text: 'Hör halt mal zu...'},
    //       {sender: 'Emilia', text: 'Ich dachte mit dem Kindergarten sind wir durch im Studium.'},
    //       {sender: 'Lukas', text: 'Oh boi^^'},
    //       {sender: 'Rolf', text: 'Ihre Folien verändern sich nichtmehr...'},
    //       {sender: 'Claus', text: '+'},
    //       {sender: 'Emilia', text: '+'},
    //       {sender: 'Lukas', text: '+'},
    //       {sender: 'Christina', text: '+'},
    //       {sender: 'Hr. Rößler', text: 'Okay, dann hören wir auf für heute.'},
    //       {sender: 'Vladimir', text: 'Jo, lass mal chillen nachher.'},
    //       {sender: 'Ali', text: 'Bruder, nee. Is Corona.'},
    //       {sender: 'Der King', text: 'Ach komm, nen Bierchen geht immer.'},
    //     ],
    //     newMessage: true,
    //   },
    // ];

    // this.chats = testData.map(jsonObj => Chat.fromJson(jsonObj));
  }

  public async init(roomId: string, userId: string) {
    this.userId = userId;
    const messages = await this.api.getMessages(roomId);
    this.chats = {};
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
    const chat = new Chat(user.id);
    this.chats[chat.id] = chat;
    this.triggerSubject();
    return chat;
  }

  private addMessage(message: Message) {
    let chatId;
    if (message.to) {
      if (message.to === this.userId) chatId = message.from;
      else chatId = message.to;
      // private chat
    } else {
      chatId = 'public_chat';
    }
    if (this.chats[chatId] == null) this.chats[chatId] = new Chat(chatId);
    const chat = this.chats[chatId];
    chat.messages.push(message);
  }

  public async sendMessage(message: string, to?: string) {
    await this.api.sendMessage(this.roomId, message, to);
  }
}

export type ChatObservable = Observable<{chats: Chat[]}>;
