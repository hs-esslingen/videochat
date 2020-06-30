import {Component, OnInit, Input, OnChanges} from '@angular/core';

@Component({
  selector: 'app-video',
  templateUrl: './video.component.html',
  styleUrls: ['./video.component.scss'],
})
export class VideoComponent implements OnInit, OnChanges {
  @Input() video!: MediaStreamTrack;

  videoStream: MediaStream | undefined;

  constructor() {}

  ngOnInit(): void {
    if (!(this.video instanceof MediaStreamTrack)) return;
    this.videoStream = new MediaStream([this.video]);
  }
  ngOnChanges(): void {
    if (!(this.video instanceof MediaStreamTrack)) return;
    this.videoStream = new MediaStream([this.video]);
  }
}
