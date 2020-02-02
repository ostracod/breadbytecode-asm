
import {
    FrameLength as FrameLengthInterface,
} from "models/objects";

export interface FrameLength extends FrameLengthInterface {}

export class FrameLength {
    constructor(alphaLength: number, betaLength: number) {
        this.alphaLength = alphaLength;
        this.betaLength = betaLength;
    }
}

FrameLength.prototype.createBuffer = function(): Buffer {
    let output = Buffer.alloc(16);
    output.writeUInt32LE(this.alphaLength, 0);
    output.writeUInt32LE(this.betaLength, 8);
    return output;
}


