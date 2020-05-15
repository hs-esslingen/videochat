import { Component, OnInit, Input } from '@angular/core';
import { User } from '../../helper/media.service';
import { ChatService, Chat, ChatObservable } from "../../helper/chat.service";


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
