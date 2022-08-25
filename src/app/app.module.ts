import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BilliardsDemoComponent } from './demos/hyperbolic-outer-billiards/billiards-demo.component';
import { HomePageComponent } from './home-page/home-page.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {MatButtonModule} from "@angular/material/button";
import {MatRadioModule} from "@angular/material/radio";
import {FormsModule} from "@angular/forms";
import {MatSliderModule} from "@angular/material/slider";
import { PointPickerComponent } from './demos/hyperbolic-outer-billiards/point-picker/point-picker.component';
import { BilliardsViewComponent } from './demos/hyperbolic-outer-billiards/billiards-view/billiards-view.component';
import { HobSettingsComponent } from './demos/hyperbolic-outer-billiards/hob-settings/hob-settings.component';
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatCheckboxModule} from "@angular/material/checkbox";

@NgModule({
  declarations: [
    AppComponent,
    BilliardsDemoComponent,
    HomePageComponent,
    PointPickerComponent,
    BilliardsViewComponent,
    HobSettingsComponent
  ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        MatButtonModule,
        MatRadioModule,
        FormsModule,
        MatSliderModule,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
    ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
