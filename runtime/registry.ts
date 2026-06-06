import path from "path"

const registry: Record<string,string> = {
    counter: path.join(__dirname,"../test_functions/counter.ts"),
    sum : path.join(__dirname,"../test_functions/sum.ts")
}

export { registry }