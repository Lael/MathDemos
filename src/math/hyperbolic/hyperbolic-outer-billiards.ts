import {HyperPolygon, HyperSegment, IdealArc} from "./hyper-polygon";
import {Complex} from "../complex";
import {Color} from "../../graphics/shapes/color";
import {Scene} from "../../graphics/scene";
import {Selectable} from "../../app/demos/math-demo";
import {Disk, DiskSpec} from "../../graphics/shapes/disk";
import {MultiArc} from "../../graphics/shapes/multi-path";
import {HyperbolicModel, HyperGeodesic, HyperIsometry, HyperPoint} from "./hyperbolic";
import {closeEnough, normalizeAngle} from "../math-helpers";

interface Orbit {
    word: number[];
    points: HyperPoint[];
    map: HyperIsometry;
}

const MAX_ORBIT_SEARCH_ITERATIONS = 4;

export class HyperbolicOuterBilliardsSettings {
    model: HyperbolicModel = HyperbolicModel.POINCARE;
    equilateralRadius: number = 0.2;
    vertexCount: number = 3;
}

export class HyperbolicOuterBilliardsResults {
    orbit: boolean = false;
    orbitLength: number = -1;
    orbitMapRotation: number = -1;

    reset() {
        this.orbit = false;
        this.orbitLength = -1;
        this.orbitMapRotation = -1;
    }
}

export class HyperbolicOuterBilliards {
    vertices: HyperPoint[] = [];
    private table!: HyperPolygon;
    private maps: HyperIsometry[] = [];

    private inProgressGeodesics: HyperGeodesic[] = [];
    private inProgressN = 0;
    private arcPreimages: MultiArc[] = [];
    private startRegions: HyperPolygon[] = [];
    private imageRegions: HyperPolygon[] = [];
    private orbits: Orbit[] = [];

    constructor(private readonly gl: WebGL2RenderingContext,
                readonly settings: HyperbolicOuterBilliardsSettings,
                readonly results: HyperbolicOuterBilliardsResults) {
        this.equilateral();
    }

    equilateral() {
        this.vertices = [];
        this.maps = [];
        const n = this.settings.vertexCount;
        const r = this.settings.equilateralRadius;
        for (let i = 0; i < n; i++) {
            const v = HyperPoint.fromPoincare(Complex.polar(r, i * 2 * Math.PI / n + Math.PI / 2));
            this.vertices.push(v);
            this.maps.push(HyperIsometry.pointInversion(v));
        }
        this.redraw();
    }

    moveVertex(index: number, destination: Complex): void {
        const v = new HyperPoint(destination, this.settings.model);
        this.vertices[index] = v;
        this.maps[index] = HyperIsometry.pointInversion(v);
        this.redraw();
    }

    redraw() {
        this.inProgressN = 0;
        this.inProgressGeodesics = [];
        this.arcPreimages = [];
        this.results.reset();
        this.updateTable();
    }

    private updateTable(): void {
        const n = this.vertices.length;
        const geodesics = [];
        for (let i = 0; i < n; i++) {
            geodesics.push(new HyperGeodesic(this.vertices[i], this.vertices[(i + 1) % n]));
        }
        this.table = new HyperPolygon(geodesics);
        this.startRegions = [];
        this.imageRegions = [];
        for (let i = 0; i < n; i++) {
            // Vertices are arranged in an anti-clockwise manner.
            const v0 = this.vertices[(i - 1 + n) % n];
            const v1 = this.vertices[i];
            const v2 = this.vertices[(i + 1) % n];
            //       /\
            //  / \ /  \
            // c   1    |
            // \  / \   c
            //   2   0  |
            //        \/
            const g1 = new HyperGeodesic(v0, v1);
            const g2 = new HyperGeodesic(v1, v2);
            const h1 = g1.ip.klein.argument();
            const h2 = g2.ip.klein.argument();
            const c = Complex.polar(1, (h1 + normalizeAngle(h2, h1)) / 2);
            const edges = [
                new IdealArc(g1.ip, HyperPoint.fromKlein(c), g2.ip),
                g2.pTail,
                new HyperGeodesic(v1, v0),
                new HyperGeodesic(v0, g1.ip),
            ];

            const r = new HyperPolygon(edges);
            this.startRegions.push(r);
            this.imageRegions.push(this.mapRegion(r));
        }
        this.findAllOrbits();
    }

