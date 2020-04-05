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
} from "src/app/helper/media.service";
import { ActivatedRoute, ParamMap, Router } from "@angular/router";

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
  cameraState: CameraState = CameraState.ENABLED;
  localStream: MediaStream;

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

        const observer = await this.mediaService.connectToRoom(params.get("roomId"), localStream);
        observer.subscribe((data) => {
          console.log("update");
          this.audioConsumers = data.audioConsumers;
          this.videoConsumers = data.videoConsumers;
          this.autoGainControl = data.autoGainControl;
          this.cameraState = data.cameraState;
          this.microphoneState = data.microphoneState;
          this.localStream = data.localStream;
        });
      });
    } catch (err) {
      console.error(err);
    }
  }

  async disconnect(){
    this.mediaService.disconnect();
    this.router.navigate(['/thank-you'])
  }
}
