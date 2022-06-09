import {HyperbolicPolygon, HyperbolicPolygonSpec} from "../../graphics/shapes/hyperbolic-polygon";
import {Complex} from "../complex";
import {Color} from "../../graphics/shapes/color";
import {Scene} from "../../graphics/scene";
import {Mobius} from "../mobius";
import {HyperbolicGeodesic} from "./hyperbolic-geodesic";
import {normalizeAngle} from "../math-helpers";
import {Arc as ArcSegment} from "../geometry/arc";
import {Segment} from "../geometry/segment";
import {LineSegment} from "../geometry/line-segment";
import {Circle} from "../geometry/circle";
import {Selectable} from "../../app/demos/math-demo";
import {Disk, DiskSpec} from "../../graphics/shapes/disk";
import {ArcRegion} from "../geometry/arc-region";
import {MultiArc} from "../../graphics/shapes/multi-path";

interface Orbit {
    word: number[];
    points: Complex[];
}

const MAX_ORBIT_SEARCH_ITERATIONS = 10;

export class HyperbolicOuterBilliards {
    private table!: HyperbolicPolygon;
    readonly vertices: Complex[] = [];
    readonly mobii: Mobius[] = [];
    private inProgressSegments: Segment[] = [];
    private inProgressN = 0;
    private arcPreimages: MultiArc[] = [];
    private startRegions: ArcRegion[] = [];
    private imageRegions: ArcRegion[] = [];
    private orbits: Orbit[] = [];

    constructor(private readonly gl: WebGL2RenderingContext) {
        const n = 3;
        const r = 0.1;
        for (let i = 0; i < n; i++) {
            const v = Complex.polar(r, i * 2 * Math.PI / n + Math.PI / 2);
            this.vertices.push(v);
            this.mobii.push(Mobius.pointInversion(v));
        }
        this.updateTable();
    }

    private updateTable(): void {
        this.table = new HyperbolicPolygon(this.gl, new HyperbolicPolygonSpec(
            this.vertices,
            Color.CRIMSON,
            Color.ONYX,
        ));
        this.startRegions = [];
        this.imageRegions = [];
        for (let i = 0; i < this.vertices.length; i++) {
            // Vertices are arranged in an anti-clockwise manner.
            const v0 = this.vertices[(i - 1 + this.vertices.length) % this.vertices.length];
            const v1 = this.vertices[i];
            const v2 = this.vertices[(i + 1) % this.vertices.length];
            //       /\
            //  / \ /  \
            // c   1    |
            // \  / \   c
            //   2   0  |
            //        \/
            const g1 = new HyperbolicGeodesic(v0, v1);
            const g2 = new HyperbolicGeodesic(v1, v2);
            const c = g1.ideal1.plus(g2.ideal1).normalize();
            const segments = [
                fromThreePoints(g1.ideal1, c, g2.ideal1),
                g2.leftTail(),
                g1.centralSegment(),
                g1.leftTail(),
            ];

            const r = new ArcRegion(segments);
            this.startRegions.push(r);
            this.imageRegions.push(this.mapRegion(r))
        }
        this.findAllOrbits();
    }

    findAllOrbits() {
        this.orbits = [];
        let words: number[][] = [];
        let maps: Mobius[] = [];
        let ranges: ArcRegion[] = [];
        const n = this.vertices.length;
        for (let i = 0; i < n; i++) {
            words.push([i]);
            maps.push(this.mobii[i]);
            ranges.push(this.imageRegions[i]);
        }
        for (let len = 2; len < MAX_ORBIT_SEARCH_ITERATIONS; len ++) {
            const newWords = [];
            const newMaps = [];
            const newRanges = [];
            for (let i = 0; i < words.length; i++) {
                for (let j = 0; j < n; j++) {
                    if (j !== words[i][words[i].length - 1]) {
                        const newWord = words[i].concat(j);
                        const newMap = this.mobii[j].compose(maps[i]);
                        let newRange;
                        try {
                            console.log(ranges[i], this.startRegions[j]);
                            newRange = transformRegion(ranges[i].convexIntersect(this.startRegions[j]), this.mobii[j]);
                        } catch (e) {
                            console.log(`Trimming a substring: [${newWord.join(', ')}]`);
                            continue;
                        }
                        newWords.push(newWord);
                        newMaps.push(newMap);
                        newRanges.push(newRange);
                    }
                }
            }
            words = newWords;
            maps = newMaps;
            ranges = newRanges;
            console.log(`Found ${words.length} words of length ${len}.`);
            console.log(newWords);
            for (let word of words) {
                if (word[0] === word[word.length - 1]) continue;
                let m = Mobius.IDENTITY;
                for (let l of word) {
                    m = this.mobii[l].compose(m);
                }
                const f = m.fixedPoints().find(value => value.modulusSquared() < 1);
                if (!f) {
                    console.warn('Map has no interior fixed point. This is unexpected.');
                    continue;
                }
                let p = f;
                const points = [];
                for (let l of word) {
                    if (l !== this.forwardMapIndex(p)) {
                        break;
                    }
                    p = this.mobii[l].apply(p);
                    points.push(p);
                }
                if (points.length === word.length) {
                    console.log(`Found a periodic orbit of length ${len}.`);
                    this.orbits.push({word, points});
                }
            }
        }
    }