    findAllOrbits() {
        this.orbits = [];
        let words: number[][] = [];
        let maps: HyperIsometry[] = [];
        let ranges: HyperPolygon[] = [];
        const n = this.vertices.length;
        for (let i = 0; i < n; i++) {
            words.push([i]);
            maps.push(this.maps[i]);
            ranges.push(this.imageRegions[i]);
        }
        for (let len = 2; len < MAX_ORBIT_SEARCH_ITERATIONS; len ++) {
            const newWords = [];
            const newMaps = [];
            const newRanges = [];
            for (let i = 0; i < words.length; i++) {
                for (let j = 0; j < n; j++) {
                    if (j === words[i][words[i].length - 1]) continue;
                    const newWord = words[i].concat(j);
                    const newMap = this.maps[j].compose(maps[i]);
                    const intersection = ranges[i].convexIntersect(this.startRegions[j]);
                    if (intersection === undefined) {
                        console.log(`Trimming a substring: [${newWord.join(', ')}]`);
                        continue;
                    }
                    const newRange = transformRegion(intersection, this.maps[j]);
                    newWords.push(newWord);
                    newMaps.push(newMap);
                    newRanges.push(newRange);
                }
            }
            words = newWords;
            maps = newMaps;
            ranges = newRanges;
            // console.log(`Found ${words.length} words of length ${len}.`);
            // console.log(newWords);
            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                if (word[0] === word[word.length - 1]) continue;
                const map = maps[i];
                const f = map.fixedPoints().find(value => !closeEnough(value.klein.modulusSquared(), 1));
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
                    p = this.maps[l].apply(p);
                    points.push(p);
                }
                if (points.length === word.length) {
                    this.addOrbit({word, points, map});
                }
            }
        }
    }

    private addOrbit(orbit: Orbit): void {
        // Check if orbit is new
        for (let other of this.orbits) {
            if (orbit.points.length % other.points.length !== 0) continue;
            for (let p of orbit.points) {
                for (let op of other.points) {
                    if (p.equals(op)) return;
                }
            }
        }

        console.log(`Found a periodic orbit of length ${orbit.points.length} and rotation angle ${orbit.map.rotation() / Math.PI}π`);
        this.orbits.push(orbit);
        this.results.orbit = true;
        this.results.orbitLength = orbit.word.length;
        this.results.orbitMapRotation = orbit.map.rotation();
    }

    forwardMapIndex(p: HyperPoint): number {
        for (let i = 0; i < this.startRegions.length; i++) {
            if (this.startRegions[i].containsPoint(p)) return i;
        }
        return -1;
    }

    forwardMap(p: HyperPoint): HyperIsometry {
        for (let i = 0; i < this.startRegions.length; i++) {
            if (this.startRegions[i].containsPoint(p)) return this.maps[i];
        }
        throw Error('No forward transformation');
    }

    inverseMap(p: HyperPoint): HyperIsometry {
        for (let i = 0; i < this.imageRegions.length; i++) {
            if (this.imageRegions[i].containsPoint(p)) return this.maps[i];
        }
        throw Error('No inverse transformation');
    }

    mapRegion(poly: HyperPolygon): HyperPolygon {
        const t = this.forwardMap(poly.interiorPoint());
        return transformRegion(poly, t);
    }

    iteratePreimages(n: number, millis: number): void {
        if (this.inProgressGeodesics.length === 0) {
            this.inProgressGeodesics = this.table.geodesics.map(g => g.pTail);
            // this.inProgressGeodesics = [this.table.geodesics[0].pTail];
        }
        while (this.inProgressN < n) {
            const segments = this.inProgressGeodesics
                .filter(g => {
                    const d1 = g.start.resolve(this.settings.model).distance(g.mid.resolve(this.settings.model));
                    const d2 = g.end.resolve(this.settings.model).distance(g.mid.resolve(this.settings.model));
                    return d1 + d2 > 0.000_001;
                }).map(g => g.segment(this.settings.model));
            this.arcPreimages.push(MultiArc.fromSegmentList(this.gl, segments, Color.ONYX));
            try {
                this.inProgressGeodesics = this.inProgressGeodesics.flatMap(s => {
                    const splitPoints: HyperPoint[] = [];
                    for (let g of this.table.geodesics) {
                        const intersection = s.intersect(g.qTail);
                        if (intersection) {
                            splitPoints.push(intersection);
                        }
                    }
                    const r = [];
                    // Get rid of degenerate segments
                    const segments = s.split(splitPoints).filter(seg => !seg.start.equals(seg.end));
                    for (let g of segments) {
                        try {
                            const m = this.inverseMap(g.mid);
                            r.push(transformSegment(g, m) as HyperGeodesic);
                        } catch (e) {
                            // console.log(`One-off failure in step ${this.inProgressN+1} with error ${e}`);
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
        scene.set('table', this.table.polygon(this.settings.model, this.gl, Color.CRIMSON, Color.ONYX));
        this.iteratePreimages(n, Date.now());
        // scene.set(`slice_p1`, Path.fromSegment(this.gl, this.table.geodesics[0].pTail.segment(this.settings.model), Color.RED));
        // scene.set(`slice_p2`, Path.fromSegment(this.gl, this.table.geodesics[1].pTail.segment(this.settings.model), Color.RED));
        // scene.set(`slice_p3`, Path.fromSegment(this.gl, this.table.geodesics[2].pTail.segment(this.settings.model), Color.RED));
        // scene.set(`slice_q1`, Path.fromSegment(this.gl, this.table.geodesics[0].qTail.segment(this.settings.model), Color.GREEN));
        // scene.set(`slice_q2`, Path.fromSegment(this.gl, this.table.geodesics[1].qTail.segment(this.settings.model), Color.GREEN));
        // scene.set(`slice_q3`, Path.fromSegment(this.gl, this.table.geodesics[2].qTail.segment(this.settings.model), Color.GREEN));
        // scene.set(`region_1`, this.imageRegions[0].polygon(this.settings.model, this.gl, Color.MANGO, Color.ONYX));
        // scene.set(`region_2`, this.startRegions[2].polygon(this.settings.model, this.gl, Color.MAGENTA, Color.ONYX));
        // scene.set(`region_3`, this.imageRegions[2].polygon(this.settings.model, this.gl, Color.MANGO, Color.ONYX));
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
                        new DiskSpec(orbit.points[i].resolve(this.settings.model), 0.005, Color.RED, Color.ONYX)));
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
        super(new Disk(gl, new DiskSpec(hob.vertices[index].resolve(hob.settings.model), 0.05, Color.RED, undefined)),
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

function transformRegion(poly: HyperPolygon, t: HyperIsometry): HyperPolygon {
    const edges = poly.edges.map(e => transformSegment(e, t));
    return new HyperPolygon(edges);
}

function transformSegment(s: HyperSegment, t: HyperIsometry): HyperSegment {
    if (s instanceof HyperGeodesic) return new HyperGeodesic(t.apply(s.start), t.apply(s.end));
    else return new IdealArc(t.apply(s.start), t.apply(s.mid), t.apply(s.end));
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