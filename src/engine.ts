import { readFileSync, stat } from "fs";
import { Grammar, Parser } from "nearley";
import Language from "./grammar/grammar";
import Path from "path";
import chalk from "chalk";

import { Statement, IFragmentProgram, Misc, Expression, Primitive } from "./interface";

// import FilePort from "./file"

export default class Fragment {
  file: string;
  content: string;
  type: "system" | "file";
  parsedPath: Path.ParsedPath;
  parsedContent: IFragmentProgram;
  parser: Parser;
  dependencies: Fragment[];
  frame: Misc.Frame;
  constructor(public path: string, public isArk = false) {
    this.dependencies = [];
    this.frame = {};
    this.type = "file";

    this.parsedPath = Path.parse(path);
    this.file = this.parsedPath.base;
    this.content = readFileSync(path).toString();
    this.parser = new Parser(Grammar.fromCompiled(Language));

    try {
      this.parser.feed(this.content);
      this.parsedContent = this.parser.results[0];
    } catch (error) {
      let { line, col } = error.token;
      new FragmentError(
        this,
        Fragment.ErrorMessage.SyntaxError,
        error.message.split("\n")[4].split(". Instead")[0],
        { line, col }
      ).throw();
      process.exit();
    }
  }

  run(libraries: string[] = [], includeSystem: Boolean = true) {
    if (includeSystem) {
      let system = new Fragment(Path.join(process.cwd(), "src/fragment/system.fr"));

      system.type = "system";
      system.resolveProgram();
      this.frame = { ...this.frame, ...system.frame };
    }

    this.resolveProgram();
  }

  resolveProgram() {
    if (this.type === "system") {
      this.frame.JSPort = {
        sort: { type: "Record", of: { type: "Occult" } },
        values: Fragment.Port,
      };
    }
    this.frame.FilePort = {
      sort: { type: "Record", of: { type: "Occult" } },
      values: this.FilePort,
    };

    this.resolveDependencies();
    this.parsedContent.program.forEach((statement) => {
      this.resolveStatement(statement, this.frame);
    });
  }

  resolveDependencies() {
    this.parsedContent.uses.forEach((dependency) => {
      if (dependency.source === "system") {
        console.log("system import");
      } else {
        let instance = new Fragment(Path.join(this.parsedPath.dir, dependency.source));
        instance.run();
        this.dependencies.push(instance);
        let subframe: Misc.Frame = {};

        if (dependency.use === "All") {
          subframe = instance.frame;
        } else {
          dependency.use.forEach((use) => {
            let value = instance.frame[use];
            if (value) {
              subframe[use] = value;
            } else {
              new FragmentError(
                this,
                Fragment.ErrorMessage.UndeclaredVariable,
                `Use statement is trying to use a variable that is not provided. Variable '${use}' is not usable`,
                dependency.position
              ).throw();
              process.exit();
            }
          });
        }
        this.frame = { ...this.frame, ...subframe };
      }
    });
  }

