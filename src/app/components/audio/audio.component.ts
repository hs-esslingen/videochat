import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-audio',
  templateUrl: './audio.component.html',
  styleUrls: ['./audio.component.scss']
})
export class AudioComponent implements OnInit {
  @Input() audio: MediaStreamTrack;

  constructor() { }

  ngOnInit(): void {
  }


  getStream(audio: MediaStreamTrack) {
    if (!(audio instanceof MediaStreamTrack)) return;
    return new MediaStream([audio]);
  }

}
