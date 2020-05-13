import { Component, OnInit, Input, DoCheck, IterableDiffers, IterableDiffer, ViewChild, ElementRef, OnChanges, SimpleChanges, KeyValueDiffers, KeyValueDiffer } from "@angular/core";
import { User, Stream } from "src/app/helper/media.service";
import { WsService } from "src/app/helper/ws.service";
import { Subscription } from "rxjs";
import { Consumer } from 'mediasoup-client/lib/types';

@Component({
  selector: "app-user",
  templateUrl: "./user.component.html",
  styleUrls: ["./user.component.scss"],
})
export class UserComponent implements OnInit, DoCheck, OnChanges {
  @Input() user: User;
  @Input() playAudio = true;
  @Input() small: boolean;
  @Input() selected: boolean;

  videoElement: ElementRef<HTMLVideoElement>;

  @ViewChild("video", { static: false }) set content(content: ElementRef<HTMLVideoElement>) {
    if (content) {
      // initially setter gets called with undefined
      this.videoElement = content;
    }
  }

  videoStream: MediaStream;
  audioStream: MediaStream;
  showVideo: boolean;
  differ: KeyValueDiffer<string, Consumer>;
  messageSubscription: Subscription;

  constructor(private keyValueDiffer: KeyValueDiffers, private ws: WsService) {
    this.differ = keyValueDiffer.find({}).create();
    this.messageSubscription = ws.messageObserver?.subscribe((msg) => {
      if (msg.type === "remove-producer") {
        if (msg.data.id === this.user.mappedProducer?.screen?.producerId && this.user.producers.screen === msg.data.id) this.showVideo = false;
      }
    });
  }
  ngDoCheck(): void {
    const change = this.differ.diff(this.user.mappedProducer)
    if (change) {
      change.forEachItem((record) => {
        if (record.key === "audio") {
          this.updateAudio();
        } else {
          this.updateVideo();
          this.calcShowVideo();
        }
        console.log(record);
      });
    }
  }

  ngOnInit(): void {
    this.calcShowVideo();
    this.updateAudio();
    this.updateVideo();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log(changes);
    if (changes.user) {
      this.updateAudio();
      this.updateVideo();
      this.calcShowVideo();
    }
  }
  updateAudio() {
    if (this.user.mappedProducer?.audio) this.audioStream = new MediaStream([this.user.mappedProducer.audio.track]);
    else this.audioStream = undefined;
  }

  updateVideo() {
    if (this.user.mappedProducer?.screen) this.videoStream = new MediaStream([this.user.mappedProducer.screen.track]);
    else if (this.user.mappedProducer?.video) this.videoStream = new MediaStream([this.user.mappedProducer.video.track]);
    else  this.videoStream = undefined;
  }

  calcShowVideo() {
    if (this.videoStream == undefined) this.showVideo = false;
    else {
      this.showVideo = true;
    }
  }
}
