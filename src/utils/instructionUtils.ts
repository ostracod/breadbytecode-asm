
import {InstructionUtils as InstructionUtilsInterface} from "models/utils";

export interface InstructionUtils extends InstructionUtilsInterface {}

export function InstructionUtils() {
    
}

export var instructionUtils = new InstructionUtils();

InstructionUtils.prototype.createInstructionArg = function(refPrefix: number, dataTypePrefix: number, buffer: Buffer): Buffer {
    return Buffer.concat([Buffer.from([(refPrefix << 4) + dataTypePrefix]), buffer]);
}


