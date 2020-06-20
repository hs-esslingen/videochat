import {Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, AfterViewInit} from '@angular/core';
import {MicrophoneState, ScreenshareState, CameraState, MediaService} from '../../helper/media.service';
import {ActivatedRoute, Router} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {LocalMediaService} from '../../helper/local-media.service';
import {JoinMeetingPopupComponent} from '../../components/join-meeting-popup/join-meeting-popup.component';
import {ChatService} from '../../helper/chat.service';
import {User, userSignal, userRole} from 'src/app/helper/user.service';

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
  microphoneState: MicrophoneState = MicrophoneState.ENABLED;
  cameraState: CameraState = CameraState.DISABLED;
  screenshareState: ScreenshareState = ScreenshareState.DISABLED;
  localStream: MediaStream | undefined;
  localSchreenshareStream: MediaStream | undefined;
  roomId!: string;
  moveTimout: number | undefined;
  isToolbarHidden = false;
  isMobile = false;
  roomUrl: string | undefined;
  duplicateSession = false;

  screenShareUser: User | undefined;
  screenShareStream: MediaStream | undefined;
  webcamHeight = 0.2;

  // Variables for Users
  currentUser: User = {
    id: '0',
    nickname: 'User',
    producers: {},
    microphoneState: MicrophoneState.DISABLED,
    isTalking: false,
    signal: userSignal.NONE,
    userRole: userRole.USER,
  };
  users: User[] = [];

  // Variables for sidebar
  sidebarDetail: undefined | Element;
  detailType: string | undefined;

  constructor(
    readonly mediaService: MediaService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private localMedia: LocalMediaService,
    private element: ElementRef<HTMLElement>,
    readonly chatService: ChatService
  ) {
    const webcamHeight = window.localStorage.getItem('webcamHeight');
    if (webcamHeight != null) this.webcamHeight = parseFloat(webcamHeight);
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.recalculateMaxVideoWidth();
  }

  ngAfterViewInit(): void {
    this.recalculateMaxVideoWidth();
  }

  recalculateMaxVideoWidth() {
    if (this.webcams?.nativeElement)
      this.element.nativeElement.style.setProperty('--max-video-width', (this.webcams?.nativeElement?.clientHeight / 3) * 4 - 5 + 'px');

    let numVideos = this.users.filter(user => user.consumers?.video != null).length;
    if (this.localStream != null) numVideos++;

    const clientWidth = this.webcams?.nativeElement?.clientWidth;
    const clientHeight = this.webcams?.nativeElement?.clientHeight;
    if (clientHeight && clientWidth) {
      let colums = 1;
      while ((1 / (colums + 1)) * clientWidth * (3 / 4) * Math.ceil(numVideos / colums) > clientHeight) {
        colums++;
      }
      const maxHeightPerElement = clientHeight / Math.ceil(numVideos / colums);
      const maxWidthPerElement = clientWidth / colums;
      const maxRatio = Math.min((maxHeightPerElement * (4 / 3)) / clientWidth, maxWidthPerElement / clientWidth);
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
    if (this.demo) {
      this.test();
      this.screenShareUser = this.users[0];
    }

    const url = new URL(location.href);
    this.roomUrl = url.origin + url.pathname;

    this.moveTimout = window.setTimeout(() => {
      this.isToolbarHidden = true;
    }, 1500);

    this.route.paramMap.subscribe(async params => {
      // don't actually connect if demo is enabled
      if (this.demo) return;

      // Initialize User
      this.currentUser.nickname = this.mediaService.nickname;
      this.currentUser.microphoneState = this.microphoneState;

      this.roomId = params.get('roomId') as string;
      const dialogRef = this.dialog.open(JoinMeetingPopupComponent, {
        width: '400px',
        data: {nickname: this.mediaService.nickname, roomId: this.roomId},
      });
      dialogRef.afterClosed().subscribe(async result => {
        // if popup is canceled
        if (result == null || result === '') {
          this.localMedia.closeAudio();
          this.localMedia.closeVideo();
          return;
        }
        // Proceed when all informations are given

        if (result.nickname !== '') this.mediaService.setNickname(result.nickname);
        else this.mediaService.setNickname('User ' + Math.round(Math.random() * 100));

        try {
          const observer = await this.mediaService.connectToRoom(this.roomId, result.isWebcamDisabled);
          observer.subscribe(data => {
            this.autoGainControl = data.autoGainControl;
            this.cameraState = data.cameraState;
            this.microphoneState = data.microphoneState;
            this.currentUser.microphoneState = this.microphoneState;
            this.screenshareState = data.screenshareState;
            this.localStream = data.localStream;
            this.localSchreenshareStream = data.localScreenshareStream;
            this.currentUser.nickname = this.mediaService.nickname;
            this.users = data.users;

            let screenShareUser = this.users.find(item => item.consumers?.screen != null);
            if (this.screenshareState === ScreenshareState.ENABLED) screenShareUser = this.currentUser;

            if (screenShareUser != null && screenShareUser !== this.screenShareUser) {
              this.screenShareStream = this.getScreenShareStream(screenShareUser);
            }
            this.screenShareUser = screenShareUser;

            requestAnimationFrame(() => {
              this.recalculateMaxVideoWidth();
            });
          });
        } catch (err) {
          if (err === 'DUPLICATE SESSION') {
            this.duplicateSession = true;
          } else {
            console.error(err);
          }
        }
      });
    });
  }

  ngOnDestroy() {
    this.mediaService.disconnect();
  }

  getScreenShareStream(user: User) {
    if (this.demo) return new MediaStream();
    if (user === this.currentUser) return this.localSchreenshareStream;
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

  setSidebarSignal($event: userSignal) {
    if ($event !== this.currentUser.signal) this.currentUser.signal = $event;
    else this.currentUser.signal = userSignal.NONE;
  }

  setNickname($event: string) {
    // console.log("Changed nickname to " + $event + "!");
    this.mediaService.setNickname($event);
    this.currentUser.nickname = $event; //DIESE ZEILE FIXEN --> UNNÖTIG WENN IN OBSERVER
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
    this.users.push(
      {
        id: '1',
        nickname: 'Test_1',
        consumers: {
          // @ts-ignore
          video: {},
          // @ts-ignore
          screen: {},
        },
        isMuted: false,
        isTalking: true,
        signal: userSignal.RAISED_HAND,
      },
      {
        id: '2',
        nickname: 'Test_2',
        consumers: {
          // @ts-ignore
          video: {},
        },
        isMuted: false,
        isTalking: true,
        signal: userSignal.NONE,
      },
      {
        id: '3',
        nickname: 'Test_3',
        consumers: {
          // @ts-ignore
          video: {},
        },
        isMuted: false,
        isTalking: true,
        signal: userSignal.VOTED_UP,
      },
      {id: '4', nickname: 'Test_4', producers: {}, isMuted: false, isTalking: true, signal: userSignal.VOTED_DOWN},
      {id: '5', nickname: 'Test_5', producers: {}, isMuted: true, isTalking: true, signal: userSignal.VOTED_DOWN},
      {id: '6', nickname: 'Test_6', producers: {}, isMuted: true, isTalking: false, signal: userSignal.VOTED_UP},
      {id: '7', nickname: 'Test_7', producers: {}, isMuted: true, isTalking: false, signal: userSignal.VOTED_UP},
      {id: '8', nickname: 'Test_8', producers: {}, isMuted: true, isTalking: false, signal: userSignal.VOTED_DOWN},
      {id: '9', nickname: 'Test_9', producers: {}, isMuted: true, isTalking: false, signal: userSignal.VOTED_DOWN},
      {id: '10', nickname: 'Test_10', producers: {}, isMuted: true, isTalking: false, signal: userSignal.VOTED_DOWN},
      {id: '11', nickname: 'Test_11', producers: {}, isMuted: true, isTalking: false, signal: userSignal.NONE},
      {id: '12', nickname: 'Test_12', producers: {}, isMuted: true, isTalking: false, signal: userSignal.NONE},
      {id: '13', nickname: 'Test_13', producers: {}, isMuted: true, isTalking: false, signal: userSignal.NONE},
      {id: '14', nickname: 'Test_14', producers: {}, isMuted: true, isTalking: false, signal: userSignal.NONE},
      {id: '15', nickname: 'Test_15', producers: {}, isMuted: true, isTalking: false, signal: userSignal.NONE},
      {id: '16', nickname: 'Test_16', producers: {}, isMuted: true, isTalking: false, signal: userSignal.NONE},
      {id: '17', nickname: 'Test_17', producers: {}, isMuted: true, isTalking: false, signal: userSignal.NONE},
      {id: '18', nickname: 'Test_18', producers: {}, isMuted: true, isTalking: false, signal: userSignal.NONE},
      {id: '19', nickname: 'Test_19', producers: {}, isMuted: true, isTalking: false, signal: userSignal.NONE},
      {id: '20', nickname: 'Test_20', producers: {}, isMuted: true, isTalking: false, signal: userSignal.NONE},
      {id: '21', nickname: 'Test_21', producers: {}, isMuted: true, isTalking: false, signal: userSignal.NONE},
      {id: '22', nickname: 'Test_22', producers: {}, isMuted: true, isTalking: false, signal: userSignal.NONE}
    );

    this.chatService.addChat(this.users[0]);
    this.chatService.addChat(this.users[1]);
  }
}