  resolveStatement(statement: Statement.All, frame: Misc.Frame): Primitive.AllRepresentation {
    let exporessions = ["arithmetic", "function_call", "index_statement", "primitive", "reference"];
    if (exporessions.includes(statement.operation)) {
      return this.resolveExpression(statement as Expression.All, frame);
    } else {
      switch (statement.operation) {
        case "comment":
          return Fragment.GeneratePrimitive("Occult", 0);
        case "variable_definition":
          // TODO: Check duplicate keys for records
          var value = this.resolveExpression(statement.value, frame);
          if (
            value.sort.type === "Function" ||
            value.sort.type === "Array" ||
            value.sort.type === "Record"
          ) {
            // @ts-ignore
            value.sort = statement.sort;
          }
          if (Fragment.CompareTypes(value, statement.sort)) {
            frame[statement.name] = value;
            return Fragment.GeneratePrimitive("Occult", 0);
          } else {
            new FragmentError(
              this,
              Fragment.ErrorMessage.TypeMiscmatch,
              `Given value cannot be assignable to '${Fragment.ResolveSort(statement.sort)}'`,
              statement.sort.position as Misc.Position
            ).throw();
            process.exit();
          }
        case "quantity_modifier":
          var value = this.resolveExpression(statement.statement, frame);
          if (value.sort.type === "Int" || value.sort.type === "Double") {
            switch (statement.type) {
              case "increment":
                ((value as unknown) as Primitive.FragmentIntRepresentation).value += 1;
                break;
              case "decrement":
                ((value as unknown) as Primitive.FragmentIntRepresentation).value -= 1;
                break;
            }
          } else {
            new FragmentError(
              this,
              Fragment.ErrorMessage.TypeMiscmatch,
              `Type '${value.sort.type}' cannot be incremented`,
              statement.statement.position as Misc.Position
            ).throw();
            process.exit();
          }
          return Fragment.GeneratePrimitive("Int", 0);
        case "assign_statement":
          var value = this.resolveExpression(statement.statement, frame);
          var assignmet = this.resolveExpression(statement.value, frame);
          if (
            (value.sort.type === "Int" && assignmet.sort.type === "Int") ||
            (value.sort.type === "Double" && assignmet.sort.type === "Double")
          ) {
            let v = ((assignmet as unknown) as Primitive.FragmentIntRepresentation).value;
            let s = ((value as unknown) as Primitive.FragmentIntRepresentation).value;
            let condition = (operation: "+" | "-" | "*" | "/") => {
              switch (operation) {
                case "+":
                  return value.sort.type === "Int" ? (s + v) % 1 === 0 : (s + v) % 1 !== 0;
                case "-":
                  return value.sort.type === "Int" ? (s - v) % 1 === 0 : (s - v) % 1 !== 0;
                case "*":
                  return value.sort.type === "Int" ? (s * v) % 1 === 0 : (s * v) % 1 !== 0;
                case "/":
                  return value.sort.type === "Int" ? (s / v) % 1 === 0 : (s / v) % 1 !== 0;
              }
            };

            let exit = () => {
              new FragmentError(
                this,
                Fragment.ErrorMessage.TypeMiscmatch,
                `Type '${value.sort.type}' cannot be reassigned with type '${
                  value.sort.type === "Double" ? "Int" : "Double"
                }'`,
                statement.statement.position as Misc.Position
              ).throw();
              process.exit();
            };

            switch (statement.type) {
              case "increment":
                if (condition("+")) {
                  ((value as unknown) as Primitive.FragmentIntRepresentation).value += v;
                } else {
                  exit();
                }
                break;
              case "decrement":
                if (condition("-")) {
                  ((value as unknown) as Primitive.FragmentIntRepresentation).value -= v;
                } else {
                  exit();
                }
                break;
              case "multiply":
                if (condition("*")) {
                  ((value as unknown) as Primitive.FragmentIntRepresentation).value *= v;
                } else {
                  exit();
                }
                break;
              case "divide":
                if (condition("/")) {
                  ((value as unknown) as Primitive.FragmentIntRepresentation).value /= v;
                } else {
                  exit();
                }
            }
          } else {
            new FragmentError(
              this,
              Fragment.ErrorMessage.TypeMiscmatch,
              `Type '${value.sort.type}' cannot be reassigned with type '${assignmet.sort.type}'`,
              statement.statement.position as Misc.Position
            ).throw();
            process.exit();
          }
          return Fragment.GeneratePrimitive("Int", 0);
        case "if_statement":
          let condition = this.resolveExpression(statement.condition, frame);

          if (condition.sort.type === "Boolean") {
            statement.body.forEach((statement) => {
              this.resolveStatement(statement, frame);
            });
          } else {
            new FragmentError(
              this,
              Fragment.ErrorMessage.TypeMiscmatch,
              `Cannot perform if statement with a type '${condition.sort.type}'`,
              statement.condition.position
            ).throw();
            process.exit();
          }
          return Fragment.GeneratePrimitive("Int", 0);
        default:
          new FragmentError(
            this,
            Fragment.ErrorMessage.UnknownStatement,
            `Statement '${statement.operation}' is not known`,
            { line: 1, col: 1 }
          ).throw();
          process.exit();
      }
    }
  }

