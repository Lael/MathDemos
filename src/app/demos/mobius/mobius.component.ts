import {AfterViewInit, Component} from '@angular/core';
import {HyperbolicModel} from "../../../math/hyperbolic/hyperbolic";

export interface Settings {
    resolution: number;
    model: HyperbolicModel;
}

export const DEFAULT_SETTINGS: Settings = {
    resolution: 5,
    model: HyperbolicModel.POINCARE,
}

@Component({
    selector: 'mobius',
    templateUrl: './mobius.component.html',
    styleUrls: ['./mobius.component.sass', '../demo.sass']
})
export class MobiusComponent implements AfterViewInit {
    settingsOpen = false;

    settings: Settings = DEFAULT_SETTINGS;

    constructor() {
    }

    ngAfterViewInit(): void {
    }

    openSettings(): void {
        this.settingsOpen = true;
    }

    closeSettings(): void {
        this.settingsOpen = false;
    }

    updateSettings(): void {
        this.settings = {...this.settings};
    }
}
