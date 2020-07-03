
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
        if (tempArgList.length !== 2) {
            throw new AssemblyError("Expected 2 arguments.");
        }
        let tempIdentifier = tempArgList[0].evaluateToIdentifier();
        let tempDataType = tempArgList[1].evaluateToDataType();
        return new variableDefinitionClass(tempIdentifier, tempDataType);
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
        let tempPermList: ArgPerm[] = [];
        for (let index = 2; index < tempArgList.length; index++) {
            let tempArg = tempArgList[index];
            let tempPerm = tempArg.evaluateToArgPerm();
            tempPermList.push(tempPerm);
        }
        return new ArgVariableDefinition(
            tempIdentifier,
            tempDataType,
            tempPermList
        );
    }
    
    populateVariableDefinitionIndexes(
        identifierMap: IdentifierMap<VariableDefinition>
    ): FrameLength {
        let nextAlphaIndex = 0;
        let nextBetaIndex = 0;
        identifierMap.iterate(variableDefinition => {
            if (variableDefinition.dataType instanceof PointerType) {
                variableDefinition.index = nextAlphaIndex;
                nextAlphaIndex += 1;
            } else {
                let tempBetaType = variableDefinition.dataType as BetaType;
                variableDefinition.index = nextBetaIndex;
                nextBetaIndex += tempBetaType.byteAmount;
            }
        });
        return new FrameLength(nextAlphaIndex, nextBetaIndex);
    }
}

export const variableUtils = new VariableUtils();


