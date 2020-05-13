import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, AfterViewInit } from "@angular/core";
import { User, Stream, MicrophoneState, ScreenshareState, CameraState, Signal, MediaService } from "src/app/helper/media.service";
import { ActivatedRoute } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { LocalMediaService } from "src/app/helper/local-media.service";
import { JoinMeetingPopupComponent } from "src/app/components/join-meeting-popup/join-meeting-popup.component";

@Component({
  selector: "app-lecture-page",
  templateUrl: "./lecture-page.component.html",
  styleUrls: ["./lecture-page.component.scss"],
})
export class LecturePageComponent implements OnInit, OnDestroy, AfterViewInit {
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

  //Variables for Users
  currentUser: User = { id: "666", nickname: "Der King", producers: {}, isMuted: false, isTalking: true, signal: Signal.RAISED_HAND };
  users: User[] = [];

  //Variables for sidebar
  sidebarDetail = undefined;
  detailType = undefined;

  constructor(
    readonly mediaService: MediaService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private localMedia: LocalMediaService,
    private element: ElementRef<HTMLElement>,
  ) {}


  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.recalculateMaxVideoWidth();
  }

  ngAfterViewInit(): void {
    this.recalculateMaxVideoWidth();
  }

  recalculateMaxVideoWidth() {
    this.element.nativeElement.style.setProperty('--max-video-width', (this.webcams?.nativeElement?.clientHeight / 3 * 4) - 5 + "px");
    const numVideos = this.users.filter((user) => user.consumers?.video != undefined).length;
    console.log(numVideos);
    console.log(this.webcams?.nativeElement?.clientWidth);
    this.element.nativeElement.style.setProperty('--max-video-flex-basis', (this.webcams?.nativeElement?.clientHeight / 3 * 4) - 5 + "px");

  }

  ngOnInit(): void {
    const url = new URL(location.href);
    this.roomUrl = url.origin + url.pathname;
    // this.isMobile = this.checkMobile();
    // if (!this.isMobile) {
    //   this.moveTimout = (setTimeout(() => {
    //     this.isToolbarHidden = true;
    //   }, 1500) as any) as number;
    // }
    this.route.paramMap.subscribe(async (params) => {
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

  ngOnDestroy() {

  }

  updateSidebar($event) {
    //console.log("Event occured")
    if (this.detailType == $event.type) {
      if (this.sidebarDetail.id == $event.element.id) {
        this.sidebarDetail = undefined;
        this.detailType = undefined;
      }
      else {
        this.sidebarDetail = $event.element;
      }
    }
    else {
      this.sidebarDetail = $event.element;
      this.detailType = $event.type;
    }
  }
}
