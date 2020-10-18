import {Component, OnInit} from '@angular/core';
import {university} from 'src/environments/university';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent implements OnInit {
  university = university.abbreviated;
  constructor() {}

  ngOnInit(): void {}
}
