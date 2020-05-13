import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { User, Signal } from 'src/app/helper/media.service';
import { ChatService, Chat, ChatObservable } from "src/app/helper/chat.service";
import { Subscription } from "rxjs";

@Component({
  selector: 'app-master',
  templateUrl: './master.component.html',
  styleUrls: ['./master.component.scss']
})
export class MasterComponent implements OnInit, OnDestroy {
@Input() currentUser: User;
@Input() users: User[];

@Output() sidebarEvent = new EventEmitter<{element: Element, type: string}>();

  // Variables for chat
  chats: Chat[] = [];
  chatSubscription: Subscription;

  constructor(
    readonly chatService: ChatService
  ) { }

  ngOnInit(): void {

    // Checks, if there are (public-)chats for the session, that are cached by the server. (Keeps data if the user refreses or rejoins)
    this.chats = this.chatService.getChats();

    // Creates an observer on the chats and subscribes to it
    this.chatSubscription = this.chatService.getObserver().subscribe((data) => {
      this.chats = data.chats;
    });
  }

  ngOnDestroy(): void {
    this.chatSubscription.unsubscribe();
  }

  setSidebarChat(chat): void {
    // console.log("Triggered Event");
    this.sidebarEvent.emit({element: chat, type: "chat"});
  }

  raiseHand(): void {
    console.log("You've raised your Hand");
  }
  thumbsUp(): void {
    console.log("You've voted up!");
  }
  thumbsDown(): void {
    console.log("You've voted down!");
  }
  userInteraction(): void {}

  openSettings(): void {
    console.log("You've opened the settings!");
  }
  leaveChat(): void {
    console.log("You've left the lecture!");
  }

}
