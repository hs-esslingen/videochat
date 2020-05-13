import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from "@angular/core";
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
export class LecturePageComponent implements OnInit, OnDestroy {
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

  currentUser: User = { id: "666", nickname: "Der King", producers: {}, isMuted: false, isTalking: true, signal: Signal.RAISED_HAND };
  users: User[] = [];

  constructor(
    readonly mediaService: MediaService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private localMedia: LocalMediaService,
    private element: ElementRef<HTMLElement>,
  ) {}


  @HostListener('window:resize', ['$event'])
  onResize(event) {
    console.log(this.element.nativeElement)
    this.element.nativeElement.style.setProperty('--max-video-width', 100 + "px")
    // this.    event.target.innerWidth;
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
}
