import { Injectable } from "@angular/core";
import { User, Signal, Message } from "./media.service";
import { Subscriber, Observable, Observer } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class ChatService {
  private chats: Chat[];
  private chatSubscriber?: Subscriber<{ chats: Chat[] }>;
  private chatObservable?: ChatObservable;

  constructor() {

    const testData = [
      { id: "public_chat",
        messages: [
          {sender: "Hr. Rößler", text: "Guten Morgen!"},
          {sender: "Claus", text: "Morgen!"},
          {sender: "Rolf", text: "Guten Morgen"},
          {sender: "Emilia", text: "Guten Morgen :)"},
          {sender: "Lukas", text: "Moin"},
          {sender: "Christina", text: "Hallo"},
          {sender: "Ali", text: "Tach"},
          {sender: "Kevin", text: "Verstehe ich nicht"},
          {sender: "Der King", text: "Hör halt mal zu..."},
          {sender: "Emilia", text: "Ich dachte mit dem Kindergarten sind wir durch im Studium."},
          {sender: "Lukas", text: "Oh boi^^"},
          {sender: "Rolf", text: "Ihre Folien verändern sich nichtmehr..."},
          {sender: "Claus", text: "+"},
          {sender: "Emilia", text: "+"},
          {sender: "Lukas", text: "+"},
          {sender: "Christina", text: "+"},
          {sender: "Hr. Rößler", text: "Okay, dann hören wir auf für heute."},
          {sender: "Vladimir", text: "Jo, lass mal chillen nachher."},
          {sender: "Ali", text: "Bruder, nee. Is Corona."},
          {sender: "Der King", text: "Ach komm, nen Bierchen geht immer."}
        ],
        newMessage: true },
    ];

    this.chats = testData.map((jsonObj) => Chat.fromJson(jsonObj));
  }

  public getChats(): Chat[] {
    return this.chats;
  }

  public getObserver(): ChatObservable {
    if (this.chatObservable == undefined) this.chatObservable = new Observable<{ chats: Chat[] }>((sub) => (this.chatSubscriber = sub));
    return this.chatObservable;
  }

  public addChat(user: User) {
    this.chats.push(new Chat(user.id, [], false, user));

    this.chatSubscriber?.next({ chats: this.chats });
  }
}

export class Chat {
  constructor(public id: string, public messages: Message[], public newMessage: boolean, public partner?: User) {}

  static fromJson(data: ChatJson) {
    return new Chat(data.id, data.messages, data.newMessage, data.partner);
  }

  getNickname(): string {
    if (!this.partner) return "Public Chat";
    else return this.partner.nickname;
  }
}

type ChatJson = {
  id: string;
  partner?: User;
  messages: Message[];
  newMessage: boolean;
};

export type ChatObservable = Observable<{ chats: Chat[] }>;