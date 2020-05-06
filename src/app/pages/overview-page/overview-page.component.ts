import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MoodleService } from 'src/app/helper/moodle.service';

@Component({
  selector: 'app-overview-page',
  templateUrl: './overview-page.component.html',
  styleUrls: ['./overview-page.component.scss']
})
export class OverviewPageComponent implements OnInit {
  roomId: string;
  constructor(readonly router: Router, private moodle: MoodleService) { }

  ngOnInit(): void {
    if (!window.localStorage.getItem("moodleToken")) {
      this.moodle.requestURI();
      this.moodle.moodleLogin();
    }
  }

  gotoRoom() {
    if (this.roomId !== "" && !this.roomId.includes("/")) {
      this.router.navigate([this.roomId])

    }
  }

}
