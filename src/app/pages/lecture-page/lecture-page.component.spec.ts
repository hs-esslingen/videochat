import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LecturePageComponent } from './lecture-page.component';

describe('LecturePageComponent', () => {
  let component: LecturePageComponent;
  let fixture: ComponentFixture<LecturePageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LecturePageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LecturePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
