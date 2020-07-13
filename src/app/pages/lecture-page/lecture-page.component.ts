import {Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef} from '@angular/core';
import {MediaService} from '../../helper/media.service';
import {ActivatedRoute, Router} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {LocalMediaService} from '../../helper/local-media.service';
import {JoinMeetingPopupComponent} from '../../components/join-meeting-popup/join-meeting-popup.component';
import {ChatService} from '../../helper/chat.service';
import {User, UserSignal, UserRole, MicrophoneState, CameraState, ScreenshareState, CurrentUser} from 'src/app/model/user';
import {RoomService} from 'src/app/helper/room.service';
import {ApiService} from 'src/app/helper/api.service';
import {Subscription} from 'rxjs';
import {Connection, State} from 'src/app/model/connection';
import {ShortcutService} from '../../helper/shortcut.service';
import {SignalService} from '../../helper/signal.service';
import {SoundService} from 'src/app/helper/sound.service';

@Component({
  selector: 'app-lecture-page',
  templateUrl: './lecture-page.component.html',
  styleUrls: ['./lecture-page.component.scss'],
})
export class LecturePageComponent implements OnInit, OnDestroy, AfterViewInit {
  // Enables / Disables debug mode, that creates some dummy users and chats
  demo = false;

  @ViewChild('webcams') webcams: ElementRef<HTMLDivElement> | undefined;
  // Variables for video
  autoGainControl: boolean | undefined;
  currentUser: CurrentUser;
  roomId!: string;
  moveTimout: number | undefined;
  isToolbarHidden = false;
  isMobile = false;
  roomUrl: string | undefined;
  duplicateSession = false;
  numWebcams = 0;
  connection: Connection;
  roomSubscription?: Subscription;

  screenShareUser: User | undefined;
  screenShareStream: MediaStream | undefined;
  webcamHeight = 0.2;

  users: {[id: string]: User} = {};

  // Variables for sidebar
  sidebarDetail: undefined | Element;
  detailType: string | undefined;

  constructor(
    readonly mediaService: MediaService,
    private ref: ChangeDetectorRef,
    private room: RoomService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private localMedia: LocalMediaService,
    private element: ElementRef<HTMLElement>,
    private api: ApiService,
    private shortcut: ShortcutService,
    private signal: SignalService,
    private sound: SoundService,
    readonly chatService: ChatService
  ) {
    const webcamHeight = window.localStorage.getItem('webcamHeight');
    if (webcamHeight != null) this.webcamHeight = parseFloat(webcamHeight);
    this.currentUser = room.getRoomInfo().currentUser;
    this.connection = {
      state: State.DISCONNECTED,
    };
  }

  @HostListener('window:beforeunload')
  pageClose() {
    if (this.connection.state !== State.FAILED && this.connection.state !== State.DISCONNECTED) this.api.disconnect(this.roomId);
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.recalculateMaxVideoWidth();
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent) {
    if (
      this.connection.state === State.CONNECTED &&
      (event.target as HTMLElement).tagName !== 'TEXTAREA' &&
      (event.target as HTMLElement).tagName !== 'INPUT'
    ) {
      // trigger shortcut if the user isn't writing a chat message
      this.shortcut.trigger(event);
    }
  }

  ngAfterViewInit(): void {
    this.recalculateMaxVideoWidth();
  }

  recalculateMaxVideoWidth() {
    if (this.webcams?.nativeElement)
      this.element.nativeElement.style.setProperty('--max-video-width', (this.webcams?.nativeElement?.clientHeight / 3) * 4 - 5 + 'px');

    this.numWebcams = Object.keys(this.users).filter(id => this.users[id].consumers?.video != null).length;
    if (this.currentUser.stream.video != null) this.numWebcams++;

    const clientWidth = this.webcams?.nativeElement?.clientWidth;
    const clientHeight = this.webcams?.nativeElement?.clientHeight;
    if (clientHeight && clientWidth) {
      let colums = 1;
      while ((1 / (colums + 1)) * clientWidth * (3 / 4) * Math.ceil(this.numWebcams / colums) > clientHeight) {
        colums++;
      }
      const maxHeightPerElement = clientHeight / Math.ceil(this.numWebcams / colums);
      const maxWidthPerElement = clientWidth / colums;
      const maxRatio = Math.min(Math.min((maxHeightPerElement * (4 / 3)) / clientWidth, maxWidthPerElement / clientWidth), 1);
      this.element.nativeElement.style.setProperty('--max-video-flex-basis', maxRatio * 100 - 1 + '%');
    }
  }

