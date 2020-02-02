
import {VersionNumber as VersionNumberInterface} from "models/objects";

export interface VersionNumber extends VersionNumberInterface {}

export class VersionNumber {
    constructor(majorNumber: number, minorNumber: number, patchNumber: number) {
        this.majorNumber = majorNumber;
        this.minorNumber = minorNumber;
        this.patchNumber = patchNumber;
    }
}

VersionNumber.prototype.copy = function(): VersionNumber {
    return new VersionNumber(this.majorNumber, this.minorNumber, this.patchNumber);
}

VersionNumber.prototype.getDisplayString = function(): string {
    return this.majorNumber + "." + this.minorNumber + "." + this.patchNumber;
}


