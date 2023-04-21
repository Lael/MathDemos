import {Component, OnDestroy} from "@angular/core";
import * as dat from "dat.gui";
import {Chart} from 'chart.js/auto';
import {Vector2} from "three";
import {ChartConfiguration} from "chart.js";
import {Restriction} from "./polygon-picker.component";

type Params = {
    // unfolding
    iterations: number;
    pickerRestriction: Restriction;
    graphA: boolean;
    graphB: boolean;
    graphAB: boolean;
    graphBirkhoff: boolean;
};

export type UnfoldingData = {
    step: number,
    aSides: number,
    bSides: number,
    birkhoffSum: number,
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
        iterations: 100,
        pickerRestriction: Restriction.CONVEX,
        graphA: true,
        graphB: true,
        graphAB: true,
        graphBirkhoff: true,
    };

    vertices: Vector2[] = [];
    chart?: Chart;
    results: UnfoldingData[] = [];

    constructor() {
        this.updateGUI();
    }

    onNewVertices(vertices: Vector2[]) {
        this.vertices = vertices;
    }

    onNewResults(results: UnfoldingData[]) {
        this.results = results;
        const canvas = document.getElementById('chart');
        if (!canvas) {
            console.error('Missing canvas element');
            return;
        }

        Chart.defaults.color = '#ffffff';
        // Chart.defaults.borderColor = '#36A2EB1';

        const datasets = [];

        switch (this.params.pickerRestriction) {
        case Restriction.CONVEX:
            datasets.push({
                label: 'Distinct Angles',
                data: results.map(row => row.distinctAngles)
            });
            break;
        case Restriction.KITE:
        case Restriction.CENTRAL:
            if (this.params.graphA) datasets.push({
                label: 'A',
                data: results.map(row => row.aSides)
            });
            if (this.params.graphB) datasets.push({
                label: 'B',
                data: results.map(row => row.bSides)
            });
            if (this.params.graphAB) datasets.push({
                label: 'A + B',
                data: results.map(row => row.aSides + row.bSides)
            });
            if (this.params.graphBirkhoff) datasets.push({
                label: 'Birkhoff Sum',
                data: results.map(row => row.birkhoffSum)
            });
            break;

        }

        const config: ChartConfiguration = {
            type: 'line',
            options: {
                animation: {
                    duration: 0
                }
            },
            data: {
                labels: results.map(row => row.step),
                datasets: datasets,
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
        pickFolder.add(this.params, 'pickerRestriction', Object.values(Restriction)).name('Rules');

        const unfoldFolder = this.gui.addFolder('Unfolding');
        unfoldFolder.add(this.params, 'iterations')
            .name('Iterations').min(10).max(100000).step(10);
        const graphFolder = this.gui.addFolder('Graphs');
        graphFolder.add(this.params, 'graphA').name('A').onChange(() => this.onNewResults(this.results));
        graphFolder.add(this.params, 'graphB').name('B').onChange(() => this.onNewResults(this.results));
        graphFolder.add(this.params, 'graphAB').name('A+B').onChange(() => this.onNewResults(this.results));
        graphFolder.add(this.params, 'graphBirkhoff').name('Birkhoff').onChange(() => this.onNewResults(this.results));
    }

    ngOnDestroy() {
        this.gui.destroy();
    }

}