import { Component, OnInit, Input } from '@angular/core';
import { User, Signal } from 'src/app/helper/media.service';
import { ChatService, Chat, ChatObservable } from "src/app/helper/chat.service";
import { Subscription } from "rxjs";

@Component({
  selector: 'app-master',
  templateUrl: './master.component.html',
  styleUrls: ['./master.component.scss']
})
export class MasterComponent implements OnInit {
@Input() currentUser: User;
@Input() users: User[];

  //Enables / Disables debug mode, that creates some dummy users and chats
  debug = true;

  //Variables for sidebar
  sidebarDetail = undefined;
  detailType = undefined;

  //Variables for chat
  chats: Chat[] = [];
  chatSubscription: Subscription;

  constructor(
    readonly chatService: ChatService
  ) { }

  ngOnInit(): void {
    if (this.debug) this.test();

    // Checks, if there are (public-)chats for the session, that are cached by the server. (Keeps data if the user refreses or rejoins)
    this.chats = this.chatService.getChats();

    //Creates an observer on the chats and subscribes to it
    this.chatSubscription = this.chatService.getObserver().subscribe((data) => {
      this.chats = data.chats;
    });
  }

  ngOnDestroy(): void {
    this.chatSubscription.unsubscribe();
  }

  toggleSidebar(element): void {
    //Most of this function is still missing (like polling)
    switch (this.detailType) {
      case "chat":
        if (this.sidebarDetail.id == element.id) {
          this.sidebarDetail = undefined;
          this.detailType = undefined;
        }
        else {
          this.sidebarDetail = element;
        }
        break;

      default:
        this.sidebarDetail = element;
        this.detailType = "chat";
        break;
    }
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

  test(): void {
    this.users.push(
      { id: "1", nickname: "Test_1", producers: {}, isMuted: false, isTalking: true, signal: Signal.RAISED_HAND },
      { id: "2", nickname: "Test_2", producers: {}, isMuted: false, isTalking: true, signal: Signal.NONE },
      { id: "3", nickname: "Test_3", producers: {}, isMuted: false, isTalking: true, signal: Signal.VOTED_UP },
      { id: "4", nickname: "Test_4", producers: {}, isMuted: false, isTalking: true, signal: Signal.VOTED_DOWN },
      { id: "5", nickname: "Test_5", producers: {}, isMuted: true, isTalking: true, signal: Signal.VOTED_DOWN },
      { id: "6", nickname: "Test_6", producers: {}, isMuted: true, isTalking: false, signal: Signal.VOTED_UP },
      { id: "7", nickname: "Test_7", producers: {}, isMuted: true, isTalking: false, signal: Signal.VOTED_UP },
      { id: "8", nickname: "Test_8", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
      { id: "9", nickname: "Test_9", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
      { id: "10", nickname: "Test_10", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
      { id: "11", nickname: "Test_11", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
      { id: "12", nickname: "Test_12", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
      { id: "13", nickname: "Test_13", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
      { id: "14", nickname: "Test_14", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
      { id: "15", nickname: "Test_15", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
      { id: "16", nickname: "Test_16", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
      { id: "17", nickname: "Test_17", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
      { id: "18", nickname: "Test_18", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
      { id: "19", nickname: "Test_19", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
      { id: "20", nickname: "Test_20", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
      { id: "21", nickname: "Test_21", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
      { id: "22", nickname: "Test_22", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE }
    );

    this.chatService.addChat(this.users[0]);
    this.chatService.addChat(this.users[1]);
  }
}