  resolveExpression(expression: Expression.All, frame: Misc.Frame): Primitive.AllRepresentation {
    switch (expression.operation) {
      case "reference":
        if (frame[expression.value]) {
          return frame[expression.value];
        } else {
          new FragmentError(
            this,
            Fragment.ErrorMessage.UndeclaredVariable,
            `Variable '${expression.value}' is not declared`,
            expression.position
          ).throw();
          process.exit();
        }
      case "primitive":
        return this.resolvePrimitive(expression, frame);
      case "index_statement":
        let source = this.resolveExpression(expression.source, frame);

        if (source.sort.type === "Record") {
          let s = source as Primitive.FragmentRecordRepresentation;
          let index = this.resolveExpression(expression.index, frame);

          if (index.sort.type === "String") {
            let value = s.values.find(
              (value) =>
                (value.key as Primitive.FragmentStringRepresentation).value ===
                (index as Primitive.FragmentStringRepresentation).value
            )?.value;
            if (value) {
              return value;
            } else {
              new FragmentError(
                this,
                Fragment.ErrorMessage.UndeclaredElement,
                `The element ${
                  (index as Primitive.FragmentStringRepresentation).value
                } is absent in record ${(expression.source as Primitive.FragmentString).value}`,
                expression.index.position
              ).throw();
              process.exit();
            }
          } else {
            new FragmentError(
              this,
              Fragment.ErrorMessage.UnindexableType,
              `Type of 'Record' cannot be indexed with type '${index.sort.type}'`,
              expression.index.position
            ).throw();
            process.exit();
          }
        } else if (source.sort.type === "Array") {
          let s = source as Primitive.FragmentArrayRepresentation;
          let index = (this.resolveExpression(
            expression.index,
            frame
          ) as unknown) as Primitive.FragmentIntRepresentation;

          if (index.sort.type === "Int") {
            let value = s.values[index.value];
            if (value) {
              return value;
            } else {
              new FragmentError(
                this,
                Fragment.ErrorMessage.UndeclaredElement,
                `The given index is out of bounds`,
                expression.index.position
              ).throw();
              process.exit();
            }
          } else {
            new FragmentError(
              this,
              Fragment.ErrorMessage.UnindexableType,
              `Type of 'Array' cannot be indexed with type '${index.sort.type}'`,
              expression.index.position
            ).throw();
            process.exit();
          }
        } else if (source.sort.type === "String") {
          let s = source as Primitive.FragmentStringRepresentation;
          let index = (this.resolveExpression(
            expression.index,
            frame
          ) as unknown) as Primitive.FragmentIntRepresentation;

          if (index.sort.type === "Int") {
            let value = s.value[index.value];
            if (value) {
              return Fragment.GeneratePrimitive("String", value);
            } else {
              new FragmentError(
                this,
                Fragment.ErrorMessage.UndeclaredElement,
                `The given index is out of bounds`,
                expression.index.position
              ).throw();
              process.exit();
            }
          } else {
            new FragmentError(
              this,
              Fragment.ErrorMessage.UnindexableType,
              `Type of 'String' cannot be indexed with type '${index.sort.type}'`,
              expression.index.position
            ).throw();
            process.exit();
          }
        } else {
          new FragmentError(
            this,
            Fragment.ErrorMessage.UnindexableType,
            `Type of '${Fragment.ResolveSort(source.sort)}' cannot be indexed`,
            expression.index.position
          ).throw();
          process.exit();
        }
      case "arithmetic":
        let left = this.resolveExpression(expression.left, frame);
        let right = this.resolveExpression(expression.right, frame);

        if (
          (left.sort.type === "Int" && right.sort.type === "Int") ||
          (left.sort.type === "Double" && right.sort.type === "Double")
        ) {
          let l = (left as unknown) as Primitive.FragmentIntRepresentation;
          let r = (right as unknown) as Primitive.FragmentIntRepresentation;
          switch (expression.type) {
            case "addition":
              return Fragment.GeneratePrimitive(left.sort.type, l.value + r.value);
            case "subtraction":
              return Fragment.GeneratePrimitive(left.sort.type, l.value - r.value);
            case "multiplication":
              return Fragment.GeneratePrimitive(left.sort.type, l.value * r.value);
            case "division":
              return Fragment.GeneratePrimitive(left.sort.type, l.value / r.value);
            case "exponent":
              return Fragment.GeneratePrimitive(left.sort.type, Math.pow(l.value, r.value));
          }
        } else if (left.sort.type === "String" && right.sort.type === "String") {
          let l = left as Primitive.FragmentStringRepresentation;
          let r = right as Primitive.FragmentStringRepresentation;
          if (expression.type === "addition") {
            return Fragment.GeneratePrimitive("String", l.value + r.value);
          } else {
            new FragmentError(
              this,
              Fragment.ErrorMessage.UnperformableArithmetic,
              `Arithmetic ${expression.type} between ${left.sort.type} and ${right.sort.type} is inoperable`,
              expression.left.position
            ).throw();
            process.exit();
          }
        } else {
          new FragmentError(
            this,
            Fragment.ErrorMessage.UnperformableArithmetic,
            `Arithmetic ${expression.type} between ${left.sort.type} and ${right.sort.type} is inoperable`,
            expression.left.position
          ).throw();
          process.exit();
        }
      case "function_call":
        let name = this.resolveExpression(expression.name, frame);
        if (name.sort.type === "Function") {
          let name = this.resolveExpression(
            expression.name,
            frame
          ) as Primitive.FragmentFunctionRepresentation;

          let args = expression.arguments.map((arg) => this.resolveExpression(arg, frame));
          if ((name as Primitive.NativeFunctionRepresentation).native) {
            return (name as Primitive.NativeFunctionRepresentation).cb(...args);
          } else {
            let subframe = { ...frame };
            name.parameters.forEach((param, i) => {
              if (args[i] !== undefined) {
                if (Fragment.DiffTypes(args[i].sort, param.sort) || param.sort.type === "Occult") {
                  subframe = { ...subframe, [param.value]: args[i] };
                } else {
                  new FragmentError(
                    this,
                    Fragment.ErrorMessage.TypeMiscmatch,
                    `Type '${args[i].sort.type}' is not valid for type '${param.sort.type}' in function argument for '${param.value}'`,
                    expression.arguments[i].position
                  ).throw();
                  process.exit();
                }
              } else {
                if (param.isOptional === false) {
                  new FragmentError(
                    this,
                    Fragment.ErrorMessage.AnticipatedArgument,
                    `Function you are trying to invoke needs an argument for '${param.value}'`,
                    expression.name.position
                  ).throw();
                  process.exit();
                }
              }
            });

            name.body.forEach((statement) => {
              this.resolveStatement(statement, subframe);
            });

            if (name.sort.of?.type === "Occult") {
              return Fragment.GeneratePrimitive("Occult", 0);
            } else {
              if (name.provides) {
                let provide = this.resolveExpression(name.provides, subframe);
                if (provide) {
                  if (Fragment.CompareTypes(provide, name.sort.of as Misc.Sort<Misc.Type>)) {
                    return provide;
                  } else {
                    new FragmentError(
                      this,
                      Fragment.ErrorMessage.TypeMiscmatch,
                      `A function of '${name.sort.of?.type}' cannot provide type '${provide.sort.type}'`,
                      name.provides.position
                    ).throw();
                    process.exit();
                  }
                } else {
                  return Fragment.GeneratePrimitive("Occult", 0);
                }
              } else {
                new FragmentError(
                  this,
                  Fragment.ErrorMessage.TypeMiscmatch,
                  `A function of '${name.sort.of?.type}' should provide a type`,
                  expression.name.position
                ).throw();
                process.exit();
              }
            }
          }
        } else {
          new FragmentError(
            this,
            Fragment.ErrorMessage.UncallableReference,
            `The type ${name.sort.type} is not a function I can invoke`,
            expression.name.position
          ).throw();
          process.exit();
        }
    }
  }

