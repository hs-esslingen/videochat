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

  //Variables for sidebar
  sidebarDetail = undefined;
  detailType = undefined;

  currentUser: User = { id: "666", nickname: "Der King", producers: {}, isMuted: false, isTalking: true, signal: Signal.RAISED_HAND };
  users: User[] = [];
  chats: Chat[] = [];

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
              if (!this.debug) this.users = data.users;

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
      if (this.sidebarDetail.partner.id == element.partner.id) {
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

  test(): void {
    this.users.push({ id: "1", nickname: "Test_1", producers: {}, isMuted: false, isTalking: true, signal: Signal.RAISED_HAND });
    this.users.push({ id: "2", nickname: "Test_2", producers: {}, isMuted: false, isTalking: true, signal: Signal.NONE });
    this.users.push({ id: "3", nickname: "Test_3", producers: {}, isMuted: false, isTalking: true, signal: Signal.VOTED_UP });
    this.users.push({ id: "4", nickname: "Test_4", producers: {}, isMuted: false, isTalking: true, signal: Signal.VOTED_DOWN });
    this.users.push({ id: "5", nickname: "Test_5", producers: {}, isMuted: true, isTalking: true, signal: Signal.VOTED_DOWN });
    this.users.push({ id: "6", nickname: "Test_6", producers: {}, isMuted: true, isTalking: false, signal: Signal.VOTED_UP });
    this.users.push({ id: "7", nickname: "Test_7", producers: {}, isMuted: true, isTalking: false, signal: Signal.VOTED_UP });
    this.users.push({ id: "8", nickname: "Test_8", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE });
    this.users.push({ id: "9", nickname: "Test_9", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE });
    this.users.push({ id: "10", nickname: "Test_10", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE });
    this.users.push({ id: "11", nickname: "Test_11", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE });
    this.users.push({ id: "12", nickname: "Test_12", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE });
    this.users.push({ id: "13", nickname: "Test_13", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE });
    this.users.push({ id: "14", nickname: "Test_14", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE });
    this.users.push({ id: "15", nickname: "Test_15", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE });
    this.users.push({ id: "16", nickname: "Test_16", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE });
    this.users.push({ id: "17", nickname: "Test_17", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE });
    this.users.push({ id: "18", nickname: "Test_18", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE });
    this.users.push({ id: "19", nickname: "Test_19", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE });
    this.users.push({ id: "20", nickname: "Test_20", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE });
    this.users.push({ id: "21", nickname: "Test_21", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE });
    this.users.push({ id: "22", nickname: "Test_22", producers: {}, isMuted: true, isTalking: false, signal: Signal.NONE });
  
    this.chats.push({id: "2", partner: this.users[0], messages: [], newMessage: true});
    this.chats.push({id: "3", partner: this.users[1], messages: [], newMessage: false});
  }
}
