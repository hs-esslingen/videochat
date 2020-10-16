import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Location} from '@angular/common';
import {university} from '../../../environments/university';

@Component({
  selector: 'app-thank-you-page',
  templateUrl: './thank-you-page.component.html',
  styleUrls: ['./thank-you-page.component.scss'],
})
export class ThankYouPageComponent implements OnInit {
  roomId!: string;
  universityFull = university.full;

  constructor(private route: ActivatedRoute, private router: Router, private location: Location) {}

  ngOnInit(): void {}

  backtoroom() {
    this.location.back();
  }
}
