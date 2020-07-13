import {Component, OnInit, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {MediaService} from 'src/app/helper/media.service';

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

  // Variables for user-settings
  sendOnEnterOld!: boolean;

  // Variables for audio-settings
  audioDevices: MediaDeviceInfo[] | undefined;
  autoGainControlOld!: boolean;

  // Variables for video-settings
  selectedVideoStream: string | undefined;

  constructor(
    readonly mediaService: MediaService,
    public dialogRef: MatDialogRef<SettingsMasterComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: SettingsMasterComponentData
  ) {
    dialogRef.disableClose = true;
  }

  ngOnInit(): void {
    this.mode = this.data.mode;
    if (this.data.roomID !== undefined) this.roomID = this.data.roomID;

    localStorage.getItem('autoGainControl') === 'true' ? (this.autoGainControlOld = true) : (this.autoGainControlOld = false);
    localStorage.getItem('sendOnEnter') === 'true' ? (this.sendOnEnterOld = true) : (this.sendOnEnterOld = false);

    switch (this.mode) {
      case settingMode.STANDARD_MODE:
        this.modules = {room: true, tabs: true, userSettings: true, videoSettings: true, audioSettings: {display: true, displayAGC: true}};
        this.settingPage = settingPages.USER_SETTINGS;
        break;

      case settingMode.JOIN_MEETING_MODE:
        this.modules = {room: true, tabs: false, userSettings: false, videoSettings: true, audioSettings: {display: true, displayAGC: false}};
        this.settingPage = undefined;
        break;

      case settingMode.INDIVIDUAL_MODE:
        this.modules = {
          room: this.data.modules?.room,
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
  }

  discardChanges(): void {
    if (this.autoGainControlOld === true) localStorage.setItem('autoGainControl', 'true');
    else localStorage.setItem('autoGainControl', 'false');

    if (this.sendOnEnterOld === true) localStorage.setItem('sendOnEnter', 'true');
    else localStorage.setItem('sendOnEnter', 'false');

    this.dialogRef.close();
  }

  saveChanges(): void {
    this.close();
  }

  close(): void {
    if (this.mode === settingMode.JOIN_MEETING_MODE) {
      if (this.audioDevices != null) {
        this.dialogRef.close({
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
  modules?: SettingModularity;
  initialTab?: settingPages;
  roomID?: string;
}

export enum settingMode {
  STANDARD_MODE = 0,
  JOIN_MEETING_MODE = 1,
  INDIVIDUAL_MODE = 2,
}

export interface SettingModularity {
  room?: boolean;
  tabs?: boolean;
  userSettings?: boolean;
  videoSettings?: boolean;
  audioSettings?: AudioSettings;
}

export interface AudioSettings {
  display?: boolean;
  displayAGC?: boolean;
}
