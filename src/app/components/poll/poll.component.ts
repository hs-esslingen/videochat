import {Input} from '@angular/core';
import {Component, OnInit} from '@angular/core';
import {Poll, QuestionType} from 'src/app/model/poll';
import {CurrentUser} from 'src/app/model/user';

@Component({
  selector: 'app-poll',
  templateUrl: './poll.component.html',
  styleUrls: ['./poll.component.scss'],
})
export class PollComponent implements OnInit {
  @Input() childData!: Poll;
  @Input() currentUser?: CurrentUser;

  questionsTypes!: string[];

  constructor() {}

  ngOnInit(): void {
    this.questionsTypes = Object.values(QuestionType);
  }
}
