import {BrowserModule} from '@angular/platform-browser';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {NgModule, Inject, PLATFORM_ID, APP_ID} from '@angular/core';
import {MatCheckboxModule} from '@angular/material/checkbox';

import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatMenuModule} from '@angular/material/menu';
import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {HttpClientModule} from '@angular/common/http';
import {LoginPageComponent} from './pages/login-page/login-page.component';
import {HeaderComponent} from './components/header/header.component';
import {ThankYouPageComponent} from './pages/thank-you-page/thank-you-page.component';
import {MatDialogModule} from '@angular/material/dialog';
import {OverviewPageComponent, AllowUriComponent} from './pages/overview-page/overview-page.component';
import {PrivacyPolicyComponent} from './pages/privacy-policy/privacy-policy.component';
import {FooterComponent} from './components/footer/footer.component';
import {ContactsPageComponent} from './pages/contacts-page/contacts-page.component';
import {ImprintPageComponent} from './pages/imprint-page/imprint-page.component';
import {JoinMeetingPopupComponent} from './components/join-meeting-popup/join-meeting-popup.component';
import {LecturePageComponent} from './pages/lecture-page/lecture-page.component';
import {MatSelectModule} from '@angular/material/select';
import {ChatComponent} from './components/chat/chat.component';
import {ToolbarComponent} from './components/toolbar/toolbar.component';
import {VideoComponent} from './components/video/video.component';
import {AudioComponent} from './components/audio/audio.component';
import {MasterSidebarComponent} from './components/master-sidebar/master-sidebar.component';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {ChangeNicknameComponent} from './components/change-nickname/change-nickname.component';
import {PollComponent} from './components/poll/poll.component';
import {SettingsMasterComponent} from './components/settings-master/settings-master.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginPageComponent,
    HeaderComponent,
    ThankYouPageComponent,
    OverviewPageComponent,
    PrivacyPolicyComponent,
    FooterComponent,
    ContactsPageComponent,
    ImprintPageComponent,
    JoinMeetingPopupComponent,
    AllowUriComponent,
    LecturePageComponent,
    ChatComponent,
    ToolbarComponent,
    VideoComponent,
    AudioComponent,
    MasterSidebarComponent,
    ChangeNicknameComponent,
    PollComponent,
    SettingsMasterComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    MatMenuModule,
    BrowserAnimationsModule,
    MatCheckboxModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatButtonToggleModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(@Inject(PLATFORM_ID) private platformId: object, @Inject(APP_ID) private appId: string) {}
}