  resolvePrimitive(primitive: Primitive.All, frame: Misc.Frame): Primitive.AllRepresentation {
    switch (primitive.type) {
      case "String":
        return { sort: { type: "String" }, value: primitive.value };
      case "Int":
        return { sort: { type: "Int" }, value: parseInt(primitive.value) };
      case "Double":
        return { sort: { type: "Double" }, value: parseFloat(primitive.value) };
      case "Boolean":
        return { sort: { type: "Boolean" }, value: primitive.value === "true" };
      case "Array":
        return {
          sort: { type: "Array" },
          values: (primitive as Primitive.FragmentArray).values.map((m) =>
            this.resolveExpression(m, frame)
          ),
        };
      case "Record":
        return {
          sort: { type: "Record" },
          values: (primitive as Primitive.FragmentRecord).values.map((e) => ({
            key: this.resolveExpression(e.key, frame),
            value: this.resolveExpression(e.value, frame),
          })),
        };
      case "Function":
        return {
          sort: { type: "Function" },
          body: primitive.body,
          parameters: primitive.parameters,
          provides: primitive.provides,
        } as Primitive.FragmentFunctionRepresentation;
      default:
        new FragmentError(
          this,
          Fragment.ErrorMessage.UnknownType,
          `Type '${primitive.type}' is not known`,
          primitive.position
        ).throw();
        process.exit();
    }
  }

