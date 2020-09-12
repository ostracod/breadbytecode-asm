
import {VariableUtils as VariableUtilsInterface} from "models/utils";
import {AssemblyLine, ArgPerm, VariableDefinition, IdentifierMap} from "models/objects";
import {VariableDefinitionClass} from "models/items";
import {BetaType} from "delegates/dataType";

import {PointerType} from "delegates/dataType";

import {GlobalVariableDefinition, LocalVariableDefinition, ArgVariableDefinition} from "objects/variableDefinition";
import {AssemblyError} from "objects/assemblyError";
import {FrameLength} from "objects/frameLength";

export interface VariableUtils extends VariableUtilsInterface {}

export class VariableUtils {
    
    extractVariableDefinitionHelper(
        line: AssemblyLine,
        variableDefinitionClass: VariableDefinitionClass
    ): VariableDefinition {
        if (line.directiveName !== "VAR") {
            return null;
        }
        let tempArgList = line.argList;
        if (tempArgList.length < 2 || tempArgList.length > 3) {
            throw new AssemblyError("Expected 2 or 3 arguments.");
        }
        let tempIdentifier = tempArgList[0].evaluateToIdentifier();
        let tempDataType = tempArgList[1].evaluateToDataType();
        let tempArrayLength;
        if (tempArgList.length === 3) {
            tempArrayLength = tempArgList[2].evaluateToNumber();
        } else {
            tempArrayLength = 1;
        }
        return new variableDefinitionClass(tempIdentifier, tempDataType, tempArrayLength);
    }
    
    extractGlobalVariableDefinition(line: AssemblyLine): VariableDefinition {
        return variableUtils.extractVariableDefinitionHelper(line, GlobalVariableDefinition);
    }
    
    extractLocalVariableDefinition(line: AssemblyLine): VariableDefinition {
        return variableUtils.extractVariableDefinitionHelper(line, LocalVariableDefinition);
    }
    
    extractArgVariableDefinition(line: AssemblyLine): ArgVariableDefinition {
        if (line.directiveName !== "ARG") {
            return null;
        }
        let tempArgList = line.argList;
        if (tempArgList.length < 2) {
            throw new AssemblyError("Expected at least 2 arguments.");
        }
        let tempIdentifier = tempArgList[0].evaluateToIdentifier();
        let tempDataType = tempArgList[1].evaluateToDataType();
        let tempArrayLength = 1;
        let tempPermList: ArgPerm[] = [];
        for (let index = 2; index < tempArgList.length; index++) {
            let tempArg = tempArgList[index];
            let tempPerm;
            if (index === 2) {
                tempPerm = tempArg.evaluateToArgPermOrNull();
                if (tempPerm === null) {
                    tempArrayLength = tempArg.evaluateToNumber();
                    continue;
                }
            } else {
                tempPerm = tempArg.evaluateToArgPerm();
            }
            tempPermList.push(tempPerm);
        }
        return new ArgVariableDefinition(
            tempIdentifier,
            tempDataType,
            tempArrayLength,
            tempPermList
        );
    }
    
    populateVariableDefinitionIndexes(
        identifierMap: IdentifierMap<VariableDefinition>
    ): FrameLength {
        let nextAlphaIndex = 0;
        let nextBetaIndex = 0;
        identifierMap.iterate(variableDefinition => {
            const tempSize = variableDefinition.getFrameSize();
            if (variableDefinition.dataType instanceof PointerType) {
                variableDefinition.index = nextAlphaIndex;
                nextAlphaIndex += tempSize;
            } else {
                variableDefinition.index = nextBetaIndex;
                nextBetaIndex += tempSize;
            }
        });
        return new FrameLength(nextAlphaIndex, nextBetaIndex);
    }
}

export const variableUtils = new VariableUtils();


