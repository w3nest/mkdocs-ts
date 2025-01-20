import {
    Context,
    Label,
    NoContext,
    ContextTrait,
    ConsoleReporter,
    InMemoryReporter,
} from 'mkdocs-ts'

const DebugMode = true

export const inMemReporter = new InMemoryReporter()
const consoleReporter = new ConsoleReporter()
const reporters = [consoleReporter, inMemReporter]

export function createRootContext({
    threadName,
    labels,
}: {
    threadName: string
    labels: Label[]
}): ContextTrait {
    if (!DebugMode) {
        return new NoContext()
    }
    return new Context({
        threadName,
        reporters,
        labels,
        callstack: [],
    })
}
