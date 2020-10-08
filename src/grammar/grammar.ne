@{%

const moo = require("moo")

const lexer = moo.compile({
  WhiteSpace: { match: /[ \t\n\r]+/, lineBreaks: true },
  Dot: ".",
  Colon: ":",
  SemiColon: ";",
  Comma: ",",
  LeftParens: "(",
  RightParens: ")",
  LeftCurlyBrackets: "{",
  RightCurlyBrackets: "}",
  LeftBrackets: "[",
  RightBrackets: "]",
  Plus: "+",
  Minus: "-",
  Multiplier: "*",
  Divider: "/",
  Power: "^",
  QuestionMark: "?",
  LessThan: "<",
  GreaterThan: ">",
  Ampersand: "&",
  EqualsTo: "=",
  Pound: "#",
  Function: "Function",
  Debug: "Debug",
  If: "if",
  StringLiteral: {
    match: /"(?:[^\n\\"]|\\["\\ntbfr])*"/,
    value: s => JSON.parse(s)
  },
  NumberLiteral: {
    match: /[0-9]+(?:\.[0-9]+)?/,
  },
  VariableType: {
    match: /Int|Double|String|Boolean|Occult|Ark/
  },
  Identifier: {
    match: /[a-zA-Z_][a-zA-Z_0-9]*/,
    type: moo.keywords({
      For: "for",
      As: "as",
      All: "All",
      Use: "use",
      From: "from",
      True: "true",
      False: "false",
      Provide: "provide",
      Embody: "embody",
    })
  }
})

function arithmetic(type, data) {
  return { operation: "arithmetic", type, left: data[0], right: data[4], position: data[0].position }
}

function primitive(type, data) {
  return { operation: "primitive", type, ...data }
}

function position(data) {
  return { line: data[0].line, col: data[0].col }
}

%}

@preprocessor typescript
@lexer lexer

Program 
  ->  _ (UseStatement _ {% id %}):* 
  (Main _ {% id %}):* 
  (ProvideStatement _ {% id %}):? 
  {% d => ({ uses: d[1], program: d[2], provides: d[3] }) %}

Main 
  -> VariableDeclaration {% id %}
  | MainExpression {% id %}
  | ForStatement {% id %}
  | QuantityModifier {% id %}
  | AssignStatement {% id %}
  | IfStatement {% id %}
  | Comment {% id %}

