import {Component, OnInit, Input, Output, EventEmitter, OnDestroy} from '@angular/core';
import {User, Signal, Poll} from '../../helper/media.service';
import {ChatService, Chat} from '../../helper/chat.service';
import {Subscription} from 'rxjs';
import {MatDialog} from '@angular/material/dialog';
import {ChangeNicknameComponent} from '../change-nickname/change-nickname.component';

@Component({
  selector: 'app-master',
  templateUrl: './master-sidebar.component.html',
  styleUrls: ['./master-sidebar.component.scss'],
})
export class MasterSidebarComponent implements OnInit, OnDestroy {
  @Input() currentUser!: User;
  @Input() users!: User[];

  @Output() sidebarSetDetailEvent = new EventEmitter<{element: Element; type: string}>();
  @Output() sidebarSignalEvent = new EventEmitter<Signal>();
  @Output() sidebarNicknameEvent = new EventEmitter<string>();
  @Output() sidebarDisconnectEvent = new EventEmitter<null>();

  // Variables for chats
  chats: Chat[] = [];
  chatSubscription: Subscription | undefined;

  //Variables for polls
  polls: Poll[] = [];
  //polls: Poll[] = [{id: "0", title: "Test_1"}, {id: "1", title: "Test_2"}];

  constructor(readonly chatService: ChatService, private dialog: MatDialog) {}

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

  // TODO: Verallgemeinerte Version möglich?
  setSidebarChat(chat: Element): void {
    // console.log("Triggered Event");
    this.sidebarSetDetailEvent.emit({element: chat, type: 'chat'});
  }
  setSidebarPoll(poll: Element): void {
    // console.log("Triggered Event");
    this.sidebarSetDetailEvent.emit({element: poll, type: 'poll'});
  }

  raiseHand(): void {
    //console.log("You've raised your Hand");
    this.sidebarSignalEvent.emit(Signal.RAISED_HAND);
  }
  thumbsUp(): void {
    //console.log("You've voted up!");
    this.sidebarSignalEvent.emit(Signal.VOTED_UP);
  }
  thumbsDown(): void {
    //console.log("You've voted down!");
    this.sidebarSignalEvent.emit(Signal.VOTED_DOWN);
  }

  //ONLY FOR DEBUG REASONS! CAN BE REMOVED IN PRODUCTION VERSION!
  userInteraction(): void {
    console.log('Opened menu for user interaction!');
  }

  //ONLY FOR DEBUG REASONS! CAN BE REMOVED IN PRODUCTION VERSION!
  openSettings(): void {
    console.log("You've opened the settings menu!");
  }

  createPoll(): void {
    console.log("You've created a new poll!");
  }

  openNicknameDialog(): void {
    const dialogRef = this.dialog.open(ChangeNicknameComponent, {
      width: '300px',
      data: {nickname: this.currentUser.nickname},
    });

    dialogRef.afterClosed().subscribe(result => {
      //console.log('The dialog was closed');
      //console.log(result);
      if (result != null || '') this.sidebarNicknameEvent.emit(result);
    });
  }

  leaveRoom(): void {
    //console.log("You've left the lecture!");
    this.sidebarDisconnectEvent.emit();
  }
}
