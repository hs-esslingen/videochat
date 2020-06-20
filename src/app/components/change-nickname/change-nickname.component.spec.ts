import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {ChangeNicknameComponent} from './change-nickname.component';

describe('ChangeNicknameComponent', () => {
  let component: ChangeNicknameComponent;
  let fixture: ComponentFixture<ChangeNicknameComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ChangeNicknameComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChangeNicknameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
