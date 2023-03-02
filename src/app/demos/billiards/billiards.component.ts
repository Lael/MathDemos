import {AfterViewInit, Component} from '@angular/core';
import {
    BilliardsSettings,
    DEFAULT_BILLIARDS_SETTINGS,
    Duality,
    Flavor,
    Plane,
    TableShape
} from 'src/math/billiards/billiards';


@Component({
    selector: 'billiards',
    templateUrl: './billiards.component.html',
    styleUrls: ['./billiards.component.sass', '../demo.sass']
})
export class BilliardsComponent implements AfterViewInit {
    settingsOpen = false;

    Flavor = Flavor;
    Duality = Duality;
    Plane = Plane;
    TableShape = TableShape;

    settings: BilliardsSettings = DEFAULT_BILLIARDS_SETTINGS;

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

    cycleFlavor(): void {
        this.settings.flavor = this.settings.flavor === Flavor.REGULAR ? Flavor.SYMPLECTIC : Flavor.REGULAR;
        this.updateSettings();
    }

    cycleDuality(): void {
        this.settings.duality = this.settings.duality === Duality.INNER ? Duality.OUTER : Duality.INNER;
        this.updateSettings();
    }

    cyclePlane(): void {
        this.settings.plane = this.settings.plane === Plane.AFFINE ? Plane.HYPERBOLIC : Plane.AFFINE;
        if (this.settings.plane === Plane.HYPERBOLIC) {
            this.settings.tableShape = TableShape.POLYGON;
        }
        this.updateSettings();
    }

    cycleTableShape(): void {
        switch (this.settings.tableShape) {
            case TableShape.POLYGON:
                this.settings.tableShape = TableShape.ELLIPSE;
                break;
            case TableShape.ELLIPSE:
                this.settings.tableShape = TableShape.STADIUM;
                break;
            case TableShape.STADIUM:
                this.settings.tableShape = TableShape.POLYGON;
                break;
            default:
                throw Error('Unfamiliar table shape');
        }
        this.updateSettings();
    }

    updateSettings() {
        this.settings = {...this.settings};
    }
}
