import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {
    BufferGeometry,
    Color,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    Shape,
    ShapeGeometry,
    Vector2,
    Vector4
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {Collision, Polygon, Ray} from "./corridors.component";
import {closeEnough, normalizeAngle} from "../../../math/math-helpers";
import {LineSegment} from "../../../math/geometry/line-segment";
import {Complex} from "../../../math/complex";
import {Line} from "../../../math/geometry/line";

const CLEAR_COLOR = new Color(0x123456);
const EPSILON = 0.000_000_1;

@Component({
    selector: 'corridor-unfolder',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass']
})
export class CorridorUnfolderComponent extends ThreeDemoComponent implements OnChanges {
    @Input() polygon: Polygon | undefined = undefined;
    @Input() length: number | undefined;
    @Input() state!: Vector2;

    phaseBoxes: Vector4[] = [];
    dirty = false;

    orbitControls: OrbitControls;

    @Output()
    phaseBoxesEmitter = new EventEmitter<Vector4[]>();

    constructor() {
        super();
        this.useOrthographic = true;
        this.orbitControls = new OrbitControls(this.orthographicCamera, this.renderer.domElement);
        this.orbitControls.enableRotate = false;
        this.renderer.setClearColor(CLEAR_COLOR);
    }

    override frame(dt: number) {
        if (!this.dirty || this.state === undefined || this.polygon === undefined || this.length === undefined) return;
        this.dirty = false;
        this.scene.clear();
        const unfoldingVertices: Vector2[] = [];
        let polygon = this.polygon;
        const startIndex = this.polygon.sideIndex(this.state.x);
        const start = this.polygon.parametrization(this.state.x);
        const end = this.polygon.parametrization(this.state.y);
        const dir = end.clone().sub(start).normalize();
        const src = start.clone().addScaledVector(dir, EPSILON);
        let ray: Ray = {src, dir};
        let collision: Collision | undefined = undefined;
        const leftPoints: Vector2[] = [this.polygon.vertices[startIndex]];
        const rightPoints: Vector2[] = [this.polygon.vertices[(startIndex + 1) % this.polygon.n]];
        const sideIndices = [startIndex];
        for (let i = 0; i < this.length; i++) {
            for (let j = 0; j < polygon.n; j++) {
                const v1 = polygon.vertices[j];
                const v2 = polygon.vertices[(j + 1) % this.polygon.n];
                unfoldingVertices.push(v1, v2);
            }
            try {
                collision = polygon.cast(ray);
                sideIndices.push(collision.sideIndex);
                polygon = polygon.reflect(collision.sideIndex);
                ray.src = collision.point.clone().addScaledVector(dir, EPSILON);
                leftPoints.push(collision.left);
                rightPoints.push(collision.right);
            } catch (e) {
                break;
            }
        }
        console.log(sideIndices.join(', '));
        // compute corridor with tracked vertices
        // draw unfoldings, ray, and corridor
        const unfoldingGeometry = new BufferGeometry().setFromPoints(unfoldingVertices);
        const unfoldingMaterial = new LineBasicMaterial({color: 0xffffff});
        const unfolding = new LineSegments(unfoldingGeometry, unfoldingMaterial);
        this.scene.add(unfolding);

        const rayGeometry = new BufferGeometry().setFromPoints([start, collision?.point || end]);
        const rayMaterial = new LineBasicMaterial({color: 0xff9999});
        const rayLine = new LineSegments(rayGeometry, rayMaterial);
        this.scene.add(rayLine);

        // const leftDotMaterial = new PointsMaterial({size: 5, color: 0xff0000});
        // const rightDotMaterial = new PointsMaterial({size: 5, color: 0x00ff00});
        // const leftDotGeometry = new BufferGeometry().setFromPoints(leftPoints);
        // const rightDotGeometry = new BufferGeometry().setFromPoints(rightPoints);
        // this.scene.add(new Points(leftDotGeometry, leftDotMaterial));
        // this.scene.add(new Points(rightDotGeometry, rightDotMaterial));

        // const leftConvex = convexList({src, dir}, leftPoints, true);
        // const rightConvex = convexList({src, dir}, rightPoints, false);
        // this.scene.add(new ThreeLine(
        //     new BufferGeometry().setFromPoints(leftConvex),
        //     new LineBasicMaterial({color: 0xff0000})));
        // this.scene.add(new ThreeLine(
        //     new BufferGeometry().setFromPoints(rightConvex),
        //     new LineBasicMaterial({color: 0x00ff00})));

        const corridor = findSubCorridors({src, dir}, leftPoints, rightPoints);
        const corridorShape = new Mesh(
            new ShapeGeometry(new Shape().setFromPoints(corridor.vertices)),
            new MeshBasicMaterial({color: 0x00aaaa})
        );
        corridorShape.translateZ(-1);
        this.scene.add(corridorShape);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.hasOwnProperty('length') || changes.hasOwnProperty('vertices')) {
            this.phaseBoxes = [];
            this.phaseBoxesEmitter.emit(this.phaseBoxes);
        }
        if (!!changes['vertices']?.currentValue) {
            this.polygon = new Polygon(changes['vertices'].currentValue);
        }
        this.dirty = true;
    }
}

