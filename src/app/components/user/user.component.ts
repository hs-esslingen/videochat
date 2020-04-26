import {
  Component,
  OnInit,
  Input,
  DoCheck,
  IterableDiffers,
  IterableDiffer,
  ViewChild,
  ElementRef,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import { User, Stream } from "src/app/helper/media.service";
import { WsService } from 'src/app/helper/ws.service';
import { Subscription } from 'rxjs';

@Component({
  selector: "app-user",
  templateUrl: "./user.component.html",
  styleUrls: ["./user.component.scss"],
})
export class UserComponent implements OnInit, DoCheck, OnChanges {
  @Input() user: User;
  @Input() audioConsumers: Stream[];
  @Input() videoConsumers: Stream[];
  @Input() small: boolean;
  @Input() selected: boolean;

  videoElement: ElementRef<HTMLVideoElement>;

  @ViewChild("video", { static: false }) set content(
    content: ElementRef<HTMLVideoElement>
  ) {
    if (content) {
      // initially setter gets called with undefined
      this.videoElement = content;
    }
  }

  videoStream: Stream;
  audioStream: Stream;
  showVideo: boolean;
  iterableDifferVideo: IterableDiffer<Stream>;
  iterableDifferAudio: IterableDiffer<Stream>;
  messageSubscription: Subscription;

  constructor(private iterableDiffers: IterableDiffers, private ws: WsService) {
    this.iterableDifferVideo = iterableDiffers.find([]).create(null);
    this.iterableDifferAudio = iterableDiffers.find([]).create(null);

    this.messageSubscription = ws.messageObserver.subscribe((msg) => {
      if (msg.type === "remove-producer") {
        if (msg.data.id === this.videoStream?.consumer.producerId && this.user.producers.screen === msg.data.id) this.showVideo = false;
      }
    })
  }

  ngOnInit(): void {
    this.videoStream = this.videoConsumers?.find(
      (item) => item.consumer.producerId === this.user.producers.video
    );
    this.audioStream = this.audioConsumers?.find(
      (item) => item.consumer.producerId === this.user.producers.audio
    );
    this.calcShowVideo();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes.user && this.videoElement) {
      this.updateAudio();
      this.updateVideo();
    }
  }

  ngDoCheck(): void {
    const videoChanges = this.iterableDifferVideo.diff(this.videoConsumers);
    if (videoChanges) {
      this.updateVideo();
    }
    const audioChanges = this.iterableDifferAudio.diff(this.audioConsumers);
    if (audioChanges) {
      this.updateAudio();
    }
  }

  updateVideo() {
    let videoStream;
    videoStream = this.videoConsumers?.find(
      (item) => item.consumer.producerId === this.user.producers.video
    );
    if (this.user.producers.screen) {
      let screenshareStream;
      screenshareStream = this.videoConsumers?.find(
        (item) => item.consumer.producerId === this.user.producers.screen
      );
      if (screenshareStream != undefined) {
        videoStream = screenshareStream;
      }
    }
    this.videoStream = videoStream;
    this.calcShowVideo();
    // if (this.videoStream !== videoStream) {
    //   this.videoStream = undefined;
    //   // if (this.showVideo === true) this.videoElement.nativeElement.pause();
    //   setTimeout(() => {
    //     this.videoStream = videoStream;
    //     this.calcShowVideo();
    //     if (videoStream != undefined) {
    //       setTimeout(() => {
    //         // this.videoElement.nativeElement.play();
    //       }, 50);
    //     }
    //   }, 100);
    // }
    // if (videoStream != undefined) {
    //   this.videoStream = videoStream;
    // }
  }

  updateAudio() {
    this.audioStream = this.audioConsumers?.find(
      (item) => item.consumer.producerId === this.user.producers.audio
    );
  }

  calcShowVideo() {
    if (this.videoStream == undefined) this.showVideo = false;
    else {
      this.showVideo = true;
    }
  }
}
