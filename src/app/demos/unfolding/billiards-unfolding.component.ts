import {Component, OnDestroy} from "@angular/core";
import * as dat from "dat.gui";
import {Chart} from 'chart.js/auto';
import {Vector2} from "three";
import {ChartConfiguration} from "chart.js";

type Params = {
    // unfolding
    iterations: number;
};

export type UnfoldingData = {
    step: number,
    aSides: number,
    bSides: number,
    distinctAngles: number,
};

@Component({
    selector: 'billiards-unfolding',
    templateUrl: 'billiards-unfolding.component.html',
    styleUrls: ['billiards-unfolding.component.sass']
})
export class BilliardsUnfoldingComponent implements OnDestroy {
    gui = new dat.GUI();

    params: Params = {
        iterations: 100
    };

    vertices: Vector2[] = [];
    chart?: Chart;

    constructor() {
        this.updateGUI();
    }

    onNewVertices(vertices: Vector2[]) {
        this.vertices = vertices;
    }

    onNewResults(results: UnfoldingData[]) {
        const canvas = document.getElementById('chart');
        if (!canvas) {
            console.error('Missing canvas element');
            return;
        }

        const config: ChartConfiguration = {
            type: 'line',
            data: {
                labels: results.map(row => row.step),
                datasets: [
                    // {
                    //     label: 'A',
                    //     data: results.map(row => row.aSides)
                    // },
                    // {
                    //     label: 'B',
                    //     data: results.map(row => row.bSides)
                    // },
                    // {
                    //     label: 'A + B',
                    //     data: results.map(row => row.aSides + row.bSides)
                    // },
                    {
                        label: 'Distinct Angles',
                        data: results.map(row => row.distinctAngles)
                    },
                ]
            }
        };

        if (!this.chart) {
            this.chart = new Chart((canvas as HTMLCanvasElement), config);
        } else {
            this.chart.config.data = config.data;
            this.chart.update();
        }


    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new dat.GUI();

        const pickFolder = this.gui.addFolder('Polygon Picker');

        const unfoldFolder = this.gui.addFolder('Unfolding');
        unfoldFolder.add(this.params, 'iterations')
            .name('Iterations').min(10).max(10000).step(10);
        const graphFolder = this.gui.addFolder('Graphs');
    }

    ngOnDestroy() {
        this.gui.destroy();
    }

}