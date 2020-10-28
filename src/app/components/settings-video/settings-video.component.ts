import {Component, OnInit, Output, EventEmitter, Input} from '@angular/core';
import {LocalMediaService} from 'src/app/helper/local-media.service';

@Component({
  selector: 'app-settings-video',
  templateUrl: './settings-video.component.html',
  styleUrls: ['./settings-video.component.scss'],
})
export class SettingsVideoComponent implements OnInit {
  @Input() disableSelection!: boolean;

  @Input() videoDevices: MediaDeviceInfo[] | undefined;
  @Input() videoTrack: MediaStream | undefined;
  @Input() selectedVideoStream: string | undefined;

  @Output() selectedVideoStreamEvent = new EventEmitter<string>();
  @Output() changeVideoStreamEvent = new EventEmitter<string>();

  constructor(private localMedia: LocalMediaService) {}

  async ngOnInit() {}

  ngOnDestroy(): void {}

  async changeVideoStream(label: string) {
    this.changeVideoStreamEvent.emit(label);
  }
}
