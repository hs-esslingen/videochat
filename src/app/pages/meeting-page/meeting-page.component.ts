import {
  Component,
  OnInit,
  ViewChild,
  AfterViewInit,
  ElementRef,
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

enum Layout {
  GRID = "GRID",
  SINGLE = "SINGLE",
}

@Component({
  selector: "app-meeting-page",
  templateUrl: "./meeting-page.component.html",
  styleUrls: ["./meeting-page.component.scss"],
})
export class MeetingPageComponent implements OnInit, AfterViewInit {
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


  constructor(
    readonly mediaService: MediaService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit() {
    try {
      this.route.paramMap.subscribe(async (params) => {
        const localStream = await this.mediaService.getUserMedia();

        this.roomId = params.get("roomId");
        const observer = await this.mediaService.connectToRoom(
          params.get("roomId"),
          localStream
        );
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
        });
      });
    } catch (err) {
      console.error(err);
    }
  }

  async disconnect() {
    await this.mediaService.disconnect();
    this.router.navigate(["/" + this.roomId + "/thank-you"]);
  }
}
