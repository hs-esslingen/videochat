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
import { MediaService } from 'src/app/helper/media.service';

@Component({
  selector: "app-meeting-page",
  templateUrl: "./meeting-page.component.html",
  styleUrls: ["./meeting-page.component.scss"]
})
export class MeetingPageComponent implements OnInit, AfterViewInit {
  @ViewChild("local") local: ElementRef<HTMLVideoElement>;
  videoConsumers: {
    consumer: Consumer;
    stream: MediaStream;
  }[] = [];
  audioConsumers: {
    consumer: Consumer;
    stream: MediaStream;
  }[] = [];

  constructor(private mediaService: MediaService) {

  }

  ngOnInit(): void {
  }


  trackByFn(index, item) {
    if (!item) return null;
    return item.consumer.producerId;
  }

  async ngAfterViewInit(): Promise<void> {
    try {
      const localStream = await this.mediaService.getUserMedia();
      this.local.nativeElement.srcObject = localStream;
      this.local.nativeElement.volume = 0;

      const { audioConsumers, videoConsumers } = await this.mediaService.connectToRoom(0, localStream);
      this.audioConsumers = audioConsumers;
      this.videoConsumers = videoConsumers;
    } catch (err) {
      console.error(err);
    }
  }
}
