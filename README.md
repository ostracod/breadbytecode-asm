
# BreadBytecode Assembler

This utility converts assembly code to BreadBytecode for BreadSystem.

## Instruction Syntax

Each instruction begins with an opcode followed by any number of comma-separated argument expressions.

Number literals:

* Decimal integer literal (Ex: `25`)
* Hexadecimal integer literal (Ex: `0x3F`)
* Floating point number literal (Ex: `2.5`)

Expression operators:

* `+`, `-`, `*`, `/`, and `%` perform arithmetic operations on constants
* `&`, `|`, `^`, `>>`, and `<<` perform bitwise operations on constants
* `(` and `)` manipulate order of operations
* `value:dataType` specifies the data type of a value
* `value[index]:dataType` accesses an element of a frame, region, or heap allocation

Data types:

* `p` = Pointer
* `u8`, `u16`, `u32`, and `u64` = Unsigned integer
* `s8`, `s16`, `s32`, and `s64` = Signed integer
* `f32` and `f64` = Floating point number

Expression keywords:

* `localFrame` refers to the current local frame
* `globalFrame` refers to the global frame
* `prevArgFrame` refers to the argument frame supplied by the caller
* `nextArgFrame` refers to the argument frame for the next function invocation
* `appData` refers to the application data region
* `null` refers to the null pointer value
* All of the system sentry types (Ex: `agentSType`, `protabSType`)
* All of the error constants (Ex: `typeErr`, `permErr`)

## Directive Syntax

Each directive begins with a directive name followed by any number of comma-separated argument expressions.

Literal values which may only be used in directive arguments:

* Version number expressed as `major.minor.patch` (Ex: `1.4.0`)
* String literal enclosed in quotation marks (Ex: `"Hello"`)

An argument permission modifier consists of a sequence of letters with the following format:

`(r/w/s)(i/o)(r?)(p?)(t?)`

* `r/w/s` indicates whether to modify read, write, or sentry type permission
* `i/o` indicates whether to add permission to the input or output
* Trailing `r` indicates that the permission should be recursive
* Trailing `p` indicates that the permission should have infinite propagation count
* Trailing `t` indicates that the permission should be temporary

Example argument permission modifiers:

* `rit` = Add temporary read permission to input
* `wo` = Add write permission to output
* `sirp` = Recursively add sentry type permission to input with infinite propagation count

Certain directives initiate code blocks which are terminated by the `END` directive. For example:

```
PRIVATE_FUNC myFunction
    # Code block body goes here.
END
```

## List of Directives

`BYTECODE_VER ver`  
Declares the bytecode version number to be used in the application.

`DEF name, constant`  
Declares a constant.

`PATH_DEP name, isRequired, path`  
Declares a simple dependency with an explicit path.

`VER_DEP name, isRequired, path, ver`  
Declares a bundle dependency with the given version number.

`IFACE_DEP name, isRequired, path, depIndexes`  
Declares an application dependency with the given interfaces.

`ENTRY_FUNC ... END`  
Declares the entry point function region.

`PRIVATE_FUNC name ... END`  
Declares a private function region.

`PUBLIC_FUNC name, depIndex ... END`  
Declares a public function region which belongs to the given interface.

`VAR name, dataType`  
Declares a local variable.

`ARG name, dataType, argPermModifiers`  
Declares an argument variable.

`LBL name`  
Declares an instruction or data label.

`JMP_TABLE ... END`  
Declares the jump table region for the current function.

`APP_DATA ... END`  
Declares the application data region.

`DATA values`  
Provides constant values for a jump table or the application data region.

`INCLUDE path`  
Incorporates additional assembly code in the given file.

`MACRO macroName, argNames ... END`  
Declares a macro which may be used as an assembly directive.

Comments are preceded by a pound symbol (`#`).


