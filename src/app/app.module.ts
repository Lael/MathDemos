import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {BilliardsDemoComponent} from './demos/hyperbolic-outer-billiards/billiards-demo.component';
import {HomePageComponent} from './home-page/home-page.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatButtonModule} from "@angular/material/button";
import {MatRadioModule} from "@angular/material/radio";
import {FormsModule} from "@angular/forms";
import {MatSliderModule} from "@angular/material/slider";
import {PointPickerComponent} from './demos/hyperbolic-outer-billiards/point-picker/point-picker.component';
import {BilliardsViewComponent} from './demos/hyperbolic-outer-billiards/billiards-view/billiards-view.component';
import {HobSettingsComponent} from './demos/hyperbolic-outer-billiards/hob-settings/hob-settings.component';
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {FunctionViewComponent} from './demos/functions/function-view/function-view.component';
import {FunctionsDemoComponent} from './demos/functions/functions-demo/functions-demo.component';
import {SurfacesDemoComponent} from "./demos/surfaces/surfaces-demo.component";
import {WindowPaneComponent} from "./widgets/window-pane/window-pane.component";
import {MatTabsModule} from "@angular/material/tabs";
import {BilliardsComponent} from "./demos/billiards/billiards.component";
import {BilliardsViewComponent as NewBilliardsViewComponent} from "./demos/billiards/billiards-view.component";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonToggleModule} from "@angular/material/button-toggle";
import {EnvelopeViewComponent} from "./demos/envelopes/envelope-view.component";
import {EnvelopeComponent} from "./demos/envelopes/envelope.component";
import {PentagramComponent} from "./demos/pentagram/pentagram.component";
import {PentagramViewComponent} from "./demos/pentagram/pentagram-view.component";
import {MobiusComponent} from "./demos/mobius/mobius.component";
import {MobiusViewComponent} from "./demos/mobius/mobius-view.component";
import {LinkTileComponent} from './home-page/link-tile/link-tile.component';
import {NewBilliardsComponent} from "./demos/new-billiards/new-billiards.component";

@NgModule({
    declarations: [
        AppComponent,
        BilliardsDemoComponent,
        HomePageComponent,
        PointPickerComponent,
        BilliardsViewComponent,
        HobSettingsComponent,
        FunctionsDemoComponent,
        FunctionViewComponent,
        SurfacesDemoComponent,
        WindowPaneComponent,
        BilliardsComponent,
        NewBilliardsViewComponent,
        EnvelopeViewComponent,
        EnvelopeComponent,
        PentagramComponent,
        PentagramViewComponent,
        MobiusComponent,
        MobiusViewComponent,
        LinkTileComponent,
        NewBilliardsComponent,
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
        MatTabsModule,
        MatIconModule,
        MatButtonToggleModule,
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}
