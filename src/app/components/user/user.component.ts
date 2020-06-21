import {Component, OnInit, Input, DoCheck, ViewChild, ElementRef, OnChanges, SimpleChanges, KeyValueDiffers, KeyValueDiffer} from '@angular/core';
import {WsService} from '../../helper/ws.service';
import {Subscription} from 'rxjs';
import {Consumer} from 'mediasoup-client/lib/types';
import {User} from 'src/app/model/user';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss'],
})
export class UserComponent implements OnInit, DoCheck, OnChanges {
  @Input() user!: User;
  @Input() playAudio = true;
  @Input() small = false;
  @Input() selected = false;

  videoElement!: ElementRef<HTMLVideoElement>;

  @ViewChild('video', {static: false}) set content(content: ElementRef<HTMLVideoElement>) {
    if (content) {
      // initially setter gets called with undefined
      this.videoElement = content;
    }
  }

  videoStream: MediaStream | undefined;
  audioStream: MediaStream | undefined;
  showVideo = false;
  differ: KeyValueDiffer<string, Consumer | undefined>;
  messageSubscription: Subscription | undefined;

  constructor(private keyValueDiffer: KeyValueDiffers, private ws: WsService) {
    this.differ = keyValueDiffer.find({}).create();
    this.messageSubscription = ws.messageObserver?.subscribe(msg => {
      if (msg.type === 'remove-producer') {
        if (msg.data.id === this.user.consumers?.screen?.producerId && this.user.producers.screen === msg.data.id) this.showVideo = false;
      }
    });
  }
  ngDoCheck(): void {
    if (this.user.consumers) {
      const change = this.differ.diff(this.user.consumers);
      if (change) {
        change.forEachItem(record => {
          if (record.key === 'audio') {
            this.updateAudio();
          } else {
            this.updateVideo();
            this.calcShowVideo();
          }
        });
      }
    }
  }

  ngOnInit(): void {
    this.calcShowVideo();
    this.updateAudio();
    this.updateVideo();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.user) {
      this.updateAudio();
      this.updateVideo();
      this.calcShowVideo();
    }
  }
  updateAudio() {
    if (this.user.consumers?.audio) this.audioStream = new MediaStream([this.user.consumers.audio.track]);
    else this.audioStream = undefined;
  }

  updateVideo() {
    if (this.user.consumers?.screen) this.videoStream = new MediaStream([this.user.consumers.screen.track]);
    else if (this.user.consumers?.video) this.videoStream = new MediaStream([this.user.consumers.video.track]);
    else this.videoStream = undefined;
  }

  calcShowVideo() {
    if (this.videoStream == null) this.showVideo = false;
    else {
      this.showVideo = true;
    }
  }
}
