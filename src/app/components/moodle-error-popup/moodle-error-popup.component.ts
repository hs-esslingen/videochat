import {Component, OnInit, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

export interface MoodleErrorPopupData {
  courseId: string;
}

@Component({
  selector: 'app-moodle-error-popup',
  templateUrl: './moodle-error-popup.component.html',
  styleUrls: ['./moodle-error-popup.component.scss'],
})
export class MoodleErrorPopupComponent implements OnInit {
  constructor(public dialogRef: MatDialogRef<MoodleErrorPopupComponent>, @Inject(MAT_DIALOG_DATA) public data: MoodleErrorPopupData) {
    dialogRef.disableClose = true;
  }

  ngOnInit(): void {}
}
