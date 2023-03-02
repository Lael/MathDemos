import {AfterViewInit, Component} from '@angular/core';


@Component({
    selector: 'pentagram',
    templateUrl: './pentagram.component.html',
    styleUrls: ['./pentagram.component.sass', '../demo.sass']
})
export class PentagramComponent implements AfterViewInit {
    settingsOpen = false;

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
}