    moveVertex(index: number, destination: Complex): void {
        this.inProgressN = 0;
        this.inProgressSegments = [];
        this.arcPreimages = [];
        this.vertices[index] = destination;
        this.mobii[index] = Mobius.pointInversion(destination);
        this.updateTable();
    }

    forwardMapIndex(z: Complex): number {
        for (let i = 0; i < this.startRegions.length; i++) {
            if (this.startRegions[i].containsPoint(z)) return i;
        }
        return -1;
    }

    forwardMap(z: Complex): Mobius {
        for (let i = 0; i < this.startRegions.length; i++) {
            if (this.startRegions[i].containsPoint(z)) return this.mobii[i];
        }
        throw Error('No forward transformation');
    }

    inverseMap(z: Complex): Mobius {
        for (let i = 0; i < this.imageRegions.length; i++) {
            if (this.imageRegions[i].containsPoint(z)) return this.mobii[i];
        }
        throw Error('No inverse transformation');
    }

    mapRegion(r: ArcRegion): ArcRegion {
        const t = this.forwardMap(r.interiorPoint());
        return transformRegion(r, t);
    }

    iteratePreimages(n: number, millis: number): void {
        if (this.inProgressSegments.length === 0) {
            this.inProgressSegments = this.table.geodesics.map(g => g.leftTail());
            // this.inProgressSegments = [this.table.geodesics[1].leftTail()];
        }
        while (this.inProgressN < n) {
            this.arcPreimages.push(MultiArc.fromSegmentList(this.gl, this.inProgressSegments, Color.ONYX));
            try {
                this.inProgressSegments = this.inProgressSegments.flatMap(s => {
                    let splitPoints: Complex[] = [];
                    for (let g of this.table.geodesics) {
                        splitPoints = splitPoints.concat(s.intersect(g.rightTail()));
                    }
                    const r = [];
                    // Get rid of degenerate segments
                    const segments = s.split(splitPoints).filter(s => !s.start.equals(s.end));
                    for (let p of segments) {
                        try {
                            const m = this.inverseMap(p.mid);
                            r.push(transformSegment(p, m));
                        } catch (e) {
                            console.log(`One-off failure in step ${this.inProgressN+1} with error ${e}`);
                        }
                    }
                    return r;
                });
            } catch (e) {
                console.log(e);
                console.log(`Failed after ${this.inProgressN} steps with error ${e}`);
                this.inProgressN = n;
                break;
            }
            this.inProgressN++;
            if (Date.now() - millis > 15) {
                break;
            }
        }
    }

    populateScene(scene: Scene): void {
        const n = 200;
        if (this.inProgressN >= n) {
            return;
        }
        scene.clear();

        // Poincaré disk model
        scene.set('disk', new Disk(this.gl!, new DiskSpec(new Complex(), 1, Color.BLUSH, Color.BLACK)));
        scene.set('table', this.table);
        this.iteratePreimages(n, Date.now());
        // scene.set(`region_1`, Polygon2D.fromArcRegion(this.gl, this.imageRegions[0], undefined, Color.ONYX));
        // scene.set(`region_2`, Polygon2D.fromArcRegion(this.gl, this.startRegions[1], undefined, Color.ONYX));
        // scene.set(`region_3`, Polygon2D.fromArcRegion(this.gl, this.startRegions[2], Color.MAGENTA, Color.ONYX));
        // try {
        //     scene.set(`region_intersect`, this.intersect!);
        // } catch (e) {}
        for (let i = 0; i < this.arcPreimages.length; i++) {
            // scene.set(`geodesic_image_${i + 1}`, this.arcImages[i]);
            scene.set(`geodesic_preimage_${i + 1}`, this.arcPreimages[i]);
        }
        for (let orbit of this.orbits) {
            for (let i = 0; i < orbit.points.length; i++) {
                scene.set(`orbit_${orbit.word.join('')}_${i+1}`,
                    new Disk(this.gl,
                        new DiskSpec(orbit.points[i], 0.005, Color.RED, Color.ONYX)));
            }
        }
    }
}

