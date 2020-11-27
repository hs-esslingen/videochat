import {Component, OnInit, Input, ViewChild, ElementRef, Output, EventEmitter, OnChanges, AfterViewInit} from '@angular/core';
import {ChatService} from '../../helper/chat.service';
import {User, CurrentUser} from 'src/app/model/user';
import {Chat} from 'src/app/model/chat';
import {SimpleChanges} from '@angular/core';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() childData!: string;
  @Input() currentUser?: CurrentUser;
  @Input() users: {[id: string]: User} = {};

  chat!: Chat;
  newMessage?: string;
  sendOnEnter!: boolean;
  sendButtonTooltip!: string;

  @Output() closeChatEvent = new EventEmitter<{element: string; type: 'chat'}>();

  @ViewChild('input') input!: ElementRef<HTMLTextAreaElement>;

  handleKeyDown(event: KeyboardEvent) {
    if (this.sendOnEnter) {
      if (event.key === 'Enter' && !event.shiftKey) {
        this.sendMessage();
        event.preventDefault();
      }
    } else {
      if (event.key === 'Enter' && event.shiftKey) {
        this.sendMessage();
        event.preventDefault();
      }
    }
  }

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    this.chat = this.chatService.getChat(this.childData);
    localStorage.getItem('sendOnEnter') === 'true' ? (this.sendOnEnter = true) : (this.sendOnEnter = false);
    if (this.sendOnEnter) this.sendButtonTooltip = 'Send (Enter)';
    else this.sendButtonTooltip = 'Send (Shift + Enter)';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.childData) {
      console.log('change');
      this.chat = this.chatService.getChat(this.childData);
    }
  }

  ngAfterViewInit(): void {
    this.input.nativeElement.focus();
  }

  deleteChat(): void {
    this.closeChatEvent.emit({element: this.childData, type: 'chat'});
    this.chatService.hideChat(this.chat);
  }

  sendMessage(): void {
    if (this.newMessage && this.newMessage.trim() !== '') {
      this.chatService.sendMessage(this.newMessage, this.chat.id !== 'public_chat' ? this.chat.id : undefined);
      this.newMessage = '';
    }
    // console.log('Message sent!');
  }
}
