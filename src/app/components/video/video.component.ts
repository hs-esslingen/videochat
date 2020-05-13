import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-video',
  templateUrl: './video.component.html',
  styleUrls: ['./video.component.scss']
})
export class VideoComponent implements OnInit {
  @Input() video: MediaStreamTrack;

  videoStream: MediaStream;

  constructor() { }

  ngOnInit(): void {
    if (!(this.video instanceof MediaStreamTrack)) return;
      this.videoStream = new MediaStream([this.video]);

  }
}
