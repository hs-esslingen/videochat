import {Component, Input, OnInit} from '@angular/core';
import {PollService} from 'src/app/helper/poll.service';
import {Question} from 'src/app/model/poll';

@Component({
  selector: 'app-poll-question',
  templateUrl: './poll-question.component.html',
  styleUrls: ['./poll-question.component.scss'],
})
export class PollQuestionComponent implements OnInit {
  @Input() question!: Question;
  @Input() pollId!: string;
  @Input() editMode = true;
  newElement = '';

  constructor(private pollService: PollService) {}

  ngOnInit(): void {}

  deleteElement() {
    this.pollService.deleteElement(this.pollId, this.question.id);
  }
}
