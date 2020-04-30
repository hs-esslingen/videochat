import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-lecture-page',
  templateUrl: './lecture-page.component.html',
  styleUrls: ['./lecture-page.component.scss']
})
export class LecturePageComponent implements OnInit {
  sidebarDetail = undefined;

  constructor() { }



  toggleChat(): void {
    if (this.sidebarDetail == "public_chat") {
      this.sidebarDetail = undefined;
    }
    else {
      this.sidebarDetail = "public_chat"
    }
  }

  raiseHand(): void {
    console.log("Raised you Hand");
  }

  ngOnInit(): void {
  }

}
