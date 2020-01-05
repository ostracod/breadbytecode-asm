
import {InstructionUtils as InstructionUtilsInterface} from "models/utils";
import {DataType} from "models/delegates";

export interface InstructionUtils extends InstructionUtilsInterface {}

export function InstructionUtils() {
    
}

export var instructionUtils = new InstructionUtils();

InstructionUtils.prototype.createInstructionArg = function(refPrefix: number, dataType: DataType, buffer: Buffer): Buffer {
    return Buffer.concat([Buffer.from([(refPrefix << 4) + dataType.argPrefix]), buffer]);
}


