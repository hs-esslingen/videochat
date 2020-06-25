import {Component, OnInit, Input, OnChanges} from '@angular/core';

@Component({
  selector: 'app-audio',
  templateUrl: './audio.component.html',
  styleUrls: ['./audio.component.scss'],
})
export class AudioComponent implements OnInit, OnChanges {
  @Input() audio!: MediaStreamTrack;

  audioStream: MediaStream | undefined;

  constructor() {}

  ngOnInit(): void {
    if (!(this.audio instanceof MediaStreamTrack)) return;
    this.audioStream = new MediaStream([this.audio]);
  }
  ngOnChanges(): void {
    this.audioStream = new MediaStream([this.audio]);
  }
}
