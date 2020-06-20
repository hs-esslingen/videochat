import {Component, OnInit, Input, Output, EventEmitter, OnDestroy} from '@angular/core';
import {ChatService, Chat} from '../../helper/chat.service';
import {Subscription} from 'rxjs';
import {MatDialog} from '@angular/material/dialog';
import {ChangeNicknameComponent} from '../change-nickname/change-nickname.component';
import {Poll} from 'src/app/helper/poll.service';
import {User, userSignal} from 'src/app/helper/user.service';
import {SettingsMasterComponent} from '../settings-master/settings-master.component';

@Component({
  selector: 'app-master',
  templateUrl: './master-sidebar.component.html',
  styleUrls: ['./master-sidebar.component.scss'],
})
export class MasterSidebarComponent implements OnInit, OnDestroy {
  @Input() autoGainControl: boolean | undefined;
  @Input() currentUser!: User;
  @Input() users!: User[];

  @Output() sidebarSetDetailEvent = new EventEmitter<{element: Record<string, any>; type: string}>();
  @Output() sidebarSignalEvent = new EventEmitter<userSignal>();
  @Output() sidebarNicknameEvent = new EventEmitter<string>();
  @Output() sidebarDisconnectEvent = new EventEmitter<null>();
  @Output() sidebarToggleAutogainEvent = new EventEmitter<null>();

  // Enables / Disables debug mode, that creates some polls
  demo = false;

  // Variables for chats
  chats: Chat[] = [];
  chatSubscription: Subscription | undefined;

  //Variables for polls
  polls: Poll[] = [];

  constructor(readonly chatService: ChatService, private dialog: MatDialog) {}

  ngOnInit(): void {
    // Checks, if there are (public-)chats for the session, that are cached by the server. (Keeps data if the user refreshes or rejoins)
    this.chats = this.chatService.getChats();

    // Creates an observer on the chats and subscribes to it
    this.chatSubscription = this.chatService.getObserver().subscribe(data => {
      this.chats = data.chats;
    });

    if (this.demo) {
      this.polls.push(new Poll('0', 'Poll_1'));
      this.polls.push(new Poll('1', 'Poll_2'));
    }
  }

  ngOnDestroy(): void {
    this.chatSubscription?.unsubscribe();
  }

  setSidebarDetailType(obj: Record<string, any>): void {
    // console.log("A label was clicked!");
    // console.log(obj);
    if (obj instanceof Chat) this.sidebarSetDetailEvent.emit({element: obj, type: 'chat'});
    if (obj instanceof Poll) this.sidebarSetDetailEvent.emit({element: obj, type: 'poll'});
  }

  createPoll(): void {
    console.log("You've created a new poll!");
  }

  // PUSH NEWLY CREATED CHAT TO CHAT SERVICE?
  openChat(user: User): void {
    let foundElement = this.chats.find(chat => chat.partner === user);
    if (foundElement == null) foundElement = this.chatService.addChat(user);
    this.setSidebarDetailType(foundElement);
  }

  raiseHand(): void {
    //console.log("You've raised your Hand");
    this.sidebarSignalEvent.emit(userSignal.RAISED_HAND);
  }
  thumbsUp(): void {
    //console.log("You've voted up!");
    this.sidebarSignalEvent.emit(userSignal.VOTED_UP);
  }
  thumbsDown(): void {
    //console.log("You've voted down!");
    this.sidebarSignalEvent.emit(userSignal.VOTED_DOWN);
  }

  //ONLY FOR DEBUG REASONS! CAN BE REMOVED IN PRODUCTION VERSION!
  userInteraction(): void {
    // console.log('Opened menu for user interaction!');
  }

  //ONLY FOR DEBUG REASONS! CAN BE REMOVED IN PRODUCTION VERSION!
  openSettingsDialog(): void {
    // console.log("You've opened the settings menu!");
    const dialogRef = this.dialog.open(SettingsMasterComponent, {
      width: '300px',
      data: {},
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      //console.log(result);
    });
  }

  //MIGHT BE MOVED
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

  //WILL BE MOVED
  toggleAutoGain(): void {
    //console.log("Toggled auto gain control!");
    this.sidebarToggleAutogainEvent.emit();
  }

  leaveRoom(): void {
    //console.log("You've left the lecture!");
    this.sidebarDisconnectEvent.emit();
  }
}