  static DiffTypes(sort1: Misc.Sort<Misc.Type>, sort2: Misc.Sort<Misc.Type> | undefined): Boolean {
    if (["String", "Boolean", "Int", "Double", "Occult"].includes(sort1.type)) {
      if (
        (sort1.type === "Occult" && sort2?.type !== "Occult") ||
        (sort2?.type === "Occult" && sort1.type !== "Occult")
      ) {
        return true;
      }
      return sort1.type === sort2?.type;
    } else {
      if (sort1.of && sort2?.of) {
        if (sort1.type === sort2?.type) {
          return Fragment.DiffTypes(sort1.of, sort2.of);
        } else {
          return false;
        }
      } else {
        if (
          (sort1.of?.type === "Occult" && sort2?.of?.type !== "Occult") ||
          (sort2?.of?.type === "Occult" && sort1.of?.type !== "Occult")
        ) {
          return true;
        }
        return false;
      }
    }
  }

  static CompareTypes(primitive: Primitive.AllRepresentation, sort: Misc.Sort<Misc.Type>): Boolean {
    switch (primitive.sort.type) {
      case "Int":
        return Fragment.DiffTypes(primitive.sort, sort);
      case "Double":
        return Fragment.DiffTypes(primitive.sort, sort);
      case "String":
        return Fragment.DiffTypes(primitive.sort, sort);
      case "Boolean":
        return Fragment.DiffTypes(primitive.sort, sort);
      case "Array":
        if (sort.type === "Occult") {
          return true;
        } else {
          if (sort.of !== undefined) {
            let values = (primitive as Primitive.FragmentArrayRepresentation).values;
            let valid = true;
            values.forEach((value) => {
              if (Fragment.CompareTypes(value, sort.of as Misc.Sort<Misc.Type>) === false)
                valid = false;
            });
            return valid;
          } else {
            return false;
          }
        }
      case "Record":
        if (sort.type === "Occult") {
          return true;
        } else {
          if (sort.of !== undefined) {
            let values = (primitive as Primitive.FragmentRecordRepresentation).values;
            let valid = true;
            values.forEach((item) => {
              if (Fragment.CompareTypes(item.value, sort.of as Misc.Sort<Misc.Type>) === false)
                valid = false;
            });
            return valid;
          } else {
            return false;
          }
        }
      case "Function":
        return Fragment.DiffTypes(primitive.sort, sort);
      // TODO
      default:
        return true;
    }
  }

  static GeneratePrimitive(type: Misc.Type, value: any): Primitive.AllRepresentation {
    return { sort: { type }, value };
  }

  static ErrorMessage = {
    UnknownType: "Unknown type is found while resolving the primitive",
    UnknownStatement: "Unknown statement is found while resolving the statement",
    UndeclaredVariable: "Undeclared variable is found while resolving an expression",
    UnindexableType: "Cannot index this construct with given type",
    UndeclaredElement: "Undeclared element is found while resolving an expression",
    UnperformableArithmetic: "Cannot perform arithmetic between these types",
    UncallableReference: "Referenced variable is uncallable",
    TypeMiscmatch: "There is a type mismatch in given program",
    DuplicateElement: "There is duplicate of an element in given program",
    AnticipatedArgument: "A function anticipated an argument",
    SyntaxError: "There is a syntax error in give program",
  };

