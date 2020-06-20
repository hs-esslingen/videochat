import {Component, OnInit, Input} from '@angular/core';
import {MicrophoneState, CameraState, ScreenshareState, MediaService} from '../../helper/media.service';
import {MatDialog} from '@angular/material/dialog';
import {DebugDialogComponent} from '../../pages/meeting-page/meeting-page.component';
import {ChangeNicknameComponent} from '../change-nickname/change-nickname.component';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
})
export class ToolbarComponent implements OnInit {
  @Input() microphoneState: MicrophoneState = MicrophoneState.ENABLED;
  @Input() cameraState: CameraState = CameraState.DISABLED;
  @Input() screenshareState: ScreenshareState = ScreenshareState.DISABLED;

  constructor(readonly mediaService: MediaService, private dialog: MatDialog) {}

  ngOnInit(): void {}

  openNicknameDialog(): void {
    const dialogRef = this.dialog.open(ChangeNicknameComponent, {
      width: '300px',
      data: {nickname: this.mediaService.nickname},
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      console.log(result);
      if (result != null || '') this.mediaService.setNickname(result);
    });
  }
  async openDebugDialog() {
    if (this.mediaService.LocalVideoProducer) {
      const dialogRef = this.dialog.open(DebugDialogComponent, {
        width: '1200px',
        data: await this.mediaService.LocalVideoProducer.getStats(),
      });

      dialogRef.afterClosed().subscribe(() => {
        console.log('The dialog was closed');
      });
    }
  }
}
