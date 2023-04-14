import {Component, OnDestroy} from "@angular/core";
import * as dat from "dat.gui";

type Params = {
    // unfolding
    iterations: number;
};

@Component({
    selector: 'billiards-unfolding',
    templateUrl: 'billiards-unfolding.component.html',
    styleUrls: ['billiards-unfolding.component.sass']
})
export class BilliardsUnfoldingComponent implements OnDestroy {
    gui = new dat.GUI();

    params: Params = {
        iterations: 50
    };

    constructor() {
        this.updateGUI();
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new dat.GUI();

        const pickFolder = this.gui.addFolder('Polygon Picker');

        const unfoldFolder = this.gui.addFolder('Unfolding');
        unfoldFolder.add(this.params, 'iterations')
            .name('Iterations').min(10).max(1000).step(10);
        const graphFolder = this.gui.addFolder('Graphs');
    }

    ngOnDestroy() {
        this.gui.destroy();
    }
}