  static SerializePrimitive(primitive: Primitive.AllRepresentation): string {
    switch (primitive.sort.type) {
      case "Int":
        return chalk
          .hex("#1793ff")
          .bold(((primitive as unknown) as Primitive.FragmentIntRepresentation).value.toString());
      case "Double":
        return chalk
          .hex("#1793ff")
          .bold((primitive as Primitive.FragmentDoubleRepresentation).value.toString());
      case "String":
        return `${chalk
          .hex("#b200ed")
          .bold((primitive as Primitive.FragmentStringRepresentation).value)}`;
      case "Boolean":
        return chalk
          .hex("#0c9400")
          .bold((primitive as Primitive.FragmentBooleanRepresentation).value.toString());
      case "Array":
        return `[${(primitive as Primitive.FragmentArrayRepresentation).values
          .map((v) => Fragment.SerializePrimitive(v))
          .join(", ")}]`;
      case "Record":
        return `{ ${(primitive as Primitive.FragmentRecordRepresentation).values
          .map(
            (v) => `${Fragment.SerializePrimitive(v.key)} : ${Fragment.SerializePrimitive(v.value)}`
          )
          .join(", ")} }`;
      case "Function":
        let params = (primitive as Primitive.FragmentFunctionRepresentation).parameters;
        return `${chalk.hex("#b200ed").bold("Function")} (${params
          .map((param) => `${Fragment.ResolveSort(param.sort)} ${param.value}`)
          .join(", ")}) { ... }`;
      case "Occult":
        return chalk.hex("#1793ff").bold("Occult");
      default:
        return "";
    }
  }

  static ResolveSort(sort?: Misc.Sort<Misc.Type>): string {
    if (sort?.of) {
      return `${chalk.hex("#1793ff").bold(sort.type)}.${Fragment.ResolveSort(sort.of)}`;
    } else {
      return chalk.hex("#1793ff").bold(sort?.type);
    }
  }

