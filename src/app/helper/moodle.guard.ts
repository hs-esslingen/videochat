import {Injectable} from '@angular/core';
import {CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree} from '@angular/router';
import {Observable} from 'rxjs';
import {MoodleService} from './moodle.service';
import {MatDialog} from '@angular/material/dialog';
import {ApiService} from './api.service';
import {AllowUriComponent} from '../pages/overview-page/overview-page.component';

@Injectable({
  providedIn: 'root',
})
export class MoodleGuard implements CanActivate {
  moodleCourses!: {
    fullname: string;
    id: number;
    visible: number;
    shortname: string;
  }[];
  moodleIsLoggedIn = false;
  constructor(private moodle: MoodleService, private dialog: MatDialog, readonly api: ApiService) {}
  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return new Promise((res, rej) => {
      this.moodle.requestURI();
      const dialogRef = this.dialog.open(AllowUriComponent, {
        width: '400px',
      });
      dialogRef.afterClosed().subscribe(async () => {
        try {
          await this.moodle.automaticMoodleLogin();
          this.moodleIsLoggedIn = true;
          const token = window.localStorage.getItem('moodleToken');
          this.moodleCourses = await this.api.getMoodleCourses(token as string);
          res(true);
        } catch (error) {
          res(false);
        }
      });
    });
  }
}
