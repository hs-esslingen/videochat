import { Component, OnInit, Input } from '@angular/core';
import { Consumer } from 'mediasoup-client/lib/types';

@Component({
  selector: 'app-audio',
  templateUrl: './audio.component.html',
  styleUrls: ['./audio.component.scss']
})
export class AudioComponent implements OnInit {
  @Input() audio: Consumer;

  constructor() { }

  ngOnInit(): void {
  }


  getStream(audio: Consumer) {
    return;
    return new MediaStream([audio?.track]);
  }

}
