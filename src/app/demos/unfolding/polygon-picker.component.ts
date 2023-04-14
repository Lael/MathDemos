import {Component} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";

@Component({
    selector: 'polygon-picker',
    template: ''
})
export class PolygonPickerComponent extends ThreeDemoComponent {

    constructor() {
        super();
    }

    override frame(dt: number) {
    }
}