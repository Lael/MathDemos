import {AfterViewInit, Component} from '@angular/core';

export interface Settings {
    resolution: number,
    smallStep: number,
    largeStep: number,
    offset: number,
}

@Component({
    selector: 'envelopes',
    templateUrl: './envelope.component.html',
    styleUrls: ['./envelope.component.sass', '../demo.sass']
})
export class EnvelopeComponent implements AfterViewInit {
    settingsOpen = false;

    settings: Settings = {
        resolution: 0,
        smallStep: 2,
        largeStep: 5,
        offset: 0,
    };

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
