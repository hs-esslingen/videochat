import {Input, OnChanges, SimpleChanges} from '@angular/core';
import {Component, OnInit} from '@angular/core';
import {PollService} from 'src/app/helper/poll.service';
import {Poll, QuestionType} from 'src/app/model/poll';
import {CurrentUser} from 'src/app/model/user';

@Component({
  selector: 'app-poll',
  templateUrl: './poll.component.html',
  styleUrls: ['./poll.component.scss'],
})
export class PollComponent implements OnInit, OnChanges {
  @Input() childData!: string;
  poll!: Poll;
  @Input() currentUser?: CurrentUser;

  questionsTypes!: string[];

  constructor(private pollService: PollService) {}

  ngOnInit(): void {
    this.poll = this.pollService.getPoll(this.childData);
    this.questionsTypes = Object.values(QuestionType);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.childData) {
      this.poll = this.pollService.getPoll(this.childData);
    }
  }

  addElement() {
    this.pollService.addElement(this.poll.id);
  }
}
