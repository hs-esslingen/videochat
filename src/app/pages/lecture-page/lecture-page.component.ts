import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, AfterViewInit } from "@angular/core";
import { User, Stream, MicrophoneState, ScreenshareState, CameraState, Signal, MediaService } from "src/app/helper/media.service";
import { ActivatedRoute } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { LocalMediaService } from "src/app/helper/local-media.service";
import { JoinMeetingPopupComponent } from "src/app/components/join-meeting-popup/join-meeting-popup.component";
import { ChatService } from "src/app/helper/chat.service";

@Component({
  selector: "app-lecture-page",
  templateUrl: "./lecture-page.component.html",
  styleUrls: ["./lecture-page.component.scss"],
})
export class LecturePageComponent implements OnInit, OnDestroy, AfterViewInit {
  // Enables / Disables debug mode, that creates some dummy users and chats
  demo = false;

  @ViewChild("webcams") webcams: ElementRef<HTMLDivElement>;
  // Variables for video
  autoGainControl: boolean;
  microphoneState: MicrophoneState = MicrophoneState.ENABLED;
  cameraState: CameraState = CameraState.DISABLED;
  screenshareState: ScreenshareState = ScreenshareState.DISABLED;
  localStream: MediaStream;
  localSchreenshareStream: MediaStream;
  roomId: string;
  moveTimout: number;
  isToolbarHidden = false;
  isMobile = false;
  roomUrl: string;
  duplicateSession = false;

  screenShareUser: User;
  screenShareStream: MediaStream;
  webcamHeight = 0.2;

  // Variables for Users
  currentUser: User = { id: "666", nickname: "Der King", producers: {}, isMuted: false, isTalking: true, signal: Signal.RAISED_HAND };
  users: User[] = [];

  // Variables for sidebar
  sidebarDetail = undefined;
  detailType = undefined;

  constructor(
    readonly mediaService: MediaService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private localMedia: LocalMediaService,
    private element: ElementRef<HTMLElement>,
    readonly chatService: ChatService
  ) {
    const webcamHeight = window.localStorage.getItem("webcamHeight");
    if (webcamHeight != undefined) this.webcamHeight = parseFloat(webcamHeight);
  }

  @HostListener("window:resize", ["$event"])
  onResize(event) {
    this.recalculateMaxVideoWidth();
  }

  ngAfterViewInit(): void {
    this.recalculateMaxVideoWidth();
  }

  recalculateMaxVideoWidth() {
    this.element.nativeElement.style.setProperty("--max-video-width", (this.webcams?.nativeElement?.clientHeight / 3) * 4 - 5 + "px");

    let numVideos = this.users.filter((user) => user.consumers?.video != undefined).length;
    if (this.localStream != undefined) numVideos++;

    const clientWidth = this.webcams?.nativeElement?.clientWidth;
    const clientHeight = this.webcams?.nativeElement?.clientHeight;

    let colums = 1;
    while ((1 / (colums + 1)) * clientWidth * (3 / 4) * Math.ceil(numVideos / colums) > clientHeight) {
      colums++;
    }
    const maxHeightPerElement = clientHeight / Math.ceil(numVideos / colums);
    const maxWidthPerElement = clientWidth / colums;
    const maxRatio = Math.min((maxHeightPerElement * (4 / 3)) / clientWidth, maxWidthPerElement / clientWidth);
    this.element.nativeElement.style.setProperty("--max-video-flex-basis", maxRatio * 100 - 1 + "%");
  }

  startDividerDrag() {
    const pointerMove = (e: PointerEvent) => {
      this.webcamHeight = Math.min(Math.max((e.clientY - 52) / (window.innerHeight - 52), 0.1), 0.9);
      requestAnimationFrame(() => {
        this.recalculateMaxVideoWidth();
      });
    };
    const pointerUp = (e: PointerEvent) => {
      window.localStorage.setItem("webcamHeight", this.webcamHeight.toString());
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointermove", pointerMove);
    };
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointermove", pointerMove);
  }

  ngOnInit(): void {
    if (this.demo) {
      this.test();
      this.screenShareUser = this.users[0];
    }

    const url = new URL(location.href);
    this.roomUrl = url.origin + url.pathname;

    this.moveTimout = (setTimeout(() => {
      this.isToolbarHidden = true;
    }, 1500) as any) as number;

    this.currentUser.nickname = this.mediaService.nickname;

    this.route.paramMap.subscribe(async (params) => {
      // don't actually connect if demo is enabled
      if (this.demo) return;

      this.roomId = params.get("roomId");
      const dialogRef = this.dialog.open(JoinMeetingPopupComponent, {
        width: "400px",
        data: { nickname: this.mediaService.nickname, roomId: this.roomId },
      });
      dialogRef.afterClosed().subscribe(async (result) => {

        // if popup is canceled
        if (result == undefined || result === "") {
          this.localMedia.closeAudio();
          this.localMedia.closeVideo();
          return;
        }
        // Proceed when all informations are given

        // TODO rework states (use current user)
        this.currentUser.nickname = this.mediaService.nickname;

        if (result.nickname !== "") this.mediaService.setNickname(result.nickname);
        else this.mediaService.setNickname("User " +  Math.round(Math.random() * 100));

        try {
          const observer = await this.mediaService.connectToRoom(this.roomId, result.isWebcamDisabled);
          observer.subscribe((data) => {
            this.autoGainControl = data.autoGainControl;
            this.cameraState = data.cameraState;
            this.microphoneState = data.microphoneState;
            this.screenshareState = data.screenshareState;
            this.localStream = data.localStream;
            this.localSchreenshareStream = data.localScreenshareStream;
            this.users = data.users;

            let screenShareUser = this.users.find((item) => item.consumers?.screen != undefined);
            if (this.screenshareState === ScreenshareState.ENABLED) screenShareUser = this.currentUser;

            if (screenShareUser != undefined && screenShareUser !== this.screenShareUser) {
              this.screenShareStream = this.getScreenShareStream(screenShareUser);
            }
            this.screenShareUser = screenShareUser;

            requestAnimationFrame(() => {
              this.recalculateMaxVideoWidth();
            });
          });
        } catch (err) {
          if (err === "DUPLICATE SESSION") {
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
    return new MediaStream([user.consumers.screen?.track]);
  }

  updateSidebar($event) {
    // console.log("Event occured")
    if (this.detailType === $event.type) {
      if (this.sidebarDetail.id === $event.element.id) {
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

  onMousemove() {
    if (!this.isMobile) {
      this.isToolbarHidden = false;
      clearTimeout(this.moveTimout);
      this.moveTimout = (setTimeout(() => {
        this.isToolbarHidden = true;
      }, 1500) as any) as number;
    }
  }

  test(): void {
    this.currentUser = { id: "666", nickname: "Der King", producers: {}, isMuted: false, isTalking: true, signal: Signal.RAISED_HAND };

    this.users.push(
      {
        id: "1",
        nickname: "Test_1",
        consumers: {
          // @ts-ignore
          video: {},
          // @ts-ignore
          screen: {},
        },
        isMuted: false,
        isTalking: true,
        signal: Signal.RAISED_HAND,
      },
      {
        id: "2",
        nickname: "Test_2",
        consumers: {
          // @ts-ignore
          video: {},
        },
        isMuted: false,
        isTalking: true,
        signal: Signal.NONE,
      },
      {
        id: "3",
        nickname: "Test_3",
        consumers: {
          // @ts-ignore
          video: {},
        },
        isMuted: false,
        isTalking: true,
        signal: Signal.VOTED_UP,
      },
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
