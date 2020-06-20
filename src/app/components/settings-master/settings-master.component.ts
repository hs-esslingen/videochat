import {Component, OnInit, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

@Component({
  selector: 'app-settings-master',
  templateUrl: './settings-master.component.html',
  styleUrls: ['./settings-master.component.scss'],
})
export class SettingsMasterComponent implements OnInit {
  constructor(public dialogRef: MatDialogRef<SettingsMasterComponent>, @Inject(MAT_DIALOG_DATA) public data: SettingsMasterComponentData) {}

  ngOnInit(): void {}

  close(): void {
    this.dialogRef.close(this.data);
  }
}

export interface SettingsMasterComponentData {
  dummyData: string;
  // Add data needed within the settings
}
