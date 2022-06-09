export class Color {
    static ZERO: Color = new Color(0, 0, 0, 0);
    static RED: Color = new Color(1, 0, 0);
    static GREEN: Color = new Color(0, 1, 0);
    static BLUE: Color = new Color(0, 0, 1);
    static WHITE: Color = new Color(1, 1, 1);
    static GREY: Color = new Color(0.5, 0.5, 0.5);
    static BLACK: Color = new Color(0, 0, 0);
    static YELLOW: Color = new Color(1, 1, 0);
    static MAGENTA: Color = new Color(1, 0, 1);
    static CYAN: Color = new Color(0, 1, 1);

    // Color Scheme
    static ONYX: Color = Color.hex('3D3D3D');
    static MANGO: Color = Color.hex('F7B801');
    static TURQUOISE: Color = Color.hex('75B9BE');
    static CRIMSON: Color = Color.hex('D7263D');
    static BLUSH: Color = Color.hex('FFEAEC');

    constructor(
        private readonly red: number,
        private readonly green: number,
        private readonly blue: number,
        private readonly alpha: number = 1,
    ) {}

    static hex(h: string): Color {
        if (h.length !== 6) throw Error('Color hex string must have length 6');
        const rs = h.substring(0, 2);
        const gs = h.substring(2, 4);
        const bs = h.substring(4, 6);
        const red = Number.parseInt(rs, 16);
        const green = Number.parseInt(gs, 16);
        const blue = Number.parseInt(bs, 16);
        if (!red || !green || !blue) throw Error('Color hex string is invalid: ' + h);
        return new Color(red / 255.0, green / 255.0, blue / 255.0, 1);
    }

    get r(): number {
        return this.red;
    }

    get g(): number {
        return this.green;
    }

    get b(): number {
        return this.blue;
    }

    get a(): number {
        return this.alpha;
    }
}