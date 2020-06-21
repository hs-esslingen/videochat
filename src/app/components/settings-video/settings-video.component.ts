import {Component, OnInit, Output, EventEmitter} from '@angular/core';
import {LocalMediaService} from 'src/app/helper/local-media.service';

@Component({
  selector: 'app-settings-video',
  templateUrl: './settings-video.component.html',
  styleUrls: ['./settings-video.component.scss'],
})
export class SettingsVideoComponent implements OnInit {
  videoDevices: MediaDeviceInfo[] | undefined;
  videoTrack: MediaStream | undefined;
  selectedVideoStream: string | undefined;

  @Output() selectedVideoStreamEvent = new EventEmitter<string>();

  constructor(private localMedia: LocalMediaService) {}

  async ngOnInit() {
    try {
      const videoStream = await this.localMedia.getVideoTrack();
      const videoTracks = videoStream.getVideoTracks();
      this.videoTrack = new MediaStream(videoTracks);
      if (videoTracks.length > 0) {
        this.selectedVideoStream = videoTracks[0].label;
        this.selectedVideoStreamEvent.emit(this.selectedVideoStream);
      }
    } catch (error) {
      this.selectedVideoStream = 'none';
      this.selectedVideoStreamEvent.emit(this.selectedVideoStream);
    }

    this.videoDevices = await this.localMedia.getVideoCapabilites();
  }

  ngOnDestroy(): void {}

  async changeVideoStream(label: string) {
    const videoTracks = this.videoTrack?.getVideoTracks();
    if (videoTracks && videoTracks.length > 0) videoTracks[0].stop();
    if (label === 'none') {
      this.videoTrack = undefined;
      this.selectedVideoStream = 'none';
      this.selectedVideoStreamEvent.emit(this.selectedVideoStream);
      this.localMedia.closeVideo();
      return;
    }
    const video = await this.localMedia.getVideoTrack(label);

    const newVideoTracks = video.getVideoTracks();
    this.videoTrack = video;
    if (newVideoTracks.length > 0) this.selectedVideoStream = newVideoTracks[0].label;

    console.log(this.selectedVideoStream);
    this.selectedVideoStreamEvent.emit(this.selectedVideoStream);
  }
}
