import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {provideRoutes} from "@angular/router";

import {AppRoutingModule, routes} from './app-routing.module';
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
import {BilliardsComponent} from "./demos/billiards/billiards.component";
import {TilingComponent} from "./demos/tiling/tiling.component";
import {PoincareComponent} from "./demos/poincare/poincare.component";
import {SymplecticComponent} from "./demos/symplectic/symplectic.component";
import {BilliardsUnfoldingComponent} from "./demos/unfolding/billiards-unfolding.component";
import {UnfoldingComponent} from "./demos/unfolding/unfolding.component";
import {PolygonPickerComponent} from "./widgets/polygon-picker.component";
import {Unfolding3DComponent} from "./demos/unfolding-3d/unfolding-3d.component";
import {Unfolder3DComponent} from "./demos/unfolding-3d/unfolder-3d.component";
import {VectorPickerComponent} from "./widgets/vector-picker.component";
import {TileBilliardsComponent} from "./demos/tile-billiards/tile-billiards.component";
import {PhasePictureComponent} from "./demos/corridors/phase-picture.component";
import {CorridorUnfolderComponent} from "./demos/corridors/corridor-unfolder.component";
import {CorridorsComponent} from "./demos/corridors/corridors.component";
import {ScalingBilliardsComponent} from "./demos/scaling-billiards/scaling-billiards.component";
import {HyperbolicGeometryComponent} from "./demos/hyperbolic-geometry/hyperbolic-geometry.component";
import {TicktockComponent} from "./demos/ticktock/ticktock.component";
import {TriangleMapComponent} from "./demos/triangle-map/triangle-map.component";
import {SymmetricComponent} from "./demos/symmetry/symmetric.component";
import {PhaseComponent} from "./demos/phase/phase.component";
import {CrossingComponent} from "./demos/crossing/crossing.component";
import {PolygonMapComponent} from "./demos/symplectic-table/symplectic-table.component";
import {Regge2Component} from "./demos/regge/regge2.component";
import {Regge3Component} from "./demos/regge/regge3.component";

@NgModule({
    bootstrap: [AppComponent],
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
        BilliardsComponent,
        TilingComponent,
        PoincareComponent,
        SymplecticComponent,
        BilliardsUnfoldingComponent,
        UnfoldingComponent,
        PolygonPickerComponent,
        VectorPickerComponent,
        Unfolding3DComponent,
        Unfolder3DComponent,
        TileBilliardsComponent,
        PhasePictureComponent,
        CorridorUnfolderComponent,
        CorridorsComponent,
        ScalingBilliardsComponent,
        HyperbolicGeometryComponent,
        TicktockComponent,
        TriangleMapComponent,
        SymmetricComponent,
        PhaseComponent,
        CrossingComponent,
        PolygonMapComponent,
        Regge2Component,
        Regge3Component,
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
    providers: [provideRoutes(routes)]
})
export class AppModule {
}
