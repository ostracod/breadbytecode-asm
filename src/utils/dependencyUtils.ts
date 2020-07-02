
import {DependencyUtils as DependencyUtilsInterface} from "models/utils";
import {Expression, Identifier} from "models/objects";
import {AssemblyError} from "objects/assemblyError";

export interface DependencyUtils extends DependencyUtilsInterface {}

export class DependencyUtils {
    
    evaluateDependencyArgs(
        argList: Expression[],
        modifiersStartIndex: number
    ): {identifier: Identifier, path: string, dependencyModifierList: number[]} {
        if (argList.length < modifiersStartIndex) {
            throw new AssemblyError(`Expected at least ${modifiersStartIndex} arguments.`);
        }
        let tempIdentifier = argList[0].evaluateToIdentifier();
        let tempPath = argList[1].evaluateToString();
        let tempModifierList = [];
        for (let index = modifiersStartIndex; index < argList.length; index++) {
            let tempArg = argList[index];
            tempModifierList.push(tempArg.evaluateToDependencyModifier());
        }
        return {
            identifier: tempIdentifier,
            path: tempPath,
            dependencyModifierList: tempModifierList
        };
    }
}

export var dependencyUtils = new DependencyUtils();


