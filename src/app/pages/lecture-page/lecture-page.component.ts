import { Component, OnInit } from '@angular/core';
import { User, Chat } from 'src/app/helper/media.service';
import { elementEventFullName } from '@angular/compiler/src/view_compiler/view_compiler';

@Component({
  selector: 'app-lecture-page',
  templateUrl: './lecture-page.component.html',
  styleUrls: ['./lecture-page.component.scss']
})
export class LecturePageComponent implements OnInit {
  sidebarDetail = undefined;
  detailType = undefined;

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

  publicChat: Chat = {id: "1", partner: "Public Chat", messages: [], newMessage: false}

  chats: Chat[] = [
    {id: "2", partner: "Leon", messages: [], newMessage: true},
    {id: "3", partner: "Andy", messages: [], newMessage: false},
  ]

  constructor() { }

  ngOnInit(): void {
    //this.chats.push({id: "1", partner: "Public Chat", messages: [], newMessage: false})
  }

  toggleSidebar(element): void {
    //Most of this function is still missing (like polling)
    if (this.detailType == "chat") {
      if (this.sidebarDetail.id == element.id) {
        this.sidebarDetail = undefined;
        this.detailType = undefined;
      }
      else {
        this.sidebarDetail = element;
      }
    }
    else {
      this.sidebarDetail = element;
      this.detailType = "chat";
    }
  }

  raiseHand(): void {
    console.log("You've raised your Hand");
  }
  thumbsUp(): void {
    console.log("You've voted up!");
  }
  thumbsDown(): void {
    console.log("You've voted down!");
  }
  userInteraction(): void {

  }
  openSettings(): void {
    console.log("You've opened the settings!");
  }
  leaveChat(): void {
    console.log("You've left the lecture!");
  }

}
