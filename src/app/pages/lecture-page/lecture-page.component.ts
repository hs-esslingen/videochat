import {Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef} from '@angular/core';
import {MediaService} from '../../helper/media.service';
import {ActivatedRoute, Router} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {LocalMediaService} from '../../helper/local-media.service';
import {ChatService} from '../../helper/chat.service';
import {User, ScreenshareState, CurrentUser} from 'src/app/model/user';
import {RoomService} from 'src/app/helper/room.service';
import {ApiService} from 'src/app/helper/api.service';
import {Subscription} from 'rxjs';
import {Connection, State} from 'src/app/model/connection';
import {ShortcutService} from '../../helper/shortcut.service';
import {SoundService} from 'src/app/helper/sound.service';
import {SettingsMasterComponent, settingMode} from 'src/app/components/settings-master/settings-master.component';
import {Chat} from 'src/app/model/chat';

@Component({
  selector: 'app-lecture-page',
  templateUrl: './lecture-page.component.html',
  styleUrls: ['./lecture-page.component.scss'],
})
export class LecturePageComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('webcams') webcams: ElementRef<HTMLDivElement> | undefined;
  // Variables for video
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
    readonly chatService: ChatService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private localMedia: LocalMediaService,
    private element: ElementRef<HTMLElement>,
    private api: ApiService,
    private shortcut: ShortcutService,
    private sound: SoundService
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

  @HostListener('window:resize')
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

    this.moveTimout = window.setTimeout(() => {
      this.isToolbarHidden = true;
    }, 1500);

    this.route.paramMap.subscribe(async params => {
      this.route.data.subscribe(data => {
        this.roomId = params.get('roomId') as string;
        this.roomUrl = url.origin + '/' + this.roomId;

        let displayedRoomName = this.roomId;
        let moodleToken: string;

        if (data.moodle != null) {
          moodleToken = data.moodle.token;
          displayedRoomName = data.moodle.roomName;
        }

        const dialogRef = this.dialog.open(SettingsMasterComponent, {
          width: 'auto',
          height: 'auto',
          data: {
            mode: settingMode.JOIN_MEETING_MODE,
            roomID: displayedRoomName,
          },
        });

        dialogRef.afterClosed().subscribe(async result => {
          console.log('The dialog was closed');
          console.log(result);
          // if popup is canceled
          if (result == null || result === '') {
            this.localMedia.closeAudio();
            this.localMedia.closeVideo();
            this.router.navigate(['/']);
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
    if (user.id === this.currentUser.id) return this.currentUser.stream.screen;
    if (user.consumers?.screen) return new MediaStream([user.consumers.screen?.track]);
    return undefined;
  }

  setSidebarDetail($event: {element: Element; type: string}) {
    //console.log("Event occured")
    if (this.sidebarDetail instanceof Chat && this.sidebarDetail != null) {
      this.chatService.removeNewMessageInfo(this.sidebarDetail);
      console.log('Messages reset!');
    }

    if (this.detailType === $event.type) {
      if (this.sidebarDetail?.id === $event.element.id) {
        // If the old sidebarDetail was the same Chat, close it
        if ($event.element instanceof Chat) this.chatService.chatToggleOpen($event.element);
        this.sidebarDetail = undefined;
        this.detailType = undefined;
      } else {
        // If another sidebarDetail of type chat was opened, close it
        if (this.sidebarDetail instanceof Chat && this.sidebarDetail != null) this.chatService.chatToggleOpen(this.sidebarDetail);
        // If the new sidebarDetail is a chat, set it as opened
        if ($event.element instanceof Chat) this.chatService.chatToggleOpen($event.element);
        this.sidebarDetail = $event.element;
      }
    } else {
      // If another sidebarDetail of type chat was opened, close it
      if (this.sidebarDetail instanceof Chat && this.sidebarDetail != null) this.chatService.chatToggleOpen(this.sidebarDetail);
      // If the new sidebarDetail is a chat, set it as opened
      if ($event.element instanceof Chat) this.chatService.chatToggleOpen($event.element);
      this.sidebarDetail = $event.element;
      this.detailType = $event.type;
    }

    requestAnimationFrame(() => {
      this.recalculateMaxVideoWidth();
    });
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
}
