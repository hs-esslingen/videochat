import {Component, OnInit, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'app-change-nickname',
  templateUrl: './change-nickname.component.html',
  styleUrls: ['./change-nickname.component.scss'],
})
export class ChangeNicknameComponent implements OnInit {
  constructor(public dialogRef: MatDialogRef<ChangeNicknameComponent>, @Inject(MAT_DIALOG_DATA) public data: ChangeNicknameDialogData) {}

  ngOnInit(): void {}

  close(): void {
    this.dialogRef.close(this.data.nickname);
  }
}

export interface ChangeNicknameDialogData {
  nickname: string;
}
