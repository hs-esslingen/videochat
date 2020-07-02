import {Component, OnInit, Input} from '@angular/core';
import {ChatService} from '../../helper/chat.service';
import {User, CurrentUser} from 'src/app/model/user';
import {Chat} from 'src/app/model/chat';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit {
  @Input() childData!: Chat;
  @Input() user?: CurrentUser;
  @Input() users?: {[id: string]: User};
  newMessage?: string;

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {}

  sendMessage(): void {
    if (this.newMessage && this.newMessage.trim() !== '') {
      this.chatService.sendMessage(this.newMessage, this.childData.id !== 'public_chat' ? this.childData.id : undefined);
    }
    console.log('Message sent!');
  }
}
