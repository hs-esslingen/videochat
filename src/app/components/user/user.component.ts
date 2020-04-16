import {
  Component,
  OnInit,
  Input,
  DoCheck,
  IterableDiffers,
  IterableDiffer,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { User, Stream } from "src/app/helper/media.service";

@Component({
  selector: "app-user",
  templateUrl: "./user.component.html",
  styleUrls: ["./user.component.scss"],
})
export class UserComponent implements OnInit, DoCheck {
  @Input() user: User;
  @Input() audioConsumers: Stream[];
  @Input() videoConsumers: Stream[];

  videoElement: ElementRef<HTMLVideoElement>;

  @ViewChild("video", { static: false }) set content(
    content: ElementRef<HTMLVideoElement>
  ) {
    console.log("#######################################");
    if (content) {
      // initially setter gets called with undefined
      this.videoElement = content;
    }
  }

  videoStream: MediaStream;
  audioStream: MediaStream;
  showVideo: boolean;
  iterableDifferVideo: IterableDiffer<Stream>;
  iterableDifferAudio: IterableDiffer<Stream>;

  constructor(private iterableDiffers: IterableDiffers) {
    this.iterableDifferVideo = iterableDiffers.find([]).create(null);
    this.iterableDifferAudio = iterableDiffers.find([]).create(null);
  }

  ngOnInit(): void {
    this.videoStream = this.videoConsumers.find(
      (item) => item.consumer.producerId === this.user.producers.video
    )?.stream;
    this.audioStream = this.audioConsumers.find(
      (item) => item.consumer.producerId === this.user.producers.audio
    )?.stream;
    this.calcShowVideo();
  }

  ngDoCheck(): void {
    const videoChanges = this.iterableDifferVideo.diff(this.videoConsumers);
    if (videoChanges) {
      console.log("videochanges");
      let videoStream = this.videoStream;
      videoStream = this.videoConsumers.find(
        (item) => item.consumer.producerId === this.user.producers.video
      )?.stream;
      if (this.user.producers.screen) {
        let screenshareStream;
        screenshareStream = this.videoConsumers.find(
          (item) => item.consumer.producerId === this.user.producers.screen
        )?.stream;
        if (screenshareStream != undefined) {
          videoStream = screenshareStream;
        }
      }
      if (this.videoStream !== videoStream) {
        this.videoStream = undefined;
        if (this.showVideo === true) this.videoElement.nativeElement.pause();
        setTimeout(() => {
          this.videoStream = videoStream;
          this.calcShowVideo();
          if (videoStream != undefined) {
            setTimeout(() => {
              this.videoElement.nativeElement.play();
            }, 50);
          }
        }, 100);
      }
    }
    const audioChanges = this.iterableDifferAudio.diff(this.audioConsumers);
    if (audioChanges) {
      this.audioStream = this.audioConsumers.find(
        (item) => item.consumer.producerId === this.user.producers.audio
      )?.stream;
    }
  }

  calcShowVideo() {
    console.log(this.videoStream);
    if (this.videoStream == undefined) this.showVideo = false;
    else {
      this.showVideo = true;
    }
  }
}
