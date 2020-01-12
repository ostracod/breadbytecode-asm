
import {InstructionUtils as InstructionUtilsInterface} from "models/utils";
import {DataType} from "models/delegates";
import {unsignedInteger64Type} from "delegates/dataType";
import {NumberConstant} from "objects/constant";

export interface InstructionUtils extends InstructionUtilsInterface {}

export function InstructionUtils() {
    
}

export var instructionUtils = new InstructionUtils();

InstructionUtils.prototype.createInstructionArg = function(refPrefix: number, dataType: DataType, buffer: Buffer): Buffer {
    return Buffer.concat([Buffer.from([(refPrefix << 4) + dataType.argPrefix]), buffer]);
}

InstructionUtils.prototype.createInstructionArgWithIndex = function(refPrefix: number, dataType: DataType, index: number): Buffer {
    let tempNumberConstant = new NumberConstant(
        index,
        unsignedInteger64Type
    );
    tempNumberConstant.compress();
    return instructionUtils.createInstructionArg(
        refPrefix,
        dataType,
        tempNumberConstant.createInstructionArg()
    );
}


