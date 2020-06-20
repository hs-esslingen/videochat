import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {SettingsMasterComponent} from './settings-master.component';

describe('SettingsMasterComponent', () => {
  let component: SettingsMasterComponent;
  let fixture: ComponentFixture<SettingsMasterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SettingsMasterComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SettingsMasterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
