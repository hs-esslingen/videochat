import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MoodleService } from 'src/app/helper/moodle.service';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { ApiService } from 'src/app/helper/api.service';

@Component({
  selector: "app-nickname-dialog",
  templateUrl: "./allow-uri.component.html",
})
export class AllowUriComponent {
  constructor(
    public dialogRef: MatDialogRef<AllowUriComponent>,
  ) {}
}


@Component({
  selector: 'app-overview-page',
  templateUrl: './overview-page.component.html',
  styleUrls: ['./overview-page.component.scss']
})
export class OverviewPageComponent implements OnInit {
  roomId: string;
  moodleIsLoggedIn = false;
  moodleCourses: {
    fullname: string,
    id: number,
    visible: number,
    shortname: string,
  }[];
  displayName: string;
  email: string;



  constructor(readonly router: Router, private moodle: MoodleService, readonly api: ApiService, private dialog: MatDialog) { }

  async ngOnInit() {
    if (window.localStorage.getItem("moodleToken")) {
      this.moodleIsLoggedIn = true;
      const token = window.localStorage.getItem("moodleToken");
      try {
        this.moodleCourses = await this.api.getMoodleCourses(token);
      } catch (error) {
        if (error.error === "invalidtoken") {
          this.moodleIsLoggedIn = false;
          window.localStorage.removeItem("moodleToken");
        }
      }
    }

    this.displayName = window.localStorage.getItem("displayName");
    this.email = window.localStorage.getItem("email").split("@")[0];
  }

  gotoRoom() {
    if (this.roomId !== "" && !this.roomId.includes("/")) {
      this.router.navigate([this.roomId])

    }
  }

  esc(data: string) {
    return data.replace(/[\/\?]/g,"");
  }

  async moodleLogin() {
    this.moodle.requestURI();
    const dialogRef = this.dialog.open(AllowUriComponent, {
      width: "400px",
    });
    dialogRef.afterClosed().subscribe(async () => {
      await this.moodle.moodleLogin();
      this.moodleIsLoggedIn = true;
      const token = window.localStorage.getItem("moodleToken");
      this.moodleCourses = await this.api.getMoodleCourses(token);
    });
  }

}