  startDividerDrag() {
    const pointerMove = (e: PointerEvent) => {
      this.webcamHeight = Math.min(Math.max((e.clientY - 52) / (window.innerHeight - 52), 0.1), 0.9);
      requestAnimationFrame(() => {
        this.recalculateMaxVideoWidth();
      });
    };
    const pointerUp = () => {
      window.localStorage.setItem('webcamHeight', this.webcamHeight.toString());
      window.removeEventListener('pointerup', pointerUp);
      window.removeEventListener('pointermove', pointerMove);
    };
    window.addEventListener('pointerup', pointerUp);
    window.addEventListener('pointermove', pointerMove);
  }

  ngOnInit(): void {
    this.roomSubscription = this.room.subscribe(data => {
      if (this.connection.state !== data.connection.state && data.connection.state === 1) {
        console.log('user joined room');
        // user joined room and is conencted
        // Todo: add sound in settings menu
        // this.sound.playSound(Tone.C2);
      }
      this.users = data.users;
      this.currentUser = data.currentUser;
      this.connection = data.connection;

      const screenShareUserId = Object.keys(this.users).find(id => this.users[id].consumers?.screen != null);
      let screenShareUser;
      if (screenShareUserId) screenShareUser = this.users[screenShareUserId];
      if (this.currentUser.screenshareState === ScreenshareState.ENABLED) screenShareUser = new User(this.currentUser.id, this.currentUser.nickname);

      if (screenShareUser != null && screenShareUser !== this.screenShareUser) {
        this.screenShareStream = this.getScreenShareStream(screenShareUser);
      }
      this.screenShareUser = screenShareUser;

      this.ref.detectChanges();
      // wait two animation frames
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.recalculateMaxVideoWidth();
          this.ref.detectChanges();
        });
      });
    });

    const url = new URL(location.href);
    this.roomUrl = url.origin + url.pathname;

    this.moveTimout = window.setTimeout(() => {
      this.isToolbarHidden = true;
    }, 1500);

    if (this.demo) {
      this.test();
      this.screenShareUser = this.users[0];
      return;
    }

    this.route.paramMap.subscribe(async params => {
      this.route.data.subscribe(data => {
        this.roomId = params.get('roomId') as string;

        let displayedRoomName = this.roomId;
        let moodleToken: string;

        console.log(data);
        if (data.moodle != null) {
          moodleToken = data.moodle.token;
          displayedRoomName = data.moodle.roomName;
        }

        const dialogRef = this.dialog.open(JoinMeetingPopupComponent, {
          width: '400px',
          data: {nickname: this.mediaService.nickname, roomId: displayedRoomName},
        });
        dialogRef.afterClosed().subscribe(async (result: {isWebcamDisabled: boolean}) => {
          // if popup is canceled
          if (result == null || result.isWebcamDisabled == null) {
            this.localMedia.closeAudio();
            this.localMedia.closeVideo();
            return;
          }
          // Proceed when all informations are given
          if (data.moodle != null) this.room.connectToRoom('moodle⛳' + this.roomId, result.isWebcamDisabled, moodleToken);
          else this.room.connectToRoom(this.roomId, result.isWebcamDisabled);
        });
      });
    });
  }

  ngOnDestroy() {
    this.roomSubscription?.unsubscribe();
    try {
      this.room.disconnect();
    } catch (error) {
      // ignore
    }
  }

  reload() {
    window.location.reload();
  }

  getScreenShareStream(user: User) {
    if (this.demo) return new MediaStream();
    if (user.id === this.currentUser.id) return this.currentUser.stream.screen;
    if (user.consumers?.screen) return new MediaStream([user.consumers.screen?.track]);
    return undefined;
  }

  setSidebarDetail($event: {element: Element; type: string}) {
    //console.log("Event occured")
    if (this.detailType === $event.type) {
      if (this.sidebarDetail?.id === $event.element.id) {
        this.sidebarDetail = undefined;
        this.detailType = undefined;
      } else {
        this.sidebarDetail = $event.element;
      }
    } else {
      this.sidebarDetail = $event.element;
      this.detailType = $event.type;
    }

    requestAnimationFrame(() => {
      this.recalculateMaxVideoWidth();
    });
  }

  setNickname($event: string) {
    // console.log("Changed nickname to " + $event + "!");
    this.mediaService.setNickname($event);
  }

  getKeys(obj: object) {
    return Object.keys(obj);
  }

  onMousemove() {
    if (!this.isMobile) {
      this.isToolbarHidden = false;
      clearTimeout(this.moveTimout);
      this.moveTimout = window.setTimeout(() => {
        this.isToolbarHidden = true;
      }, 1500);
    }
  }

  async disconnect() {
    this.router.navigate(['/' + this.roomId + '/thank-you']);
  }

  test(): void {
    this.currentUser = {
      id: '0',
      nickname: 'User',
      stream: {},
      cameraState: CameraState.DISABLED,
      screenshareState: ScreenshareState.DISABLED,
      microphoneState: MicrophoneState.TALKING,
      signal: UserSignal.NONE,
      userRole: UserRole.MODERATOR,
    };

    // this.users.push(
    //   {
    //     id: '1',
    //     nickname: 'Test_1',
    //     consumers: {
    //       // @ts-ignore
    //       video: {},
    //       // @ts-ignore
    //       screen: {},
    //     },
    //     microphoneState: MicrophoneState.ENABLED,
    //     signal: UserSignal.RAISED_HAND,
    //   },
    //   {
    //     id: '2',
    //     nickname: 'Test_2',
    //     consumers: {
    //       // @ts-ignore
    //       video: {},
    //     },
    //     microphoneState: MicrophoneState.ENABLED,
    //     signal: UserSignal.NONE,
    //   },
    //   {
    //     id: '3',
    //     nickname: 'Test_3',
    //     consumers: {
    //       // @ts-ignore
    //       video: {},
    //     },
    //     microphoneState: MicrophoneState.DISABLED,
    //     signal: UserSignal.VOTED_UP,
    //   },
    //   {id: '4', nickname: 'Test_4', producers: {}, microphoneState: MicrophoneState.DISABLED, signal: UserSignal.VOTED_DOWN},
    //   {id: '5', nickname: 'Test_5', producers: {}, microphoneState: MicrophoneState.DISABLED, signal: UserSignal.VOTED_DOWN},
    //   {id: '6', nickname: 'Test_6', producers: {}, microphoneState: MicrophoneState.DISABLED, signal: UserSignal.VOTED_UP},
    //   {id: '7', nickname: 'Test_7', producers: {}, microphoneState: MicrophoneState.DISABLED, signal: UserSignal.VOTED_UP},
    //   {id: '8', nickname: 'Test_8', producers: {}, microphoneState: MicrophoneState.DISABLED, signal: UserSignal.VOTED_DOWN},
    //   {id: '9', nickname: 'Test_9', producers: {}, microphoneState: MicrophoneState.DISABLED, signal: UserSignal.VOTED_DOWN},
    //   {id: '10', nickname: 'Test_10', producers: {}, microphoneState: MicrophoneState.DISABLED, signal: UserSignal.VOTED_DOWN},
    //   {id: '11', nickname: 'Test_11', producers: {}, microphoneState: MicrophoneState.DISABLED, signal: UserSignal.NONE},
    //   {id: '12', nickname: 'Test_12', producers: {}, microphoneState: MicrophoneState.DISABLED, signal: UserSignal.NONE},
    //   {id: '13', nickname: 'Test_13', producers: {}, microphoneState: MicrophoneState.DISABLED, signal: UserSignal.NONE},
    //   {id: '14', nickname: 'Test_14', producers: {}, microphoneState: MicrophoneState.DISABLED, signal: UserSignal.NONE},
    //   {id: '15', nickname: 'Test_15', producers: {}, microphoneState: MicrophoneState.DISABLED, signal: UserSignal.NONE},
    //   {id: '16', nickname: 'Test_16', producers: {}, microphoneState: MicrophoneState.DISABLED, signal: UserSignal.NONE},
    //   {id: '17', nickname: 'Test_17', producers: {}, microphoneState: MicrophoneState.DISABLED, signal: UserSignal.NONE},
    //   {id: '18', nickname: 'Test_18', producers: {}, microphoneState: MicrophoneState.DISABLED, signal: UserSignal.NONE},
    //   {id: '19', nickname: 'Test_19', producers: {}, microphoneState: MicrophoneState.DISABLED, signal: UserSignal.NONE},
    //   {id: '20', nickname: 'Test_20', producers: {}, microphoneState: MicrophoneState.DISABLED, signal: UserSignal.NONE},
    //   {id: '21', nickname: 'Test_21', producers: {}, microphoneState: MicrophoneState.DISABLED, signal: UserSignal.NONE},
    //   {id: '22', nickname: 'Test_22', producers: {}, microphoneState: MicrophoneState.DISABLED, signal: UserSignal.NONE}
    // );

    this.chatService.addChat(this.users[0]);
    this.chatService.addChat(this.users[1]);
  }
}
