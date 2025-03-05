import {
    Context,
    Label,
    NoContext,
    ContextTrait,
    ConsoleReporter,
    InMemoryReporter,
} from 'mkdocs-ts'
import { DebugMode } from './config.debug'

Context.Enabled = DebugMode
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
    //eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
