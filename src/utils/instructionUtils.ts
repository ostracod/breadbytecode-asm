
import {InstructionUtils as InstructionUtilsInterface} from "models/utils";
import {DataType} from "models/delegates";
import {InstructionArg} from "models/objects";

import {unsignedInteger64Type} from "delegates/dataType";

import {NumberConstant} from "objects/constant";
import {InstructionRef, ConstantInstructionArg, RefInstructionArg} from "objects/instruction";

export interface InstructionUtils extends InstructionUtilsInterface {}

export class InstructionUtils {
    
    createArgBuffer(refPrefix: number, dataType: DataType, buffer: Buffer): Buffer {
        return Buffer.concat([Buffer.from([(refPrefix << 4) + dataType.argPrefix]), buffer]);
    }
    
    createInstructionArgWithIndex(refPrefix: number, dataType: DataType, index: number): InstructionArg {
        let tempRef = new InstructionRef(refPrefix);
        let tempNumberConstant = new NumberConstant(
            index,
            unsignedInteger64Type
        );
        tempNumberConstant.compress();
        let tempArg = new ConstantInstructionArg(tempNumberConstant);
        return new RefInstructionArg(tempRef, dataType, tempArg);
    }
}

export const instructionUtils = new InstructionUtils();