  static Port = [
    // Print Function
    {
      key: Fragment.GeneratePrimitive("String", "Print"),
      value: ({
        body: [],
        parameters: [],
        provides: {},
        native: true,
        sort: { type: "Function", of: { type: "Occult" } },
        cb(...input: Primitive.AllRepresentation[]) {
          let message: string[] = [];
          input.forEach((msg) => {
            message.push(Fragment.SerializePrimitive(msg));
          });
          console.log(message.join(" "));
        },
      } as unknown) as Primitive.NativeFunctionRepresentation,
    },
    // Less Than Function
    {
      key: Fragment.GeneratePrimitive("String", "Lt"),
      value: ({
        body: [],
        parameters: [],
        provides: {},
        native: true,
        sort: { type: "Function", of: { type: "Boolean" } },
        cb(n1: Primitive.FragmentNumberRepresentation, n2: Primitive.FragmentNumberRepresentation) {
          return n1.value < n2.value
            ? Fragment.GeneratePrimitive("Boolean", true)
            : Fragment.GeneratePrimitive("Boolean", false);
        },
      } as unknown) as Primitive.NativeFunctionRepresentation,
    },
    // Less Than or Equals Function
    {
      key: Fragment.GeneratePrimitive("String", "Lte"),
      value: ({
        body: [],
        parameters: [],
        provides: {},
        native: true,
        sort: { type: "Function", of: { type: "Boolean" } },
        cb(n1: Primitive.FragmentNumberRepresentation, n2: Primitive.FragmentNumberRepresentation) {
          return n1.value <= n2.value
            ? Fragment.GeneratePrimitive("Boolean", true)
            : Fragment.GeneratePrimitive("Boolean", false);
        },
      } as unknown) as Primitive.NativeFunctionRepresentation,
    },
    // Greater Than Function
    {
      key: Fragment.GeneratePrimitive("String", "Gt"),
      value: ({
        body: [],
        parameters: [],
        provides: {},
        native: true,
        sort: { type: "Function", of: { type: "Boolean" } },
        cb(n1: Primitive.FragmentNumberRepresentation, n2: Primitive.FragmentNumberRepresentation) {
          return n1.value > n2.value
            ? Fragment.GeneratePrimitive("Boolean", true)
            : Fragment.GeneratePrimitive("Boolean", false);
        },
      } as unknown) as Primitive.NativeFunctionRepresentation,
    },
    // Greater Than or Equals Function
    {
      key: Fragment.GeneratePrimitive("String", "Gte"),
      value: ({
        body: [],
        parameters: [],
        provides: {},
        native: true,
        sort: { type: "Function", of: { type: "Boolean" } },
        cb(n1: Primitive.FragmentNumberRepresentation, n2: Primitive.FragmentNumberRepresentation) {
          return n1.value >= n2.value
            ? Fragment.GeneratePrimitive("Boolean", true)
            : Fragment.GeneratePrimitive("Boolean", false);
        },
      } as unknown) as Primitive.NativeFunctionRepresentation,
    },
    // Equals to Function
    {
      key: Fragment.GeneratePrimitive("String", "Equals"),
      value: ({
        body: [],
        parameters: [],
        provides: {},
        native: true,
        sort: { type: "Function", of: { type: "Boolean" } },
        cb(n1: Primitive.FragmentNumberRepresentation, n2: Primitive.FragmentNumberRepresentation) {
          return n1.value === n2.value
            ? Fragment.GeneratePrimitive("Boolean", true)
            : Fragment.GeneratePrimitive("Boolean", false);
        },
      } as unknown) as Primitive.NativeFunctionRepresentation,
    },
    // Length Function
    {
      key: Fragment.GeneratePrimitive("String", "Length"),
      value: ({
        body: [],
        parameters: [],
        provides: {},
        native: true,
        sort: { type: "Function", of: { type: "Int" } },
        cb(array: Primitive.FragmentArrayRepresentation) {
          return Fragment.GeneratePrimitive("Int", array.values.length);
        },
      } as unknown) as Primitive.NativeFunctionRepresentation,
    },
    // Type Function
    {
      key: Fragment.GeneratePrimitive("String", "Type"),
      value: ({
        body: [],
        parameters: [],
        provides: {},
        native: true,
        sort: { type: "Function", of: { type: "String" } },
        cb(value: Primitive.AllRepresentation) {
          return Fragment.GeneratePrimitive("String", Fragment.ResolveSort(value.sort));
        },
      } as unknown) as Primitive.NativeFunctionRepresentation,
    },
  ];

  FilePort = [
    {
      key: Fragment.GeneratePrimitive("String", "ReadFile"),
      value: ({
        body: [],
        parameters: [],
        provides: {},
        native: true,
        sort: { type: "Function", of: { type: "Occult" } },
        cb: (path: Primitive.FragmentStringRepresentation) => {
          let file = readFileSync(Path.join(this.parsedPath.dir, path.value)).toString();
          return Fragment.GeneratePrimitive("String", file);
        },
      } as unknown) as Primitive.NativeFunctionRepresentation,
    },
  ];
}

class FragmentError {
  constructor(
    public instance: Fragment,
    public message: string,
    public punchline: string,
    public position: Misc.Position
  ) {}

  throw() {
    console.log(this.punchline);
    let line = this.instance.content.split("\n")[this.position.line - 1];
    let t = (line.match(/\t/g) || []).length;
    let spaces = Array(this.position.col - (t > 0 ? t + 1 : 0)).join(" ");
    let tabs = Array(t * 8).join(" ");
    console.log(
      `${chalk.hex("#ff6161").bold("Captured Error:")} ${chalk
        .hex("#bababa")
        .bold(this.message)}.\n\n${this.punchline}\n${chalk.hex("#888888").bold(line)}\n${
        tabs + spaces + "^"
      }\n\n${
        chalk.hex("#888888").bold("Error arose in ") +
        chalk
          .hex("#1793ff")
          .bold(`${this.instance.file} ${this.position.line}:${this.position.col}`)
      }`
    );
  }
}
