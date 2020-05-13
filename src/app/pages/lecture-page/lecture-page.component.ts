import { Component, OnInit } from "@angular/core";
import { User, Chat, Stream, MicrophoneState, ScreenshareState, CameraState, Signal, MediaService } from "src/app/helper/media.service";
import { ActivatedRoute } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { LocalMediaService } from "src/app/helper/local-media.service";
import { JoinMeetingPopupComponent } from "src/app/components/join-meeting-popup/join-meeting-popup.component";

@Component({
  selector: "app-lecture-page",
  templateUrl: "./lecture-page.component.html",
  styleUrls: ["./lecture-page.component.scss"],
})
export class LecturePageComponent implements OnInit {
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

  sidebarDetail = undefined;
  detailType = undefined;

  currentUser: User = { id: "666", nickname: "Der King", producers: {}, isMuted: false, isTalking: true, signal: Signal.RAISED_HAND };
  users: User[] = [
    { id: "1", nickname: "Leon", producers: {}, isMuted: false, isTalking: true, signal: Signal.RAISED_HAND },
    { id: "2", nickname: "Bartholomäus Rößler", producers: {}, isMuted: false, isTalking: true, signal: Signal.NONE },
    { id: "2", nickname: "Andreas Rößler", producers: {}, isMuted: false, isTalking: true, signal: Signal.VOTED_UP },
    { id: "2", nickname: "Andreas Rößler", producers: {}, isMuted: false, isTalking: true, signal: Signal.VOTED_DOWN },
    { id: "2", nickname: "Andreas Rößler", producers: {}, isMuted: true, isTalking: true, signal: Signal.VOTED_DOWN },
    { id: "2", nickname: "Andreas Rößler", producers: {}, isMuted: true, isTalking: false, signal: Signal.VOTED_UP },
    { id: "2", nickname: "Andreas Rößler", producers: {}, isMuted: true, isTalking: false, signal: Signal.VOTED_UP },
    { id: "2", nickname: "Andreas Rößler", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
    { id: "2", nickname: "Andreas Rößler", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
    { id: "2", nickname: "Andreas Rößler", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
    { id: "2", nickname: "Andreas Rößler", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
    { id: "2", nickname: "Andreas Rößler", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
    { id: "2", nickname: "Andreas Rößler", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
    { id: "2", nickname: "Andreas Rößler", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
    { id: "2", nickname: "Andreas Rößler", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
    { id: "2", nickname: "Andreas Rößler", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
    { id: "2", nickname: "Andreas Rößler", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
    { id: "2", nickname: "Andreas Rößler", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
    { id: "2", nickname: "Andreas Rößler", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
    { id: "2", nickname: "Andreas Rößler", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
    { id: "2", nickname: "Andreas Rößler", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
    { id: "2", nickname: "Andreas Rößler", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE },
  ];

  publicChat: Chat = { id: "1", partner: "Public Chat", messages: [], newMessage: false };

  chats: Chat[] = [
    { id: "2", partner: "Leon", messages: [], newMessage: true },
    { id: "3", partner: "Andy", messages: [], newMessage: false },
  ];

  constructor(readonly mediaService: MediaService, private route: ActivatedRoute, private dialog: MatDialog, private localMedia: LocalMediaService) {}

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
      return;
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
    //this.chats.push({id: "1", partner: "Public Chat", messages: [], newMessage: false})
  }

  toggleSidebar(element): void {
    //Most of this function is still missing (like polling)
    if (this.detailType == "chat") {
      if (this.sidebarDetail.id == element.id) {
        this.sidebarDetail = undefined;
        this.detailType = undefined;
      } else {
        this.sidebarDetail = element;
      }
    } else {
      this.sidebarDetail = element;
      this.detailType = "chat";
    }
  }

  raiseHand(): void {
    console.log("You've raised your Hand");
  }
  thumbsUp(): void {
    console.log("You've voted up!");
  }
  thumbsDown(): void {
    console.log("You've voted down!");
  }
  userInteraction(): void {}
  openSettings(): void {
    console.log("You've opened the settings!");
  }
  leaveChat(): void {
    console.log("You've left the lecture!");
  }
}
