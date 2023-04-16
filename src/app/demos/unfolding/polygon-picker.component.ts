import {Component, EventEmitter, Input, Output} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {
    AxesHelper,
    BufferGeometry,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    SphereGeometry,
    Vector2
} from "three";
import {DragControls} from "three/examples/jsm/controls/DragControls";

@Component({
    selector: 'polygon-picker',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass']
})
export class PolygonPickerComponent extends ThreeDemoComponent {

    @Output() verticesEvent = new EventEmitter<Vector2[]>();

    @Input() numVertices = 3;

    draggables: Mesh[] = [];
    dragControls: DragControls;

    dirty = true;

    constructor() {
        super();
        this.useOrthographic = true;
        this.orthographicDiagonal = 3;
        this.updateOrthographicCamera();

        const mat = new MeshBasicMaterial({color: 0xffffff});
        const geo = new SphereGeometry(0.05);
        for (let i = 0; i < this.numVertices; i++) {
            const v = polar(1, i * 2 * Math.PI / this.numVertices + 0.1234);
            const d = new Mesh(geo, mat);
            d.translateX(v.x);
            d.translateY(v.y);
            this.draggables.push(d);
        }
        this.dragControls = new DragControls([...this.draggables], this.camera, this.renderer.domElement);
        this.dragControls.addEventListener('drag', this.markDirty.bind(this));
    }

    markDirty() {
        this.dirty = true;
    }

    override frame(dt: number) {
        if (this.dirty) {
            this.dirty = false;

            this.scene.clear();
            const axesHelper = new AxesHelper(1);
            this.scene.add(axesHelper);
            const objects = this.dragControls.getObjects();
            this.scene.add(...objects);
            const vertices = objects.map(o => new Vector2(o.position.x, o.position.y));
            this.verticesEvent.emit(vertices);

            const polyPoints = []
            for (let i = 0; i < vertices.length; i++) {
                polyPoints.push(vertices[i], vertices[(i + 1) % vertices.length]);
            }

            const initGeometry = new BufferGeometry();
            initGeometry.setFromPoints(polyPoints);

            const initMat = new LineBasicMaterial({
                color: 0xffffff,
            });

            const init = new LineSegments(initGeometry, initMat);
            this.scene.add(init);
        }
    }
}

function polar(radius: number, theta: number): Vector2 {
    return new Vector2(
        radius * Math.cos(theta),
        radius * Math.sin(theta),
    );
}