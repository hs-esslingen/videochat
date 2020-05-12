import { Component, OnInit, Input } from '@angular/core';
import { ChatService, Chat, ChatObservable } from "src/app/helper/chat.service";

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {
  @Input() childData: Chat;

  constructor() { }

  ngOnInit(): void {
  }

  sendMessage(): void {
    
  }

}
