import {
  Component,
  OnInit,
  ViewChild,
  AfterViewInit,
  ElementRef
} from "@angular/core";
import {
  Consumer,
} from "mediasoup-client/lib/types";
import { MediaService, Stream, MicrophoneState, CameraState } from 'src/app/helper/media.service';

@Component({
  selector: "app-meeting-page",
  templateUrl: "./meeting-page.component.html",
  styleUrls: ["./meeting-page.component.scss"]
})
export class MeetingPageComponent implements OnInit, AfterViewInit {
  @ViewChild("local") local: ElementRef<HTMLVideoElement>;
  videoConsumers: Stream[];
  audioConsumers: Stream[];
  autoGainControl: boolean;
  microphoneState: MicrophoneState = MicrophoneState.ENABLED;
  cameraState: CameraState = CameraState.ENABLED;
  localStream: MediaStream;

  constructor(readonly mediaService: MediaService) {

  }

  ngOnInit(): void {
  }


  async ngAfterViewInit(): Promise<void> {
    try {
      const localStream = await this.mediaService.getUserMedia();

      const observer = await this.mediaService.connectToRoom(0, localStream);
      observer.subscribe((data) => {
        console.log("update");
        this.audioConsumers = data.audioConsumers;
        this.videoConsumers = data.videoConsumers;
        this.autoGainControl = data.autoGainControl;
        this.cameraState = data.cameraState;
        this.microphoneState = data.microphoneState;
        this.localStream = data.localStream;

      })
    } catch (err) {
      console.error(err);
    }
  }
}
