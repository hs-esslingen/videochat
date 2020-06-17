import {Component, OnInit, Input, Output, EventEmitter, OnDestroy} from '@angular/core';
import {User} from '../../helper/media.service';
import {ChatService, Chat} from '../../helper/chat.service';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-master',
  templateUrl: './master-sidebar.component.html',
  styleUrls: ['./master-sidebar.component.scss'],
})
export class MasterSidebarComponent implements OnInit, OnDestroy {
  @Input() currentUser!: User;
  @Input() users!: User[];

  @Output() sidebarEvent = new EventEmitter<{element: Element; type: string}>();

  // Variables for chat
  chats: Chat[] = [];
  chatSubscription: Subscription | undefined;

  constructor(readonly chatService: ChatService) {}

  ngOnInit(): void {
    // Checks, if there are (public-)chats for the session, that are cached by the server. (Keeps data if the user refreses or rejoins)
    this.chats = this.chatService.getChats();

    // Creates an observer on the chats and subscribes to it
    this.chatSubscription = this.chatService.getObserver().subscribe(data => {
      this.chats = data.chats;
    });
  }

  ngOnDestroy(): void {
    this.chatSubscription?.unsubscribe();
  }

  setSidebarChat(chat: Element): void {
    // console.log("Triggered Event");
    this.sidebarEvent.emit({element: chat, type: 'chat'});
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

  leaveRoom(): void {
    //console.log("You've left the lecture!");
    this.sidebarEvent.emit({element: null, type: 'disconnect'});
  }
}
