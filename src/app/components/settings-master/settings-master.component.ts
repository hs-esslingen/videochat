import {Component, OnInit, Inject, Input} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { MediaService } from 'src/app/helper/media.service';
import { LocalMediaService } from 'src/app/helper/local-media.service';

@Component({
  selector: 'app-settings-master',
  templateUrl: './settings-master.component.html',
  styleUrls: ['./settings-master.component.scss'],
})
export class SettingsMasterComponent implements OnInit {
  settingPage: settingPages = settingPages.USER_SETTINGS;

  constructor(
    public dialogRef: MatDialogRef<SettingsMasterComponent>,
    @Inject(MAT_DIALOG_DATA)
      public data: SettingsMasterComponentData,
      private localMedia: LocalMediaService,            // Weitergeben
    ) {
      //dialogRef.disableClose = true;                  //Enable when close buttons are implemented
    }

  ngOnInit(): void {}

  close(): void {
    this.dialogRef.close(this.data);
  }
}

export interface SettingsMasterComponentData {
  autoGainControl: boolean;
  mediaService: MediaService;
}

export enum settingPages {
  USER_SETTINGS = 0,
  VIDEO_SETTINGS = 1,
  AUDIO_SETTINGS = 2,
}
