import { Component, OnInit, Input } from '@angular/core';
import { User } from 'src/app/helper/media.service';
import { ChatService, Chat, ChatObservable } from "src/app/helper/chat.service";


@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {
  @Input() childData: Chat;
  @Input() user: User;

  constructor() { }

  ngOnInit(): void {
  }

  sendMessage(): void {
    console.log("Message sent!");
  }

}
