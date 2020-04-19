import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-overview-page',
  templateUrl: './overview-page.component.html',
  styleUrls: ['./overview-page.component.scss']
})
export class OverviewPageComponent implements OnInit {
  roomId: string;
  constructor(readonly router: Router) { }

  ngOnInit(): void {
  }

  gotoRoom() {
    if (this.roomId !== "" && !this.roomId.includes("/")) {
      this.router.navigate([this.roomId])
    
    }
  }
}
