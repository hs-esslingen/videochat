import { Component, OnInit, ViewChild, AfterViewInit, ElementRef } from '@angular/core';

@Component({
  selector: 'app-meeting-page',
  templateUrl: './meeting-page.component.html',
  styleUrls: ['./meeting-page.component.scss']
})
export class MeetingPageComponent implements OnInit, AfterViewInit {
  @ViewChild('local') local: ElementRef<HTMLVideoElement>;
  constructor() { }

  ngOnInit(): void {
    console.log(this.local);
  }

  ngAfterViewInit(): void {
    console.log(this.local.nativeElement);
    navigator.getUserMedia({ video: true, audio: true }, (stream) => {
      console.log(stream.getVideoTracks());
      console.log(stream.getAudioTracks());
      
      console.log(stream.getTracks());
    }, (err) => {

    })
  }

}
