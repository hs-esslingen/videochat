import {
  Component,
  OnInit,
  ViewChild,
  AfterViewInit,
  ElementRef,
  Inject,
  OnDestroy,
} from "@angular/core";
import {
  MediaService,
  Stream,
  MicrophoneState,
  CameraState,
  ScreenshareState,
  User,
} from "src/app/helper/media.service";
import { ActivatedRoute, ParamMap, Router } from "@angular/router";
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialog,
} from "@angular/material/dialog";
import { JoinMeetingPopupComponent } from "src/app/components/join-meeting-popup/join-meeting-popup.component";
import { LocalMediaService } from 'src/app/helper/local-media.service';

enum Layout {
  GRID = "GRID",
  SINGLE = "SINGLE",
}

@Component({
  selector: "app-nickname-dialog",
  templateUrl: "./choose-nickname.component.html",
  styleUrls: ["./choose-nickname.component.scss"],
})
export class NicknameDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<NicknameDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: NicknameDialogData
  ) {}

  close(): void {
    this.dialogRef.close(this.data.nickname);
  }
}

@Component({
  selector: "app-debug-dialog",
  templateUrl: "./debug-stats.component.html",
  styleUrls: ["./debug-stats.component.scss"],
})
export class DebugDialogComponent {
  debugInfo: { [key: string]: { [key: string]: string } } = {};
  objectKeys = Object.keys;

  constructor(
    public dialogRef: MatDialogRef<NicknameDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    for (const key of data.keys()) {
      this.debugInfo[key] = data.get(key);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}

export interface NicknameDialogData {
  nickname: string;
}

@Component({
  selector: "app-meeting-page",
  templateUrl: "./meeting-page.component.html",
  styleUrls: ["./meeting-page.component.scss"],
})
export class MeetingPageComponent implements OnInit, OnDestroy {
  @ViewChild("local") local: ElementRef<HTMLVideoElement>;
  videoConsumers: Stream[];
  audioConsumers: Stream[];
  autoGainControl: boolean;
  microphoneState: MicrophoneState = MicrophoneState.ENABLED;
  cameraState: CameraState = CameraState.DISABLED;
  screenshareState: ScreenshareState = ScreenshareState.DISABLED;
  localStream: MediaStream;
  localSchreenshareStream: MediaStream;
  videoLayout: Layout = Layout.SINGLE;
  users: User[];
  roomId: string;
  moveTimout: number;
  isToolbarHidden = false;
  isMobile = false;
  roomUrl: string;
  singleVideo: User;
  duplicateSession = false;

  constructor(
    readonly mediaService: MediaService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private localMedia: LocalMediaService,
  ) {}

  ngOnInit(): void {
    const url = new URL(location.href);
    this.roomUrl = url.origin + url.pathname;
    this.isMobile = this.checkMobile();
    if (!this.isMobile) {
      this.moveTimout = (setTimeout(() => {
        this.isToolbarHidden = true;
      }, 1500) as any) as number;
    }
    this.route.paramMap.subscribe(async (params) => {
      this.roomId = params.get("roomId");
      // if (this.mediaService.nickname == undefined) this.openNicknameDialog();
      const dialogRef = this.dialog.open(JoinMeetingPopupComponent, {
        width: "400px",
        data: { nickname: this.mediaService.nickname, roomId: this.roomId },
      });
      dialogRef.afterClosed().subscribe(async (result) => {
        if (result == undefined) {
          this.localMedia.closeAudio();
          this.localMedia.closeVideo();
          return;
        }

        if (result.nickname !== "")
          this.mediaService.setNickname(result.nickname);

        try {
          const observer = await this.mediaService.connectToRoom(
            params.get("roomId"),
            result.isWebcamDisabled
          );
          if (observer != undefined)
            observer.subscribe((data) => {
              this.audioConsumers = data.audioConsumers;
              this.videoConsumers = data.videoConsumers;
              this.autoGainControl = data.autoGainControl;
              this.cameraState = data.cameraState;
              this.microphoneState = data.microphoneState;
              this.screenshareState = data.screenshareState;
              this.localStream = data.localStream;
              this.localSchreenshareStream = data.localScreenshareStream;
              this.users = data.users;

              if (!this.users.includes(this.singleVideo))
                this.singleVideo = undefined;
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

  ngOnDestroy(): void {
    this.mediaService.disconnect();
  }

  reload() {
    window.location.reload();
  }

  async disconnect() {
    this.router.navigate(["/" + this.roomId + "/thank-you"]);
  }

  openNicknameDialog(): void {
    const dialogRef = this.dialog.open(NicknameDialogComponent, {
      width: "300px",
      data: { nickname: this.mediaService.nickname },
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log("The dialog was closed");
      console.log(result);
      if (result != undefined || "") this.mediaService.setNickname(result);
    });
  }
  async openDebugDialog() {
    if (this.mediaService.LocalVideoProducer) {
      const dialogRef = this.dialog.open(DebugDialogComponent, {
        width: "1200px",
        data: await this.mediaService.LocalVideoProducer.getStats(),
      });

      dialogRef.afterClosed().subscribe((result) => {
        console.log("The dialog was closed");
      });
    }
  }

  toggleSingleGrid(user: User) {
    if (this.users.length <= 1) return;
    if (this.singleVideo === user) this.singleVideo = undefined;
    else this.singleVideo = user;
  }

  onMousemoove() {
    if (!this.isMobile) {
      this.isToolbarHidden = false;
      clearTimeout(this.moveTimout);
      this.moveTimout = (setTimeout(() => {
        this.isToolbarHidden = true;
      }, 1500) as any) as number;
    }
  }

  checkMobile() {
    let check = false;
    ((a) => {
      if (
        /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(
          a
        ) ||
        /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
          a.substr(0, 4)
        )
      )
        check = true;
      // @ts-ignore
    })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
  }
}
