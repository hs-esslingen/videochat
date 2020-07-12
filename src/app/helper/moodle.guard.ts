/* eslint-disable no-async-promise-executor */
import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, RouterStateSnapshot, Router, Resolve} from '@angular/router';
import {MoodleService} from './moodle.service';
import {MatDialog} from '@angular/material/dialog';
import {ApiService} from './api.service';
import {MoodlePopupComponent} from '../components/moodle-popup/moodle-popup.component';
import {MoodleErrorPopupComponent} from '../components/moodle-error-popup/moodle-error-popup.component';
import {MatSnackBar} from '@angular/material/snack-bar';

export interface MoodleInfo {
  roomName: string;
  token: string;
}

@Injectable({
  providedIn: 'root',
})
export class MoodleGuard implements Resolve<MoodleInfo> {
  moodleCourses!: {
    fullname: string;
    id: number;
    visible: number;
    shortname: string;
  }[];
  moodleIsLoggedIn = false;
  constructor(private moodle: MoodleService, private dialog: MatDialog, readonly api: ApiService, readonly router: Router, private _snackBar: MatSnackBar) {}
  resolve(next: ActivatedRouteSnapshot): Promise<MoodleInfo> {
    return new Promise(async (res, rej) => {
      // get moodle room id
      const snackBarRef = this._snackBar.open('Connecting to moodle', undefined, {});

      const moodleRoomId = next.paramMap.get('roomId');
      const token = window.localStorage.getItem('moodleToken');
      if (moodleRoomId == null || Number.isNaN(parseInt(moodleRoomId))) {
        rej();
        this.router.navigate(['/']);
        return;
      } else {
        // check api service if is allowed in room
        try {
          const data = await this.api.checkMoodleEnrolment(moodleRoomId, token);

          if (data.token != null) {
            // if yes return jwt token and continue
            snackBarRef.dismiss();
            res(data);
            return;
          }
        } catch (e) {
          console.log(e);
          //TODO: if not display error

          if (e.status === 403) {
            await this.openMoodleErrorDialog(moodleRoomId);
            snackBarRef.dismiss();
            rej();
          }

          if (e.status === 400 && e.error === 'missingToken') {
            const dialogRef = this.dialog.open(MoodlePopupComponent, {
              width: '500px',
            });

            dialogRef.afterClosed().subscribe(async (result: boolean) => {
              try {
                // after moodle login is finished try check api again
                if (result) {
                  const token = window.localStorage.getItem('moodleToken');
                  const data = await this.api.checkMoodleEnrolment(moodleRoomId, token);
                  snackBarRef.dismiss();
                  res(data);
                } else {
                  // return to overview page
                  this.router.navigate(['/']);
                  snackBarRef.dismiss();
                  rej();
                  return;
                }
              } catch (e) {
                if (e.status === 403) {
                  await this.openMoodleErrorDialog(moodleRoomId);
                  snackBarRef.dismiss();
                  rej();
                } else {
                  this.router.navigate(['/']);
                  snackBarRef.dismiss();
                  rej();
                }
              }
            });
          }
        }
      }
    });
  }

  async openMoodleErrorDialog(moodleRoomId: string) {
    return new Promise(res => {
      const dialogRef = this.dialog.open(MoodleErrorPopupComponent, {
        width: '500px',
        data: {courseId: moodleRoomId},
      });
      dialogRef.afterClosed().subscribe(async () => {
        res();
        this.router.navigate(['/']);
      });
    });
  }
}
