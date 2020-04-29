import { BrowserModule } from "@angular/platform-browser";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { NgModule, Inject, PLATFORM_ID, APP_ID } from "@angular/core";
import { MatCheckboxModule } from "@angular/material/checkbox";

import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { MatMenuModule } from "@angular/material/menu";
import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import {
  MeetingPageComponent,
  NicknameDialogComponent,
  DebugDialogComponent,
} from "./pages/meeting-page/meeting-page.component";
import { HttpClientModule } from "@angular/common/http";
import { LoginPageComponent } from "./pages/login-page/login-page.component";
import { HeaderComponent } from "./components/header/header.component";
import { ThankYouPageComponent } from "./pages/thank-you-page/thank-you-page.component";
import { UserComponent } from "./components/user/user.component";
import { MatDialogModule } from "@angular/material/dialog";
import { OverviewPageComponent, AllowUriComponent } from "./pages/overview-page/overview-page.component";
import { PrivacyPolicyComponent } from "./pages/privacy-policy/privacy-policy.component";
import { FooterComponent } from "./components/footer/footer.component";
import { ContactsPageComponent } from "./pages/contacts-page/contacts-page.component";
import { ImprintPageComponent } from "./pages/imprint-page/imprint-page.component";
import { JoinMeetingPopupComponent } from "./components/join-meeting-popup/join-meeting-popup.component";
import { LecturePageComponent } from './pages/lecture-page/lecture-page.component';
import { MatSelectModule } from "@angular/material/select";

@NgModule({
  declarations: [
    AppComponent,
    MeetingPageComponent,
    LoginPageComponent,
    HeaderComponent,
    ThankYouPageComponent,
    UserComponent,
    NicknameDialogComponent,
    DebugDialogComponent,
    OverviewPageComponent,
    PrivacyPolicyComponent,
    FooterComponent,
    ContactsPageComponent,
    ImprintPageComponent,
    JoinMeetingPopupComponent,
    AllowUriComponent,
    LecturePageComponent,
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
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    @Inject(APP_ID) private appId: string
  ) {}
}
