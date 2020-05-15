import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterSidebarComponent } from './master-sidebar.component';

describe('MasterComponent', () => {
  let component: MasterSidebarComponent;
  let fixture: ComponentFixture<MasterSidebarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MasterSidebarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MasterSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
