import {Component, OnInit, OnDestroy} from '@angular/core';
import {MediaService} from '../../helper/media.service';
import {MatDialog} from '@angular/material/dialog';
import {CurrentUser} from 'src/app/model/user';
import {RoomService} from 'src/app/helper/room.service';
import {Subscription} from 'rxjs';
import {SettingsMasterComponent, settingMode} from '../settings-master/settings-master.component';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
})
export class ToolbarComponent implements OnInit, OnDestroy {
  currentUser: CurrentUser;
  subscription?: Subscription;

  constructor(readonly mediaService: MediaService, private dialog: MatDialog, private room: RoomService) {
    this.currentUser = room.getRoomInfo().currentUser;
  }

  ngOnInit(): void {
    this.subscription = this.room.subscribe(data => {
      this.currentUser = data.currentUser;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  openNicknameDialog(): void {
    const dialogRef = this.dialog.open(SettingsMasterComponent, {
      width: 'auto',
      data: {
        mode: settingMode.INDIVIDUAL_MODE,
        modules: {
          tabs: false,
          userSettings: true,
          videoSettings: false,
          audioSettings: false,
        },
        mediaService: this.mediaService,
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      console.log(result);
      //if (result != null || '') this.mediaService.setNickname(result);
    });
  }
}
