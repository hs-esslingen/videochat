import {
  Component,
  OnInit,
  ViewChild,
  AfterViewInit,
  ElementRef
} from "@angular/core";
import {
  Consumer,
} from "mediasoup-client/lib/types";
import { MediaService, Stream } from 'src/app/helper/media.service';

@Component({
  selector: "app-meeting-page",
  templateUrl: "./meeting-page.component.html",
  styleUrls: ["./meeting-page.component.scss"]
})
export class MeetingPageComponent implements OnInit, AfterViewInit {
  @ViewChild("local") local: ElementRef<HTMLVideoElement>;
  videoConsumers: Stream[];
  audioConsumers: Stream[];

  constructor(private mediaService: MediaService) {

  }

  ngOnInit(): void {
  }


  async ngAfterViewInit(): Promise<void> {
    try {
      const localStream = await this.mediaService.getUserMedia();
      this.local.nativeElement.srcObject = localStream;
      this.local.nativeElement.volume = 0;

      const observer = await this.mediaService.connectToRoom(0, localStream);
      observer.subscribe((data) => {
        console.log("update");
        this.audioConsumers = data.audioConsumers;
        this.videoConsumers = data.videoConsumers;
      },()=>{}, ()=> {})
    } catch (err) {
      console.error(err);
    }
  }
}
