import { Component, OnInit } from '@angular/core';
import { User } from 'src/app/helper/media.service';

@Component({
  selector: 'app-lecture-page',
  templateUrl: './lecture-page.component.html',
  styleUrls: ['./lecture-page.component.scss']
})
export class LecturePageComponent implements OnInit {
  sidebarDetail = undefined;
  
  you: User = {id: "666", nickname: "Der King", producers:{}};

  users: User[] = [
    { id: "1", nickname: "Leon", producers:{}, isTalking: true, isSignaling: true},
    { id: "2", nickname: "Bartholomäus Rößler", producers:{}, isSignaling: false},
    { id: "2", nickname: "Andreas Rößler", producers:{}, votedUp: true},
    { id: "2", nickname: "Andreas Rößler", producers:{}, votedDown: true},
    { id: "2", nickname: "Andreas Rößler", producers:{}, votedUp: true, isMuted: true},
    { id: "2", nickname: "Andreas Rößler", producers:{}, votedUp: true, isMuted: true},
    { id: "2", nickname: "Andreas Rößler", producers:{}, votedDown: true, isMuted: true},
    { id: "2", nickname: "Andreas Rößler", producers:{}, votedUp: true, isMuted: true},
    { id: "2", nickname: "Andreas Rößler", producers:{}, votedUp: true, isMuted: true},
    { id: "2", nickname: "Andreas Rößler", producers:{}, votedUp: true, isMuted: true},
    { id: "2", nickname: "Andreas Rößler", producers:{}, isSignaling: true, isMuted: true},
    { id: "2", nickname: "Andreas Rößler", producers:{}, votedUp: true, isMuted: true},
    { id: "2", nickname: "Andreas Rößler", producers:{}, isMuted: true},
    { id: "2", nickname: "Andreas Rößler", producers:{}, isMuted: true},
    { id: "2", nickname: "Andreas Rößler", producers:{}, isMuted: true},
    { id: "2", nickname: "Andreas Rößler", producers:{}, isMuted: true},
    { id: "2", nickname: "Andreas Rößler", producers:{}, isMuted: true},
    { id: "2", nickname: "Andreas Rößler", producers:{}, isMuted: true},
    { id: "2", nickname: "Andreas Rößler", producers:{}, isMuted: true},
    { id: "2", nickname: "Andreas Rößler", producers:{}},
    { id: "2", nickname: "Andreas Rößler", producers:{}, votedDown: true},
    { id: "2", nickname: "Andreas Rößler", producers:{}, votedUp: true},
  ];

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
  thumbsUp(): void {
    console.log("You have voted up!");
  }
  thumbsDown(): void {
    console.log("You have voted down!");
  }
  userInteraction(): void {

  }

  ngOnInit(): void {
  }

}
