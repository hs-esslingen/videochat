import {Component, OnInit, Output, EventEmitter, OnDestroy, ChangeDetectorRef, Input} from '@angular/core';
import {ChatService} from '../../helper/chat.service';
import {Subscription} from 'rxjs';
import {MatDialog} from '@angular/material/dialog';
import {Poll} from 'src/app/helper/poll.service';
import {User, UserSignal, CurrentUser, UserConnectionState} from 'src/app/model/user';
import {SettingsMasterComponent, settingMode} from '../settings-master/settings-master.component';
import {RoomService} from 'src/app/helper/room.service';
import {SignalService} from '../../helper/signal.service';
import {Chat} from 'src/app/model/chat';
import {SoundService} from 'src/app/helper/sound.service';
import {MediaService} from 'src/app/helper/media.service';

@Component({
  selector: 'app-master',
  templateUrl: './master-sidebar.component.html',
  styleUrls: ['./master-sidebar.component.scss'],
})
export class MasterSidebarComponent implements OnInit, OnDestroy {
  detailOpen?: boolean;
  currentUser?: CurrentUser;
  users: {[key: string]: User} = {};
  // Inputs for options
  @Input() autoGainControl!: boolean;
  @Input() roomID!: string;

  @Output() sidebarSetDetailEvent = new EventEmitter<{element: Chat; type: 'chat'} | {element: Poll; type: 'poll'}>();
  @Output() sidebarNicknameEvent = new EventEmitter<string>();
  @Output() sidebarDisconnectEvent = new EventEmitter<null>();

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
    readonly mediaService: MediaService,
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
    this.detailOpen = false;

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
    // console.log('setSidebarDetailType reached');
    this.detailOpen = !this.detailOpen;
    if (obj instanceof Chat) obj.newMessage = false;
    if (obj instanceof Chat) this.sidebarSetDetailEvent.emit({element: obj, type: 'chat'});
    if (obj instanceof Poll) this.sidebarSetDetailEvent.emit({element: obj, type: 'poll'});
  }

  createPoll(): void {
    console.log("You've created a new poll!");
  }

  // PUSH NEWLY CREATED CHAT TO CHAT SERVICE?
  openChat(user: User): void {
    let foundElement = this.chats[user.id];
    if (foundElement == null || foundElement.hidden) foundElement = this.chatService.addChat(user);
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

  openSettingsDialog(): void {
    //console.log(this.roomID);
    const dialogRef = this.dialog.open(SettingsMasterComponent, {
      height: 'auto',
      width: 'auto',
      data: {
        mode: settingMode.STANDARD_MODE,
        roomID: this.roomID,
      },
    });

    dialogRef.afterClosed().subscribe(async result => {
      console.log('The dialog was closed');
      console.log(result);
      // this.mediaService.setCamera(result.isWebcamDisabled);
    });
  }

  leaveRoom(): void {
    //console.log("You've left the lecture!");
    this.sidebarDisconnectEvent.emit();
    // Todo: add sound in settings menu
    // this.sound.playSound(Tone.A1);
  }
}
