import {Component, OnInit, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {MediaService} from 'src/app/helper/media.service';
import {LocalMediaService} from 'src/app/helper/local-media.service';

@Component({
  selector: 'app-settings-master',
  templateUrl: './settings-master.component.html',
  styleUrls: ['./settings-master.component.scss'],
})
export class SettingsMasterComponent implements OnInit {
  settingPage!: settingPages | undefined;
  roomID: string | undefined;
  mode!: settingMode;
  modules!: SettingModularity;
  nickname!: string;

  //Variables for audio management
  audioDevices: MediaDeviceInfo[] | undefined;

  //Variables for video management
  selectedVideoStream: string | undefined;

  constructor(
    public dialogRef: MatDialogRef<SettingsMasterComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: SettingsMasterComponentData
  ) {
    dialogRef.disableClose = true;
  }

  ngOnInit(): void {
    this.mode = this.data.mode;
    this.nickname = this.data.mediaService.nickname;
    if (this.data.roomID !== undefined) this.roomID = this.data.roomID;
    console.log('Code reached');

    switch (this.mode) {
      case settingMode.STANDARD_MODE:
        this.modules = {tabs: true, userSettings: true, videoSettings: true, audioSettings: true};
        this.settingPage = settingPages.USER_SETTINGS;
        break;

      case settingMode.JOIN_MEETING_MODE:
        this.modules = {tabs: false, userSettings: true, videoSettings: true, audioSettings: true};
        this.settingPage = undefined;
        break;

      case settingMode.INDIVIDUAL_MODE:
        this.modules = {
          tabs: this.data.modules?.tabs,
          userSettings: this.data.modules?.userSettings,
          videoSettings: this.data.modules?.videoSettings,
          audioSettings: this.data.modules?.audioSettings,
        };
        this.settingPage = this.data.initialTab;
        break;

      default:
        console.log('An unexpected error has occured!');
        break;
    }
    //console.log(this.modules);
  }

  saveChanges(): void {
    this.data.mediaService.setNickname(this.nickname);
    this.close();
  }

  close(): void {
    if (this.mode === settingMode.JOIN_MEETING_MODE) {
      if (this.audioDevices != null) {
        // clearInterval(this.intervalId); //Neccessary since in "ngOnDestry"?
        this.dialogRef.close({
          nickname: this.nickname,
          isWebcamDisabled: this.selectedVideoStream === 'none',
        });
      }
    }
    // OTHER MODES
  }
}

export enum settingPages {
  USER_SETTINGS = 0,
  VIDEO_SETTINGS = 1,
  AUDIO_SETTINGS = 2,
}

export interface SettingsMasterComponentData {
  mode: settingMode;
  mediaService: MediaService;
  modules?: SettingModularity;
  initialTab?: settingPages;
  autoGainControl?: boolean;
  roomID?: string;
}

export enum settingMode {
  STANDARD_MODE = 0,
  JOIN_MEETING_MODE = 1,
  INDIVIDUAL_MODE = 2,
}

export interface SettingModularity {
  tabs?: boolean;
  userSettings?: boolean;
  videoSettings?: boolean;
  audioSettings?: boolean;
}
