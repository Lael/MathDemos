import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {HomePageComponent} from './home-page/home-page.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatButtonModule} from "@angular/material/button";
import {MatRadioModule} from "@angular/material/radio";
import {FormsModule} from "@angular/forms";
import {MatSliderModule} from "@angular/material/slider";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {FunctionViewComponent} from './demos/functions/function-view/function-view.component';
import {FunctionsDemoComponent} from './demos/functions/functions-demo/functions-demo.component';
import {SurfacesDemoComponent} from "./demos/surfaces/surfaces-demo.component";
import {WindowPaneComponent} from "./widgets/window-pane/window-pane.component";
import {MatTabsModule} from "@angular/material/tabs";
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
import {TilingComponent} from "./demos/tiling/tiling.component";
import {PoincareComponent} from "./demos/poincare/poincare.component";

@NgModule({
    declarations: [
        AppComponent,
        HomePageComponent,
        FunctionsDemoComponent,
        FunctionViewComponent,
        SurfacesDemoComponent,
        WindowPaneComponent,
        EnvelopeViewComponent,
        EnvelopeComponent,
        PentagramComponent,
        PentagramViewComponent,
        MobiusComponent,
        MobiusViewComponent,
        LinkTileComponent,
        NewBilliardsComponent,
        TilingComponent,
        PoincareComponent,
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
