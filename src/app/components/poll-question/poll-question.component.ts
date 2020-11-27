import {Component, Input, OnInit} from '@angular/core';
import {Question} from 'src/app/model/poll';

@Component({
  selector: 'app-poll-question',
  templateUrl: './poll-question.component.html',
  styleUrls: ['./poll-question.component.scss'],
})
export class PollQuestionComponent implements OnInit {
  @Input() question!: Question;
  @Input() editMode = true;
  constructor() {}

  ngOnInit(): void {}
}
