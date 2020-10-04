import Fragment from "./engine";
import Path from "path";

let instance = new Fragment(Path.join(process.cwd(), "src/fragment/main.fr"));
// console.log(instance.parsedContent.program[0])

instance.parsedContent.program.forEach((statement) => {
  instance.resolveStatement(statement, instance.frame);
});

console.log(instance.frame);
