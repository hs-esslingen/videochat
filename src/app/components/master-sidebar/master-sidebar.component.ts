import {Component, OnInit, Output, EventEmitter, OnDestroy, ChangeDetectorRef} from '@angular/core';
import {ChatService} from '../../helper/chat.service';
import {Subscription} from 'rxjs';
import {MatDialog} from '@angular/material/dialog';
import {ChangeNicknameComponent} from '../change-nickname/change-nickname.component';
import {Poll} from 'src/app/helper/poll.service';
import {User, UserSignal, CurrentUser, UserConnectionState} from 'src/app/model/user';
import {SettingsMasterComponent} from '../settings-master/settings-master.component';
import {RoomService} from 'src/app/helper/room.service';
import {SignalService} from '../../helper/signal.service';
import {Chat} from 'src/app/model/chat';
import {SoundService} from 'src/app/helper/sound.service';

@Component({
  selector: 'app-master',
  templateUrl: './master-sidebar.component.html',
  styleUrls: ['./master-sidebar.component.scss'],
})
export class MasterSidebarComponent implements OnInit, OnDestroy {
  currentUser?: CurrentUser;
  users: {[key: string]: User} = {};

  @Output() sidebarSetDetailEvent = new EventEmitter<{element: Chat; type: 'chat'} | {element: Poll; type: 'poll'}>();
  @Output() sidebarNicknameEvent = new EventEmitter<string>();
  @Output() sidebarDisconnectEvent = new EventEmitter<null>();
  @Output() sidebarToggleAutogainEvent = new EventEmitter<null>();

  // Enables / Disables debug mode, that creates some polls
  demo = false;

  // Variables for chats
  chats: {[id: string]: Chat} = {};
  chatSubscription?: Subscription;
  roomSubscription?: Subscription;

  activeUsers: User[] = [];

  //Variables for polls
  polls: Poll[] = [];

  constructor(
    readonly chatService: ChatService,
    private dialog: MatDialog,
    private room: RoomService,
    private ref: ChangeDetectorRef,
    private signal: SignalService,
    private sound: SoundService
  ) {}

  ngOnInit(): void {
    // Checks, if there are (public-)chats for the session, that are cached by the server. (Keeps data if the user refreshes or rejoins)
    this.chats = this.chatService.getChats();

    this.room.subscribe(data => {
      this.currentUser = data.currentUser;
      this.users = data.users;
      this.chats = data.chats;
      this.activeUsers = Object.keys(this.users)
        .map(userId => this.users[userId])
        .filter(user => user.state === UserConnectionState.CONNECTED);
      this.ref.detectChanges();
    });

    if (this.demo) {
      this.polls.push(new Poll('0', 'Poll_1'));
      this.polls.push(new Poll('1', 'Poll_2'));
    }
  }

  getKeys(obj: object) {
    return Object.keys(obj);
  }

  ngOnDestroy(): void {
    this.chatSubscription?.unsubscribe();
    this.roomSubscription?.unsubscribe();
  }

  setSidebarDetailType(obj: Chat | Poll): void {
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
    let foundElement = this.chats[user.id];
    if (foundElement == null) foundElement = this.chatService.addChat(user);
    this.setSidebarDetailType(foundElement);
  }

  raiseHand(): void {
    //console.log("You've raised your Hand");
    this.signal.setSignal(UserSignal.RAISED_HAND);
  }
  thumbsUp(): void {
    //console.log("You've voted up!");
    this.signal.setSignal(UserSignal.VOTED_UP);
  }
  thumbsDown(): void {
    //console.log("You've voted down!");
    this.signal.setSignal(UserSignal.VOTED_DOWN);
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

    dialogRef.afterClosed().subscribe(() => {
      console.log('The dialog was closed');
      //console.log(result);
    });
  }

  //MIGHT BE MOVED
  openNicknameDialog(): void {
    const dialogRef = this.dialog.open(ChangeNicknameComponent, {
      width: '300px',
      data: {nickname: this.currentUser?.nickname},
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
    // Todo: add sound in settings menu
    // this.sound.playSound(Tone.A1);
  }
}