export class VertexHandle extends Selectable {
    constructor(private readonly gl: WebGL2RenderingContext,
                private readonly index: number,
                private readonly hob: HyperbolicOuterBilliards,
                private readonly scene: Scene,
                private readonly pixelToWorld: Function) {
        super(new Disk(gl, new DiskSpec(hob.vertices[index], 0.05, Color.RED, undefined)),
            (_x: number, _y: number, _: VertexHandle) => {},
            (x: number, y: number, ths: VertexHandle) => {
            const p = pixelToWorld(x, y);
            ths.drawable.recenter(p.real, p.imag, 0);
            hob.moveVertex(index, p);
            hob.populateScene(scene);
            },
            (_x: number, _y: number, _: VertexHandle) => {});
    }
}

function transformRegion(r: ArcRegion, t: Mobius): ArcRegion {
    return new ArcRegion(r.segments.map(s => transformSegment(s, t)));
}

function transformSegment(s: Segment, t: Mobius): Segment {
    return fromThreePoints(t.apply(s.start), t.apply(s.mid), t.apply(s.end));
}

function fromThreePoints(p1: Complex, p2: Complex, p3: Complex): Segment {
    if (p1.isInfinite() || p2.isInfinite() || p3.isInfinite()) throw Error('Infinite segment');
    if (p1.equals(p2) || p2.equals(p3) || p3.equals(p1)) throw Error('Degenerate segment');

    const d1 = p1.minus(p2);
    const d2 = p2.minus(p3);
    const det = d1.x * d2.y - d1.y * d2.y;

    if (det === 0) return new LineSegment(p1, p3);

    const c = Circle.fromThreePoints(p1, p2, p3);
    const a1 = c.center.heading(p1);
    const a2 = normalizeAngle(c.center.heading(p2), a1);
    const a3 = normalizeAngle(c.center.heading(p3), a1);

    let start: number;
    let end: number;
    if (a2 < a3) {
        start = a1;
        end = a3;
    } else {
        start = a3;
        end = a1;
    }
    return new ArcSegment(c.center, c.radius, start, normalizeAngle(end, start));
}

// function angle(g1: HyperbolicGeodesic, g2: HyperbolicGeodesic): number {
//     let h1 = 0;
//     let h2 = 0;
//     if (g1.p1.equals(g2.p1)) {
//         h1 = g1.startHeading();
//         h2 = g2.startHeading();
//     } else if (g1.p1.equals(g2.p2)) {
//         h1 = g1.startHeading();
//         h2 = g2.endHeading();
//     } else if (g1.p2.equals(g2.p1)) {
//         h1 = g1.endHeading();
//         h2 = g2.startHeading();
//     } else if (g1.p2.equals(g2.p2)) {
//         h1 = g1.endHeading();
//         h2 = g2.endHeading();
//     } else {
//         throw Error('Geodesics do not line up');
//     }
//     return normalizeAngle(h2 - h1);
// }

// function generateWords(letters: number, wordLength: number): number[][] {
//     let words: number[][] = [[]];
//     for (let i = 0; i < wordLength; i++) {
//         const newWords: number[][] = [];
//         for (let word of words) {
//             for (let l = 0; l < letters; l++) {
//                 if (word.length === 0 || l !== word[i - 1]) {
//                     newWords.push(word.concat(l));
//                 }
//             }
//         }
//         words = newWords;
//     }
//
//     if (wordLength > 1) {
//         words = words
//             .filter((value => value[0] !== value[wordLength - 1]))
//             .filter(((value, index, self) =>
//             index === self.findIndex((t) => isCyclicPermutation(t, value))));
//     }
//     return words;
// }

// function isCyclicPermutation(l1: number[], l2: number[]): boolean {
//     if (l1.length != l2.length) return false;
//     for (let i = 0; i < l1.length; i++) {
//         if (l1.every((value, index) => value === l2[(index + i) % l1.length])) return true;
//     }
//     return false;
// }