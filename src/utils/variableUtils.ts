
import {VariableUtils as VariableUtilsInterface} from "models/utils";
import {AssemblyLine, ArgPerm} from "models/objects";
import {VariableDefinition, ArgVariableDefinition} from "objects/variableDefinition";
import {AssemblyError} from "objects/assemblyError";

export interface VariableUtils extends VariableUtilsInterface {}

export function VariableUtils() {
    
}

export var variableUtils = new VariableUtils();

VariableUtils.prototype.extractLocalVariableDefinition = function(line: AssemblyLine): VariableDefinition {
    if (line.directiveName != "VAR") {
        return null;
    }
    var tempArgList = line.argList;
    if (tempArgList.length !== 2) {
        throw new AssemblyError("Expected 2 arguments.");
    }
    var tempIdentifier = tempArgList[0].evaluateToIdentifier();
    var tempDataType = tempArgList[1].evaluateToDataType();
    return new VariableDefinition(tempIdentifier, tempDataType);
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


