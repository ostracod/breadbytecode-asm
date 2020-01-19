
import {MixedNumber} from "models/items";
import {MathUtils as MathUtilsInterface} from "models/utils";

export interface MathUtils extends MathUtilsInterface {}

export function MathUtils() {
    
}

export var mathUtils = new MathUtils();

MathUtils.prototype.convertMixedNumberToBigInt = function(value: MixedNumber): bigint {
    if (typeof value === "bigint") {
        return value;
    }
    return BigInt(Math.floor(value));
}

MathUtils.prototype.convertNumberToHexadecimal = function(value: number, length: number): string {
    let output = value.toString(16).toUpperCase();
    while (output.length < length) {
        output = "0" + output;
    }
    return "0x" + output;
}

MathUtils.prototype.convertBufferToHexadecimal = function(buffer: Buffer): string {
    let tempTextList = [];
    let index = 0;
    while (index < buffer.length) {
        let tempValue = buffer[index];
        tempTextList.push(mathUtils.convertNumberToHexadecimal(tempValue, 2));
        index += 1;
    }
    return tempTextList.join(" ");
}


