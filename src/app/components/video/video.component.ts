import { Component, OnInit, Input } from '@angular/core';
import { Consumer } from 'mediasoup-client/lib/types';

@Component({
  selector: 'app-video',
  templateUrl: './video.component.html',
  styleUrls: ['./video.component.scss']
})
export class VideoComponent implements OnInit {
  @Input() video: Consumer;

  constructor() { }

  ngOnInit(): void {
  }

  getStream(video: Consumer) {
    return;
    return new MediaStream([video?.track]);
  }


}
