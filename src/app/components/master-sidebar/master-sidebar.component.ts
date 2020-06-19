import {Component, OnInit, Input, Output, EventEmitter, OnDestroy} from '@angular/core';
import {User, Signal} from '../../helper/media.service';
import {ChatService, Chat} from '../../helper/chat.service';
import {Subscription} from 'rxjs';
import {MatDialog} from '@angular/material/dialog';
import {ChangeNicknameComponent} from '../change-nickname/change-nickname.component';
import {Poll} from 'src/app/helper/poll.service';

@Component({
  selector: 'app-master',
  templateUrl: './master-sidebar.component.html',
  styleUrls: ['./master-sidebar.component.scss'],
})
export class MasterSidebarComponent implements OnInit, OnDestroy {
  @Input() currentUser!: User;
  @Input() users!: User[];

  @Output() sidebarSetDetailEvent = new EventEmitter<{element: Record<string, any>; type: string}>();
  @Output() sidebarSignalEvent = new EventEmitter<Signal>();
  @Output() sidebarNicknameEvent = new EventEmitter<string>();
  @Output() sidebarDisconnectEvent = new EventEmitter<null>();

  // Variables for chats
  chats: Chat[] = [];
  chatSubscription: Subscription | undefined;

  //Variables for polls
  polls: Poll[] = [];

  constructor(readonly chatService: ChatService, private dialog: MatDialog) {}

  ngOnInit(): void {
    // Checks, if there are (public-)chats for the session, that are cached by the server. (Keeps data if the user refreses or rejoins)
    this.chats = this.chatService.getChats();

    // Creates an observer on the chats and subscribes to it
    this.chatSubscription = this.chatService.getObserver().subscribe(data => {
      this.chats = data.chats;
    });

    this.polls.push(new Poll('0', 'Poll_1'));
    this.polls.push(new Poll('1', 'Poll_2'));
  }

  ngOnDestroy(): void {
    this.chatSubscription?.unsubscribe();
  }

  //PUSH NEWLY CREATED CHAT TO CHAT SERVICE?
  openChat(user: User): void {
    if (!this.chats.find(chat => chat.partner === user)) this.chatService.addChat(user);
    const foundElement = this.chats.find(chat => chat.partner === user);
    if (foundElement !== undefined) this.setSidebarDetailType(foundElement);
    // this.setSidebarDetailType(this.chats.find(chat => chat.partner === user));
  }

  setSidebarDetailType(obj: Record<string, any>): void {
    // console.log("A label was clicked!");
    // console.log(obj);
    if (obj instanceof Chat) this.sidebarSetDetailEvent.emit({element: obj, type: 'chat'});
    if (obj instanceof Poll) this.sidebarSetDetailEvent.emit({element: obj, type: 'poll'});
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
    // console.log('Opened menu for user interaction!');
  }

  //ONLY FOR DEBUG REASONS! CAN BE REMOVED IN PRODUCTION VERSION!
  openSettings(): void {
    // console.log("You've opened the settings menu!");
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
