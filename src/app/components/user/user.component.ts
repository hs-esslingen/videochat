import { Component, OnInit, Input, OnChanges, SimpleChanges, DoCheck, IterableDiffers, IterableDiffer } from '@angular/core';
import { User, Stream } from 'src/app/helper/media.service';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserComponent implements OnInit, DoCheck {
  @Input() user: User;
  @Input() audioConsumers: Stream[];
  @Input() videoConsumers: Stream[];

  videoStream: MediaStream;
  audioStream: MediaStream;
  iterableDifferVideo: IterableDiffer<Stream>;
  iterableDifferAudio: IterableDiffer<Stream>;

  constructor(private iterableDiffers: IterableDiffers) {
    this.iterableDifferVideo = iterableDiffers.find([]).create(null);
    this.iterableDifferAudio = iterableDiffers.find([]).create(null);

  }

  ngOnInit(): void {
    this.videoStream = this.videoConsumers.find((item) => item.consumer.producerId === this.user.producers.video)?.stream;
    this.audioStream = this.audioConsumers.find((item) => item.consumer.producerId === this.user.producers.audio)?.stream;
  }

  ngDoCheck(): void {
    const videoChanges = this.iterableDifferVideo.diff(this.videoConsumers);
    if (videoChanges) {
      this.videoStream = this.videoConsumers.find((item) => item.consumer.producerId === this.user.producers.video)?.stream;
      let screenshareStream;
      if (this.user.producers.screen) screenshareStream = this.videoConsumers.find((item) => item.consumer.producerId === this.user.producers.screen)?.stream;
      if (screenshareStream != undefined) this.videoStream = screenshareStream;
    }
    const audioChanges = this.iterableDifferAudio.diff(this.audioConsumers);
    if (audioChanges) {
      this.audioStream = this.audioConsumers.find((item) => item.consumer.producerId === this.user.producers.audio)?.stream;
    }

  }

}