function convexList(ray: Ray, vertices: Vector2[], left: boolean): Vector2[] {
    // const v = [...vertices].sort((a, b) =>
    //     a.clone().sub(ray.src).dot(ray.dir) - b.clone().sub(ray.src).dot(ray.dir));
    if (vertices.length < 2) return vertices;
    const convex = [vertices[0]];
    let i = 0;
    const rayAngle = ray.dir.angle();
    const sortAngle = (angle: number) => {
        return normalizeAngle(angle, rayAngle - Math.PI) * (left ? -1 : 1);
    };
    while (i < vertices.length - 1) {
        let bestIndex = vertices.length - 1;
        let bestAngle = sortAngle(vertices[bestIndex].clone().sub(vertices[i]).angle());
        let j = i + 1;
        for (; j < vertices.length - 1; j++) {
            const angle = sortAngle(vertices[j].clone().sub(vertices[i]).angle());
            if (angle >= bestAngle) {
                bestAngle = angle;
                bestIndex = j;
            }
        }
        convex.push(vertices[bestIndex]);
        i = bestIndex;
    }
    return convex;
}

interface Corridor {
    subCorridors: SubCorridor[];
    vertices: Vector2[];
}

interface CutPoint {
    startPoint: Vector2;
    boundPoint: Vector2;
    left: boolean;
}

interface SubCorridor {
    startPoint: Vector2;
    endPoint: Vector2;
    leftBound: Vector2;
    rightBound: Vector2;
}

