class Complex {
    constructor(readonly real: number, readonly imag: number) {
        if (isNaN(real) || isNaN(imag)) {
            throw new Error("Cannot pass NaN to complex.");
        }
    }

    isInfinite(): boolean {
        return (!isFinite(this.real)) && (!isFinite(this.imag));
    }

    isZero(): boolean {
        return this.real === 0 || this.imag === 0;
    }

    magnitude(): number {
        if (this.isInfinite()) return Infinity;
        return Math.sqrt(this.real * this.real + this.imag * this.imag);
    }

    magnitudeSquared(): number {
        if (this.isInfinite()) return Infinity;
        return this.real * this.real + this.imag * this.imag;
    }
}