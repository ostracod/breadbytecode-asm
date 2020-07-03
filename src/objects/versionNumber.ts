
import {VersionNumber as VersionNumberInterface} from "models/objects";

export interface VersionNumber extends VersionNumberInterface {}

export class VersionNumber {
    
    constructor(majorNumber: number, minorNumber: number, patchNumber: number) {
        this.majorNumber = majorNumber;
        this.minorNumber = minorNumber;
        this.patchNumber = patchNumber;
    }
    
    copy(): VersionNumber {
        return new VersionNumber(this.majorNumber, this.minorNumber, this.patchNumber);
    }
    
    getDisplayString(): string {
        return `${this.majorNumber}.${this.minorNumber}.${this.patchNumber}`;
    }
    
    createBuffer(): Buffer {
        let output = Buffer.alloc(12);
        output.writeUInt32LE(this.majorNumber, 0);
        output.writeUInt32LE(this.minorNumber, 4);
        output.writeUInt32LE(this.patchNumber, 8);
        return output;
    }
}


