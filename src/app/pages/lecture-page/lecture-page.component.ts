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
  demo = true;

  @ViewChild("webcams") webcams: ElementRef<HTMLDivElement>;
  // Variables for video
  videoConsumers: Stream[];
  audioConsumers: Stream[];
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
  singleVideo: User;
  duplicateSession = false;

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
  ) {}

  @HostListener("window:resize", ["$event"])
  onResize(event) {
    this.recalculateMaxVideoWidth();
  }

  ngAfterViewInit(): void {
    this.recalculateMaxVideoWidth();
  }

  recalculateMaxVideoWidth() {
    this.element.nativeElement.style.setProperty("--max-video-width", (this.webcams?.nativeElement?.clientHeight / 3) * 4 - 5 + "px");
    const numVideos = this.users.filter((user) => user.consumers?.video != undefined).length;
    const clientWidth = this.webcams?.nativeElement?.clientWidth;
    const clientHeight = this.webcams?.nativeElement?.clientHeight;

    let colums = 1;
    while ((1 / (colums + 1)) * clientWidth * (3 / 4) * Math.ceil((numVideos) / (colums)) > clientHeight) {
      colums++
    };
    const maxHeightPerElement = clientHeight / Math.ceil(numVideos / colums);
    const maxWidthPerElement = clientWidth / colums;
    const maxRatio = Math.min((maxHeightPerElement * (4 / 3)) / clientWidth, maxWidthPerElement / clientWidth);
    this.element.nativeElement.style.setProperty("--max-video-flex-basis", maxRatio * 100 - 0.1 + "%");
  }

  ngOnInit(): void {
    if (this.demo) this.test();

    const url = new URL(location.href);
    this.roomUrl = url.origin + url.pathname;
    // this.isMobile = this.checkMobile();
    // if (!this.isMobile) {
    //   this.moveTimout = (setTimeout(() => {
    //     this.isToolbarHidden = true;
    //   }, 1500) as any) as number;
    // }
    this.route.paramMap.subscribe(async (params) => {
      // don't actually connect if demo is enabled
      if (this.demo) return;

      this.roomId = params.get("roomId");
      // if (this.mediaService.nickname == undefined) this.openNicknameDialog();
      const dialogRef = this.dialog.open(JoinMeetingPopupComponent, {
        width: "400px",
        data: { nickname: this.mediaService.nickname, roomId: this.roomId },
      });
      dialogRef.afterClosed().subscribe(async (result) => {
        if (result == undefined || result === "") {
          this.localMedia.closeAudio();
          this.localMedia.closeVideo();
          return;
        }

        if (result.nickname !== "") this.mediaService.setNickname(result.nickname);

        try {
          const observer = await this.mediaService.connectToRoom(params.get("roomId"), result.isWebcamDisabled);
          if (observer != undefined)
            observer.subscribe((data) => {
              this.autoGainControl = data.autoGainControl;
              this.cameraState = data.cameraState;
              this.microphoneState = data.microphoneState;
              this.screenshareState = data.screenshareState;
              this.localStream = data.localStream;
              this.localSchreenshareStream = data.localScreenshareStream;
              this.users = data.users;

              if (!this.users.includes(this.singleVideo)) this.singleVideo = undefined;
              if (this.users.length <= 1) this.singleVideo = undefined;
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

  ngOnDestroy() {}

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
  }

  test(): void {
    this.users.push(
      { id: "1", nickname: "Test_1", consumers: {
        video: {},
      }, isMuted: false, isTalking: true, signal: Signal.RAISED_HAND },
      { id: "2", nickname: "Test_2", consumers: {
        video: {},
      }, isMuted: false, isTalking: true, signal: Signal.NONE },
      { id: "3", nickname: "Test_3", consumers: {
        video: {},
      }, isMuted: false, isTalking: true, signal: Signal.VOTED_UP },
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