Comment -> "#" [^#]:* "#"  
  {% d => ({ 
    operation: "comment", 
    value: d[1]?.map(d => d.value).join(""),
    position: position(d)
  }) %}

UseStatement -> "use" __ ( Array {% id %} | "All" {% id %} ) __ "from" __ String 
  {% d => ({ 
    operation: "use_statement", 
    use: d[2].values !== undefined ? d[2].values.map(u => u.value) : "All", 
    source: d[6].value,
    position: position(d)
  }) %}

ProvideStatement -> "provide" __ MainExpression
  {% d => d[2] %}

EmbodyStatement -> "embody" __ Expression _ "{" (ArgumentList _ {% id %}):? "}"
  {% d => ({ 
    operation: "embody_statement", 
    name: d[2], 
    arguments: d[5]?.flat(Number.POSITIVE_INFINITY) || []
  }) %}

IfStatement -> "if" __ MainExpression _ FunctionCodeBlock
  {% d => ({ 
    operation: "if_statement", 
    condition: d[2], 
    body: d[4].body,
    provides: d[4].provides,
    position: position(d)
  }) %}

ForStatement -> "for" __ MainExpression __ "as" __ identifier _ CodeBlock
  {% d => ({ 
    operation: "for_statement", 
    statement: d[2], 
    placeholder: d[6].value, 
    body: d[8],
    position: position(d) 
  }) %}

QuantityModifier 
  -> VariableReference "+" "+" 
    {% d => ({ operation: "quantity_modifier", type: "increment", statement: d[0] }) %}
  | VariableReference "-" "-"
    {% d => ({ operation: "quantity_modifier", type: "decrement", statement: d[0] }) %}

AssignStatement
  -> VariableReference _ ":" "+" _ MainExpression 
  {% d => ({ operation: "assign_statement", type: "increment", statement: d[0], value: d[5] }) %}
  | VariableReference _ ":" "-" _ MainExpression 
  {% d => ({ operation: "assign_statement", type: "decrement", statement: d[0], value: d[5] }) %}
  | VariableReference _ ":" "*" _ MainExpression 
  {% d => ({ operation: "assign_statement", type: "multiply", statement: d[0], value: d[5] }) %}
  | VariableReference _ ":" "/" _ MainExpression 
  {% d => ({ operation: "assign_statement", type: "divide", statement: d[0], value: d[5] }) %}
  | VariableReference _ ":" _ MainExpression 
  {% d => ({ operation: "assign_statement", type: "redeclare", statement: d[0], value: d[4] }) %}

VariableDeclaration -> variable_type ":" identifier __ MainExpression
  {% d => ({ 
    operation: "variable_definition", 
    sort: d[0],
    name: d[2].value, 
    value: d[4],
  }) %}

IndexGetter -> MainExpression "<" MainExpression ">"
  {% d => ({ operation: "index_statement", source: d[0], index: d[2] }) %}

Expression
  -> Primitive {% id %}
  | FunctionCall {% id %}
  | VariableReference {% id %}
  | IndexGetter {%id %}
  | EmbodyStatement {% id %}

VariableReference -> identifier 
  {% d => ({ 
    operation: "reference", 
    value: d[0].value,
    position: { line: d[0].line, col: d[0].col }
  }) %}

FunctionCall 
  -> Expression _ "(" (ArgumentList _ {% id %}):? ")"
    {% d => ({ 
      operation: "function_call", 
      name: d[0], 
      arguments: d[3]?.flat(Number.POSITIVE_INFINITY) || []
    }) %}
  | "&" Expression
    {% d => ({ 
      operation: "function_call", 
      name: d[1], 
      arguments: [],
    }) %}

MainExpression 
  -> MainExpression _ "+" _ MultDiv {% d => arithmetic("addition", d) %}
  | MainExpression _ "-" _ MultDiv {% d => arithmetic("subtraction", d) %}
  | MultDiv {% id %}

MultDiv 
  -> MultDiv _ "*" _ Exp {% d => arithmetic("multiplication", d) %}
  | MultDiv _ "/" _ Exp {% d => arithmetic("division", d) %}
  | Exp {% id %}

Exp 
  -> Expression _ "^" _ Exp {% d => arithmetic("exponent", d) %}
  | Expression {% id %}

ArgumentList 
  -> MainExpression _ "," _ ArgumentList {% d => [d[0], d[4]] %}
  | MainExpression {% d => [d[0]] %}

KeyedArgumentList
  -> String _ ":" _ MainExpression _ "," _ KeyedArgumentList {% d => [{ key: d[0], value: d[4] }, d[8]] %}
  | String _ ":" _ MainExpression {% d => [{ key: d[0], value: d[4] }] %}

ParameterList 
  -> variable_type __ identifier "?":? _ "," _ ParameterList {% d => [
    { sort: d[0], value: d[2].value, isOptional: d[3] !== null }, 
    d[7]
  ] %}
  | variable_type __ identifier "?":? {% d => [
    { sort: d[0], value: d[2].value, isOptional: d[3] !== null }
  ] %}

Primitive 
  -> Number {% id %} 
  | String {% id %}
  | Record {% id %}
  | Array {% id %}
  | Function {% id %}
  | Boolean {% id %}
  | Ark {% id %}

CodeBlock -> "{" _ (Main _ {% id %}):* "}" {% d => d[2] || [] %}
FunctionCodeBlock -> "{" _ (Main _ {% id %}):* (ProvideStatement _ {% id %}):? "}" 
  {% d => ({ body: d[2] || [], provides: d[3] }) %}

Ark -> "Ark" "{" Program "}"
  {% d => primitive("Ark", { ...d[2] }) %}

Array -> "[" (ArgumentList _ {% id %}):? "]" 
  {% d => primitive("Array", { 
    values: d[1]?.flat(Number.POSITIVE_INFINITY) || [],
    position: { line: d[0].line, col: d[0].col }
  }) %}

Record -> "{" _ (KeyedArgumentList _ {% id %}):? "}" 
  {% d => primitive("Record", { 
    values: d[2]?.flat(Number.POSITIVE_INFINITY) || [],
    position: { line: d[0].line, col: d[0].col }
  }) %}

Function -> "(" (ParameterList _ {% id %}):? ")" _ FunctionCodeBlock
  {% d => primitive("Function", { 
    parameters: d[1]?.flat(Number.POSITIVE_INFINITY) || [],
    body: d[4].body,
    provides: d[4].provides,
    position: { line: d[0].line, col: d[0].col }
  }) %}

Boolean 
  -> "true" {% d => primitive("Boolean", { value: "true" }) %}
  | "false" {% d => primitive("Boolean", { value: "false" }) %}

Number -> %NumberLiteral 
  {% d => primitive(d[0].value.includes(".") ? "Double" : "Int", { 
    value: d[0].value,
    position: { line: d[0].line, col: d[0].col } 
  })  %}

String -> %StringLiteral {% d => primitive("String", { 
  value: d[0].value,
  position: { line: d[0].line, col: d[0].col }
  }) %}

variable_type 
  -> %VariableType {% d => ({ type: d[0].value, position: position(d) }) %} 
  | "Function" "." variable_type {% d => ({ type: "Function", of: d[2], position: position(d) }) %}
  | "Record" "." variable_type {% d => ({ type: "Record", of: d[2], position: position(d) }) %}
  | "Array" "." variable_type {% d => ({ type: "Array", of: d[2], position: position(d) }) %}

identifier -> %Identifier {% id %}

_ -> [\s]:*     {% (d) =>  null %}
__ -> [\s]:+     {% (d) =>  null %}