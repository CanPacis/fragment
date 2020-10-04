import Fragment from "./engine";
import Path from "path";

let system = new Fragment(Path.join(process.cwd(), "src/fragment/system.fr"));
let instance = new Fragment(Path.join(process.cwd(), "src/fragment/main.fr"));

system.type = "system";
system.resolveProgram();
// delete system.frame.JSPort

instance.frame = { ...instance.frame, ...system.frame }
instance.resolveProgram()