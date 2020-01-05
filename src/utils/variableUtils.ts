
import {VariableUtils as VariableUtilsInterface} from "models/utils";
import {AssemblyLine, ArgPerm, VariableDefinition, IdentifierMap} from "models/objects";
import {VariableDefinitionClass} from "models/items";
import {BetaType} from "delegates/dataType";

import {PointerType} from "delegates/dataType";

import {GlobalVariableDefinition, LocalVariableDefinition, ArgVariableDefinition} from "objects/variableDefinition";
import {AssemblyError} from "objects/assemblyError";

export interface VariableUtils extends VariableUtilsInterface {}

export function VariableUtils() {
    
}

export var variableUtils = new VariableUtils();

VariableUtils.prototype.extractVariableDefinitionHelper = function(
    line: AssemblyLine,
    variableDefinitionClass: VariableDefinitionClass
): VariableDefinition {
    if (line.directiveName != "VAR") {
        return null;
    }
    var tempArgList = line.argList;
    if (tempArgList.length !== 2) {
        throw new AssemblyError("Expected 2 arguments.");
    }
    var tempIdentifier = tempArgList[0].evaluateToIdentifier();
    var tempDataType = tempArgList[1].evaluateToDataType();
    return new variableDefinitionClass(tempIdentifier, tempDataType);
}

VariableUtils.prototype.extractGlobalVariableDefinition = function(line: AssemblyLine): VariableDefinition {
    return variableUtils.extractVariableDefinitionHelper(line, GlobalVariableDefinition);
}

VariableUtils.prototype.extractLocalVariableDefinition = function(line: AssemblyLine): VariableDefinition {
    return variableUtils.extractVariableDefinitionHelper(line, LocalVariableDefinition);
}

VariableUtils.prototype.extractArgVariableDefinition = function(line: AssemblyLine): ArgVariableDefinition {
    if (line.directiveName != "ARG") {
        return null;
    }
    var tempArgList = line.argList;
    if (tempArgList.length < 2) {
        throw new AssemblyError("Expected at least 2 arguments.");
    }
    var tempIdentifier = tempArgList[0].evaluateToIdentifier();
    var tempDataType = tempArgList[1].evaluateToDataType();
    var tempPermList: ArgPerm[] = [];
    var index = 2;
    while (index < tempArgList.length) {
        var tempArg = tempArgList[index];
        var tempPerm = tempArg.evaluateToArgPerm();
        tempPermList.push(tempPerm);
        index += 1;
    }
    return new ArgVariableDefinition(
        tempIdentifier,
        tempDataType,
        tempPermList
    );
}

VariableUtils.prototype.populateVariableDefinitionIndexes = function(identifierMap: IdentifierMap<VariableDefinition>): void {
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
}


