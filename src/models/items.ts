
import {NumberType} from "models/delegates";
import {Expression, AssemblyLine, VariableDefinition, LabelDefinition, ArgNumber, ArgVersionNumber} from "models/objects";

export type ExpressionProcessor = ((expression: Expression) => Expression);

export type LineProcessor = ((line: AssemblyLine) => AssemblyLine[]);

export type NumberTypeClass = (new (...args: any[]) => NumberType);

export type VariableDefinitionClass = (new (...args: any[]) => VariableDefinition);

export type LabelDefinitionClass = (new (...args: any[]) => LabelDefinition);

export type ArgNumeric = (ArgNumber | ArgVersionNumber);