function findSubCorridors(ray: Ray, leftVertices: Vector2[], rightVertices: Vector2[]): Corridor {
    const startSegment = new LineSegment(Complex.fromVector2(leftVertices[0]), Complex.fromVector2(rightVertices[0]));
    const endSegment = new LineSegment(
        Complex.fromVector2(rightVertices[rightVertices.length - 1]),
        Complex.fromVector2(leftVertices[leftVertices.length - 1]));
    const lc = convexList(ray, leftVertices, true);
    const rc = convexList(ray, rightVertices, false);

    // Front and back "slashes" are the most extremely angled rays that make it down the corridor
    let backStart = 0;
    let backEnd = lc.length - 1;
    let flag = true;
    while (flag) {
        flag = false;
        while (backStart < rc.length - 1 &&
        lc[backEnd].clone().sub(rc[backStart]).cross(rc[backStart + 1].clone().sub(rc[backStart])) > 0) {
            backStart++;
            flag = true;
        }
        while (backEnd > 1 &&
        rc[backStart].clone().sub(lc[backEnd]).cross(lc[backEnd - 1].clone().sub(lc[backEnd])) > 0) {
            backEnd--;
            flag = true;
        }
    }

    let frontStart = 0;
    let frontEnd = rc.length - 1;
    flag = true;
    while (flag) {
        flag = false;
        while (frontStart < lc.length - 1 &&
        rc[frontEnd].clone().sub(lc[frontStart]).cross(lc[frontStart + 1].clone().sub(lc[frontStart])) < 0) {
            frontStart++;
            flag = true;
        }
        while (frontEnd > 1 &&
        lc[frontStart].clone().sub(rc[frontEnd]).cross(rc[frontEnd - 1].clone().sub(rc[frontEnd])) < 0) {
            frontEnd--;
            flag = true;
        }
    }

    // *———————*
    //  \     /
    //   *   *
    //   |\ /|
    //   | X |
    //   |/ \|
    //   *   *
    //  /     \
    // *———————*


    const frontLine = Line.throughTwoPoints(lc[frontStart], rc[frontEnd]);
    const backLine = Line.throughTwoPoints(rc[backStart], lc[backEnd]);
    const vertices: Vector2[] = [];
    vertices.push(startSegment.intersectLine(backLine)?.toVector2() || startSegment.end.toVector2());
    for (let i = Math.max(backStart, 1); i <= Math.min(frontEnd, rc.length - 1); i++) {
        vertices.push(rc[i]);
    }
    vertices.push(endSegment.intersectLine(frontLine)?.toVector2() || endSegment.start.toVector2());
    vertices.push(endSegment.intersectLine(backLine)?.toVector2() || endSegment.end.toVector2());
    for (let i = Math.min(backEnd, lc.length - 1); i >= Math.max(frontStart, 1); i--) {
        vertices.push(lc[i]);
    }
    vertices.push(startSegment.intersectLine(frontLine)?.toVector2() || startSegment.start.toVector2());

    const cuts: CutPoint[] = [];
    cuts.push({
        startPoint: startSegment.intersectLine(frontLine)?.toVector2() || lc[0],
        boundPoint: frontStart > 0 ? lc[frontStart] : lc[1],
        left: true,
    });
    for (let i = Math.max(frontStart, 1); i < backEnd; i++) {
        if (closeEnough(lc[i].distanceTo(lc[i + 1]), 0)) continue;
        const line = Line.throughTwoPoints(lc[i], lc[i + 1]);
        const intersection = startSegment.intersectLine(line);
        if (intersection === undefined) continue;
        cuts.push({
            startPoint: intersection.toVector2(),
            boundPoint: lc[i + 1],
            left: true,
        });
    }

    for (let i = frontEnd - 1; i > Math.max(backStart, 1); i--) {
        if (closeEnough(rc[i].distanceTo(rc[i - 1]), 0)) continue;
        const line = Line.throughTwoPoints(rc[i], rc[i - 1]);
        const intersection = startSegment.intersectLine(line);
        if (intersection === undefined) continue;
        cuts.push({
            startPoint: intersection.toVector2(),
            boundPoint: rc[i],
            left: false,
        });
    }
    cuts.push({
        startPoint: startSegment.intersectLine(backLine)?.toVector2() || rc[0],
        boundPoint: backStart > 0 ? rc[backStart] : rc[1],
        left: false,
    });

    cuts.sort((a, b) => a.startPoint.distanceTo(lc[0]) - b.startPoint.distanceTo(lc[0]));

    const subCorridors: SubCorridor[] = [];
    let leftBound = cuts[0].boundPoint;
    let rightBound = cuts[1].boundPoint;
    for (let i = 0; i < cuts.length; i++) {
        if (!cuts[i].left) {
            rightBound = cuts[i].boundPoint;
            break;
        }
    }

    for (let i = 0; i < cuts.length - 1; i++) {
        if (cuts[i].left) leftBound = cuts[i].boundPoint;
        if (!cuts[i + 1].left) rightBound = cuts[i + 1].boundPoint;
        subCorridors.push({
            startPoint: cuts[i].startPoint,
            endPoint: cuts[i + 1].startPoint,
            leftBound,
            rightBound,
        });
    }

    return {subCorridors, vertices};
}
